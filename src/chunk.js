import { BLOCK } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from './constants.js';
import { fbm2D, valueNoise2D } from './noise.js';
import { BIOME, BIOME_DEFS, biomeAt } from './biomes.js';
import { LIGHT } from './lighting.js';

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
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

  set(x, y, z, id) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }

  generate(seed) {
    const ox = this.cx * CHUNK_SIZE;
    const oz = this.cz * CHUNK_SIZE;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = ox + x;
        const wz = oz + z;
        const continent = fbm2D(wx * 0.01, wz * 0.01, seed, 3);
        const detail = fbm2D(wx * 0.05, wz * 0.05, seed + 99, 4);
        const height = Math.floor(SEA_LEVEL - 4 + continent * 28 + detail * 8);
        const surface = Math.min(CHUNK_HEIGHT - 2, Math.max(4, height));
        const biome = biomeAt(wx, wz, seed);
        this.biomes[x + CHUNK_SIZE * z] = biome;
        const sandy = biome === BIOME.DESERT || valueNoise2D(wx * 0.03, wz * 0.03, seed + 7) > 0.62;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let id = BLOCK.AIR;
          if (y === 0) {
            id = BLOCK.BEDROCK;
          } else if (y < surface - 3) {
            const r = valueNoise2D(wx * 0.2, y * 0.2 + wz * 0.2, seed + 31);
            if (y < 12 && r > 0.82) id = BLOCK.COAL_ORE;
            else if (y < 8 && r < 0.12) id = BLOCK.IRON_ORE;
            else id = BLOCK.STONE;
          } else if (y < surface) {
            id = sandy ? BLOCK.SAND : BLOCK.DIRT;
          } else if (y === surface) {
            if (sandy || surface <= SEA_LEVEL - 1) id = BLOCK.SAND;
            else id = BLOCK.GRASS;
          } else if (y <= SEA_LEVEL) {
            id = BLOCK.WATER;
          }
          if (id !== BLOCK.AIR) this.blocks[Chunk.index(x, y, z)] = id;
        }
      }
    }
    this.placeTrees(seed, ox, oz);
    this.dirty = true;
  }

  placeTrees(seed, ox, oz) {
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
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
        const trunk = 4 + Math.floor(valueNoise2D(wx, wz, seed + 3) * 2);
        for (let i = 1; i <= trunk; i++) this.set(x, top + i, z, BLOCK.WOOD);
        const leafBase = top + trunk - 1;
        for (let dy = 0; dy <= 2; dy++) {
          const r = dy === 2 ? 1 : 2;
          for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
              if (dx === 0 && dz === 0 && dy < 2) continue;
              if (Math.abs(dx) === r && Math.abs(dz) === r && dy === 0) continue;
              if (this.get(x + dx, leafBase + dy, z + dz) === BLOCK.AIR) {
                this.set(x + dx, leafBase + dy, z + dz, BLOCK.LEAVES);
              }
            }
          }
        }
        this.set(x, leafBase + 3, z, BLOCK.LEAVES);
      }
    }
  }
}
