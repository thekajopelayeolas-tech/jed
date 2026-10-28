import { BLOCK } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from './constants.js';
import { fbm2D, valueNoise2D } from './noise.js';
import { BIOME, BIOME_DEFS, biomeAt } from './biomes.js';
import { woodSet } from './wood.js';
import { LIGHT } from './lighting.js';
import { REGION, villageCentre, houseCells, pathCells, farmCells, penCells, HOUSES, LEVEL_BOX } from './village.js';

// Caves: a 3D noise field. Cells where it is near its peak become air, so tunnels wind through the rock.
// Two octaves give irregular cave shapes. Noise is sampled per cell using a flattened 2D lookup on (x+z, y).
export function isCave(wx, y, wz, seed) {
  const a = valueNoise2D(wx * 0.06 + y * 0.11, wz * 0.06 - y * 0.07, seed + 61);
  const b = valueNoise2D(wx * 0.13 - y * 0.05, wz * 0.13 + y * 0.09, seed + 67);
  return a > 0.7 && b > 0.55;
}

// Lava pools: a rare patch on the floor of a deep cave. A second noise field, sampled only at cave cells, picks
// the few places that are lava. The pool sits low, well below sea level, so it is only found underground.
const LAVA_DEPTH = SEA_LEVEL - 12;
export function isLavaPool(wx, y, wz, seed) {
  if (y > LAVA_DEPTH || y < 1) return false;
  // Rare: the field has to be near its top to count. Most cave cells stay empty.
  const field = valueNoise2D(wx * 0.04, wz * 0.04, seed + 731);
  return field > 0.9;
}

// Terrain height for one column. Terrain and villages both use this, so a village sits on the same ground.
export function surfaceHeight(seed, wx, wz) {
  const continent = fbm2D(wx * 0.01, wz * 0.01, seed, 3);
  const detail = fbm2D(wx * 0.05, wz * 0.05, seed + 99, 4);
  // Basins: low-lying regions sink below sea level, so the water above them forms lakes and oceans.
  const basin = valueNoise2D(wx * 0.008, wz * 0.008, seed + 113);
  const sink = basin < 0.5 ? (0.5 - basin) * 120 : 0;
  const height = Math.floor(SEA_LEVEL - 4 + continent * 28 + detail * 8 - sink);
  return Math.min(CHUNK_HEIGHT - 2, Math.max(4, height));
}

// How far a village's footprint reaches from its centre, so chunks know which regions to check.
const FLAT_REACH = 22;
// Radius around a village centre where trees are not planted. It covers the houses and the roads.
const VILLAGE_CLEAR = 22;

// How many blocks higher a village sits than the ground around it. The village is levelled up onto a raised
// platform, so its houses, farms, and pen stand clear of the terrain.
export const VILLAGE_LIFT = 6;

// The ground height a village levels to, or null if the centre is underwater (no village there).
function villageGroundY(seed, centre) {
  const y = surfaceHeight(seed, centre.x, centre.z);
  if (y <= SEA_LEVEL + 1) return null;
  // Keep the raised village inside the world's build height, with room for the houses above it.
  return Math.min(CHUNK_HEIGHT - 12, y + VILLAGE_LIFT);
}

// If a column lies inside a village's levelled area, returns the village's ground height. Otherwise null.
// Every chunk computes the same answer for a column, so the ground joins up across chunk borders.
function villageGround(seed, wx, wz) {
  for (let rx = Math.floor((wx - FLAT_REACH) / REGION); rx <= Math.floor((wx + FLAT_REACH) / REGION); rx++) {
    for (let rz = Math.floor((wz - FLAT_REACH) / REGION); rz <= Math.floor((wz + FLAT_REACH) / REGION); rz++) {
      const centre = villageCentre(rx, rz, seed);
      if (!centre) continue;
      const dx = wx - centre.x;
      const dz = wz - centre.z;
      if (dx < LEVEL_BOX.x0 || dx > LEVEL_BOX.x1 || dz < LEVEL_BOX.z0 || dz > LEVEL_BOX.z1) continue;
      return villageGroundY(seed, centre);
    }
  }
  return null;
}

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    // Which way each block faces (0..3, see facing.js). Kept beside the block ids, one byte per cell.
    this.facing = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.dirty = true;
    this.mesh = null;
    // True once a player edits this chunk, so it is saved instead of regenerated.
    this.modified = false;
    this.biomes = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.sky = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.blockLight = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
  }

  biomeAt(x, z) {
    return this.biomes[x + CHUNK_SIZE * z];
  }

  getLight(x, y, z, ch) {
    return (ch === LIGHT.SKY ? this.sky : this.blockLight)[Chunk.index(x, y, z)];
  }

  setLight(x, y, z, ch, level) {
    (ch === LIGHT.SKY ? this.sky : this.blockLight)[Chunk.index(x, y, z)] = level;
    this.dirty = true;
  }

  static index(x, y, z) {
    return x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
  }

  get(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return BLOCK.AIR;
    return this.blocks[Chunk.index(x, y, z)];
  }

  set(x, y, z, id, facing = 0) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.facing[Chunk.index(x, y, z)] = facing & 3;
    this.dirty = true;
  }

  getFacing(x, y, z) {
    return this.facing[Chunk.index(x, y, z)];
  }

  generate(seed) {
    const ox = this.cx * CHUNK_SIZE;
    const oz = this.cz * CHUNK_SIZE;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = ox + x;
        const wz = oz + z;
        // Inside a village, the ground is levelled to the village height so its houses sit flat.
        // The base ground is picked first, so the biome can depend on altitude. Mountain and highland biomes lift the
        // ground by their `lift`. Villages keep their levelled ground, so a village is never raised.
        const baseSurface = surfaceHeight(seed, wx, wz);
        const biome = biomeAt(wx, wz, seed, baseSurface);
        const def = BIOME_DEFS[biome];
        // A river cuts the ground down to just under sea level, so the water fills the channel. Swamps sink a little.
        // Mountains and highlands lift the ground. Villages keep their levelled ground, so they are never changed.
        let surface;
        const village = villageGround(seed, wx, wz);
        if (village !== null) {
          surface = village;
        } else if (def.channel) {
          surface = SEA_LEVEL - 2;
        } else {
          // `sink` and `lift` default to 0. A biome with no `sink` field would otherwise make this NaN, which left the
          // column empty above the sea.
          surface = Math.max(4, Math.min(CHUNK_HEIGHT - 2, baseSurface + (def.lift ?? 0) - (def.sink ?? 0)));
        }
        this.biomes[x + CHUNK_SIZE * z] = biome;
        // The surface block: sand in deserts and some low ground, gravel in gravelly windswept hills, stone on peaks,
        // and grass elsewhere.
        const surfaceKind = BIOME_DEFS[biome].surface;
        const sandy = surfaceKind === 'sand' || valueNoise2D(wx * 0.03, wz * 0.03, seed + 7) > 0.62;
        const stony = surfaceKind === 'stone' && surface > SEA_LEVEL + 8;
        const gravelly = surfaceKind === 'gravel';

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let id = BLOCK.AIR;
          if (y === 0) {
            id = BLOCK.BEDROCK;
          } else if (y < surface - 3) {
            id = this.stoneOrOre(wx, y, wz, seed);
          } else if (y < surface) {
            id = sandy ? BLOCK.SAND : BLOCK.DIRT;
          } else if (y === surface) {
            if (sandy || surface <= SEA_LEVEL - 1) id = BLOCK.SAND;
            else if (gravelly) id = BLOCK.COBBLESTONE;
            else if (stony) id = BLOCK.STONE;
            else id = BLOCK.GRASS;
          } else if (y <= SEA_LEVEL) {
            id = BLOCK.WATER;
          }
          // Caves carve through solid ground below the surface, leaving the bedrock floor alone.
          if (y > 0 && id !== BLOCK.AIR && id !== BLOCK.WATER && y < surface - 1 && isCave(wx, y, wz, seed)) {
            // A cave cell is air, except in a rare deep pool, where it is lava.
            id = isLavaPool(wx, y, wz, seed) ? BLOCK.LAVA : BLOCK.AIR;
          }
          if (id !== BLOCK.AIR) this.blocks[Chunk.index(x, y, z)] = id;
        }
      }
    }
    this.placeVillages(seed, ox, oz);
    this.placeTrees(seed, ox, oz);
    this.dirty = true;
  }

  // Writes the parts of any nearby village that fall inside this chunk. A village can cross chunk borders,
  // so each chunk checks the regions whose villages could reach it and only writes its own columns.
  placeVillages(seed, ox, oz) {
    const reach = FLAT_REACH;
    const r0 = Math.floor((ox - reach) / REGION);
    const r1 = Math.floor((ox + CHUNK_SIZE - 1 + reach) / REGION);
    const q0 = Math.floor((oz - reach) / REGION);
    const q1 = Math.floor((oz + CHUNK_SIZE - 1 + reach) / REGION);
    for (let rx = r0; rx <= r1; rx++) {
      for (let rz = q0; rz <= q1; rz++) {
        const centre = villageCentre(rx, rz, seed);
        if (!centre) continue;
        // The ground height of the village is decided once, at its centre, so every chunk builds it at the same height.
        const groundY = villageGroundY(seed, centre);
        if (groundY === null) continue;
        // Trees are kept out of the village footprint, so their leaves do not cover the houses.
        if (this.clearForVillage === undefined) this.clearForVillage = new Set();
        for (let dx = -VILLAGE_CLEAR; dx <= VILLAGE_CLEAR; dx++) {
          for (let dz = -VILLAGE_CLEAR; dz <= VILLAGE_CLEAR; dz++) {
            const cx2 = centre.x + dx - ox;
            const cz2 = centre.z + dz - oz;
            if (cx2 >= 0 && cx2 < CHUNK_SIZE && cz2 >= 0 && cz2 < CHUNK_SIZE) this.clearForVillage.add(cx2 + CHUNK_SIZE * cz2);
          }
        }
        // A village takes its planks from the biome at its centre, so the houses match the trees around them.
        // The village builds with the planks of its centre's biome, so the houses match the trees around them.
        // Every chunk reads the same centre, so they all agree.
        const planks = woodSet(BIOME_DEFS[biomeAt(centre.x, centre.z, seed, groundY)].wood).planks;
        const cells = [];
        for (const house of HOUSES) {
          for (const c of houseCells(house, groundY, planks)) cells.push({ ...c, x: centre.x + c.dx, y: c.dy, z: centre.z + c.dz });
        }
        for (const c of pathCells(groundY)) cells.push({ ...c, x: centre.x + c.dx, y: c.dy, z: centre.z + c.dz });
        for (const c of farmCells(groundY)) cells.push({ ...c, x: centre.x + c.dx, y: c.dy, z: centre.z + c.dz });
        for (const c of penCells(groundY)) cells.push({ ...c, x: centre.x + c.dx, y: c.dy, z: centre.z + c.dz });
        for (const c of cells) {
          const lx = c.x - ox;
          const lz = c.z - oz;
          if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue;
          if (c.y < 0 || c.y >= CHUNK_HEIGHT) continue;
          // Never overwrite bedrock, and only build into air or water.
          const current = this.get(lx, c.y, lz);
          if (current === BLOCK.BEDROCK) continue;
          this.set(lx, c.y, lz, c.id);
        }
      }
    }
  }

  // Picks stone or an ore for an underground cell. Each ore has its own noise field, so they do not overlap.
  // Coal is common near the top. Iron is more common than before. Diamond is uncommon and only deep.
  // Rainbow is rare and deepest.
  stoneOrOre(wx, y, wz, seed) {
    const coal = valueNoise2D(wx * 0.2, y * 0.2 + wz * 0.2, seed + 31);
    const iron = valueNoise2D(wx * 0.2, y * 0.2 + wz * 0.2, seed + 37);
    const diamond = valueNoise2D(wx * 0.25, y * 0.25 + wz * 0.25, seed + 41);
    const rainbow = valueNoise2D(wx * 0.3, y * 0.3 + wz * 0.3, seed + 43);
    if (y < 12 && coal > 0.78) return BLOCK.COAL_ORE;
    if (y < 16 && iron > 0.8) return BLOCK.IRON_ORE;
    if (y < 10 && diamond > 0.96) return BLOCK.DIAMOND_ORE;
    if (y < 6 && rainbow > 0.985) return BLOCK.RAINBOW_ORE;
    return BLOCK.STONE;
  }

  placeTrees(seed, ox, oz) {
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
        // No trees inside a village's clear area.
        if (this.clearForVillage?.has(x + CHUNK_SIZE * z)) continue;
        const wx = ox + x;
        const wz = oz + z;
        const density = BIOME_DEFS[this.biomeAt(x, z)].treeDensity;
        if (density <= 0) continue;
        if (valueNoise2D(wx * 0.9, wz * 0.9, seed + 555) < 1 - 0.18 * density) continue;
        let top = -1;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          if (this.get(x, y, z) !== BLOCK.AIR) { top = y; break; }
        }
        if (top < 0 || this.get(x, top, z) !== BLOCK.GRASS) continue;
        // The trunk is 4 to 5 blocks in most biomes. A biome's `trunk` adds height: birch and taiga trees grow taller,
        // and the old growth ones taller still. The base is the same oak tree everywhere, since only oak exists.
        const def = BIOME_DEFS[this.biomeAt(x, z)];
        const extra = def.trunk ?? 0;
        const trunk = 4 + Math.floor(valueNoise2D(wx, wz, seed + 3) * 2) + extra;
        // The tree's wood and leaves come from its biome's kind: birch, dark oak, spruce or jungle, or oak by default.
        const set = woodSet(def.wood);
        const woodId = set.wood;
        const leafId = set.leaves;
        for (let i = 1; i <= trunk; i++) this.set(x, top + i, z, woodId);
        const leafBase = top + trunk - 1;
        for (let dy = 0; dy <= 2; dy++) {
          const r = dy === 2 ? 1 : 2;
          for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
              if (dx === 0 && dz === 0 && dy < 2) continue;
              if (Math.abs(dx) === r && Math.abs(dz) === r && dy === 0) continue;
              if (this.get(x + dx, leafBase + dy, z + dz) === BLOCK.AIR) {
                this.set(x + dx, leafBase + dy, z + dz, leafId);
              }
            }
          }
        }
        this.set(x, leafBase + 3, z, leafId);
      }
    }
  }
}
