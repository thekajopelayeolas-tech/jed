import { BLOCK } from './blocks.js';
import { DOOR, STORAGE, FURNACE_STATE, BED_FOOT } from './building.js';

// Procedural 16x16 pixel textures packed into one atlas. No image files are needed.
export const TILE = 16;
const COLS = 8;

// Seeded per-pixel hash in [0, 1).
function noise(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

// Adds a small random offset around a base colour.
const jitter = (c, n, amount) => [c[0] + (n - 0.5) * amount, c[1] + (n - 0.5) * amount, c[2] + (n - 0.5) * amount, 1];

const GREEN = [0.36, 0.7, 0.25];
const DIRT = [0.45, 0.32, 0.18];
const STONE = [0.5, 0.5, 0.5];
const PLANK = [0.75, 0.6, 0.38];
const BARK = [0.4, 0.28, 0.14];
const LEAF = [0.2, 0.5, 0.15];
const NONE = [0, 0, 0, 0];

// Each painter returns [r, g, b, a] in 0..1 for pixel (x, y). Row 0 is the top of the tile.
const PAINTERS = {
  grassTop: (x, y) => jitter(GREEN, noise(x, y, 1), 0.14),
  grassSide: (x, y) => (y < 3 + (noise(x, 9, 5) > 0.6 ? 1 : 0) ? jitter(GREEN, noise(x, y, 2), 0.14) : jitter(DIRT, noise(x, y, 3), 0.12)),
  dirt: (x, y) => jitter(DIRT, noise(x, y, 4), noise(x, y, 6) > 0.92 ? 0.4 : 0.12),
  stone: (x, y) => jitter(STONE, noise(x, y, 7), 0.18),
  sand: (x, y) => jitter([0.86, 0.82, 0.6], noise(x, y, 8), 0.08),
  woodSide: (x, y) => jitter(BARK, noise(Math.floor(x / 2), 0, 9), 0.15),
  woodTop: (x, y) => {
    const ring = Math.floor(Math.hypot(x - 7.5, y - 7.5)) % 2;
    return jitter(ring ? [0.7, 0.55, 0.34] : [0.6, 0.45, 0.25], noise(x, y, 10), 0.08);
  },
  leaves: (x, y) => (noise(x, y, 11) > 0.25 ? jitter(LEAF, noise(x, y, 12), 0.12) : NONE),
  water: (x, y) => {
    const wave = Math.sin(y * 1.2 + x * 0.3) > 0.7 ? 0.1 : 0;
    return [0.2 + wave, 0.4 + wave, 0.9, 0.6];
  },
  cobble: (x, y) => {
    const mortar = x % 8 === 0 || y % 4 === 0 || (Math.floor(y / 4) % 2 === 1 && x % 8 === 4);
    return jitter(mortar ? [0.25, 0.25, 0.25] : [0.42, 0.42, 0.42], noise(x, y, 13), 0.12);
  },
  planks: (x, y) => jitter(y % 4 === 0 ? [0.55, 0.42, 0.25] : PLANK, noise(x, y, 14), 0.08),
  bedrock: (x, y) => jitter([0.15, 0.15, 0.15], noise(x, y, 15), 0.25),
  glass: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [0.85, 0.92, 0.96, 0.95] : [0.8, 0.9, 0.95, 0.12]),
  coal: (x, y) => (noise(x, y, 16) > 0.85 ? [0.08, 0.08, 0.08, 1] : jitter(STONE, noise(x, y, 17), 0.18)),
  iron: (x, y) => (noise(x, y, 18) > 0.88 ? [0.85, 0.65, 0.5, 1] : jitter(STONE, noise(x, y, 19), 0.18)),
  torch: (x, y) => {
    if (y < 5 && x >= 6 && x <= 9) return [1, 0.85, 0.2, 1];
    if (y >= 5 && x >= 7 && x <= 8) return [0.45, 0.3, 0.15, 1];
    return NONE;
  },
  craftTop: (x, y) => (x % 5 === 0 || y % 5 === 0 ? [0.35, 0.25, 0.12, 1] : PAINTERS.planks(x, y)),
  craftSide: (x, y) => (x >= 4 && x <= 11 && y >= 4 && y <= 11 ? [0.3, 0.22, 0.1, 1] : PAINTERS.planks(x, y)),
  // Bed top: red blanket with a white pillow at the head end (top rows).
  bedTop: (x, y) => (y < 6 ? jitter([0.95, 0.95, 0.92], noise(x, y, 20), 0.06) : jitter([0.8, 0.15, 0.15], noise(x, y, 21), 0.08)),
  // Bed side: red blanket over a wood frame at the bottom.
  bedSide: (x, y) => (y >= 13 ? jitter([0.4, 0.28, 0.14], noise(x, y, 22), 0.1) : jitter([0.7, 0.12, 0.12], noise(x, y, 23), 0.08)),
  // Bed foot: solid red blanket on every face, with a little grain so it reads as cloth.
  bedRed: (x, y) => jitter([0.8, 0.15, 0.15], noise(x, y, 24), 0.08),
  // Wool: soft white fibres with a little grain.
  wool: (x, y) => jitter([0.92, 0.92, 0.9], noise(x, y, 31), 0.1),
  // Furnace: grey stone with a dark firebox opening on the front.
  furnaceSide: (x, y) => (x >= 4 && x <= 11 && y >= 6 && y <= 12 ? [0.12, 0.1, 0.09, 1] : jitter([0.45, 0.45, 0.45], noise(x, y, 24), 0.14)),
  furnaceTop: (x, y) => jitter([0.42, 0.42, 0.42], noise(x, y, 25), 0.14),
  // Furnace front: the dark firebox opening, shown on the side the furnace faces.
  furnaceFront: (x, y) => (x >= 4 && x <= 11 && y >= 6 && y <= 12 ? [0.12, 0.1, 0.09, 1] : jitter([0.45, 0.45, 0.45], noise(x, y, 27), 0.14)),
  // Lit furnace front: the same stone, with a bright fire inside the firebox opening.
  furnaceLitSide: (x, y) => {
    if (x >= 4 && x <= 11 && y >= 6 && y <= 12) {
      const hot = (x + y) % 3 === 0 ? [1, 0.9, 0.4, 1] : [0.98, 0.45, 0.12, 1];
      return hot;
    }
    return jitter([0.45, 0.45, 0.45], noise(x, y, 26), 0.14);
  },
  // Diamond ore: stone with pale cyan gems.
  diamondOre: (x, y) => (noise(x, y, 26) > 0.9 ? [0.45, 0.92, 0.95, 1] : jitter(STONE, noise(x, y, 27), 0.18)),
  // Stone bricks: grey stone laid in offset rows with dark mortar.
  stoneBricks: (x, y) => {
    const row = Math.floor(y / 4);
    const mortar = y % 4 === 0 || x % 8 === ((row % 2) * 4);
    return jitter(mortar ? [0.3, 0.3, 0.3] : [0.52, 0.52, 0.52], noise(x, y, 40), 0.1);
  },
  // Polished stone: smooth light grey with a faint seam.
  polishedStone: (x, y) => jitter(x % 16 === 0 || y % 16 === 0 ? [0.5, 0.5, 0.5] : [0.66, 0.66, 0.66], noise(x, y, 41), 0.05),
  // Bricks: red-orange bricks in offset rows with pale mortar.
  bricks: (x, y) => {
    const row = Math.floor(y / 4);
    const mortar = y % 4 === 0 || x % 8 === ((row % 2) * 4);
    return jitter(mortar ? [0.82, 0.8, 0.74] : [0.6, 0.3, 0.25], noise(x, y, 42), 0.1);
  },
  // Concrete: even light grey with fine speckles.
  concrete: (x, y) => jitter([0.6, 0.6, 0.6], noise(x, y, 43), 0.12),
  // Chest: planks with a dark band, iron corner bands, and a clasp on the front.
  chestSide: (x, y) => {
    const band = y === 5 || y === 10 || x === 0 || x === 15;
    if (band) return jitter([0.25, 0.22, 0.2], noise(x, y, 80), 0.05);
    if (x >= 7 && x <= 8 && y >= 6 && y <= 9) return [0.85, 0.75, 0.3, 1];
    return jitter(y % 4 === 0 ? [0.55, 0.42, 0.25] : PLANK, noise(x, y, 81), 0.08);
  },
  // Chest front: the same planks, with the clasp only on this face.
  chestFront: (x, y) => {
    const band = y === 5 || y === 10 || x === 0 || x === 15;
    if (band) return jitter([0.25, 0.22, 0.2], noise(x, y, 84), 0.05);
    if (x >= 7 && x <= 8 && y >= 6 && y <= 9) return [0.85, 0.75, 0.3, 1];
    return jitter(y % 4 === 0 ? [0.55, 0.42, 0.25] : PLANK, noise(x, y, 85), 0.08);
  },
  chestTop: (x, y) => {
    const edge = x === 0 || x === 15 || y === 0 || y === 15;
    if (edge) return jitter([0.25, 0.22, 0.2], noise(x, y, 82), 0.05);
    return jitter(PLANK, noise(x, y, 83), 0.08);
  },
  // Door front: the same planks and frame, with the handle on this face.
  doorFront: (x, y) => {
    const frame = x < 2 || x > 13 || y < 2 || y > 13;
    if (frame) return jitter([0.36, 0.25, 0.12], noise(x, y, 72), 0.06);
    if (x >= 10 && x <= 11 && y >= 7 && y <= 8) return [0.85, 0.75, 0.3, 1];
    return jitter(y % 4 === 0 ? [0.55, 0.42, 0.25] : PLANK, noise(x, y, 73), 0.08);
  },
  // Door: wooden planks with a frame, and a small handle near the edge.
  door: (x, y) => {
    const frame = x < 2 || x > 13 || y < 2 || y > 13;
    if (frame) return jitter([0.36, 0.25, 0.12], noise(x, y, 70), 0.06);
    if (x >= 10 && x <= 11 && y >= 7 && y <= 8) return [0.85, 0.75, 0.3, 1];
    return jitter(y % 4 === 0 ? [0.55, 0.42, 0.25] : PLANK, noise(x, y, 71), 0.08);
  },
  // Rainbow ore: stone with small gems in a rainbow of colours.
  rainbowOre: (x, y) => {
    const n = noise(x, y, 28);
    if (n < 0.88) return jitter(STONE, noise(x, y, 29), 0.18);
    const hues = [[1, 0.3, 0.3, 1], [1, 0.8, 0.2, 1], [0.3, 1, 0.4, 1], [0.3, 0.6, 1, 1], [0.8, 0.4, 1, 1]];
    return hues[Math.floor(noise(x, y, 30) * hues.length) % hues.length];
  },
};

// Tile index for each named painter, in atlas order.
const TILE_NAMES = Object.keys(PAINTERS);
export const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i]));

// Which tile each block uses for its top, side, and bottom faces.
export const BLOCK_TILES = {
  [BLOCK.GRASS]: { top: 'grassTop', side: 'grassSide', bottom: 'dirt' },
  [BLOCK.DIRT]: { top: 'dirt', side: 'dirt', bottom: 'dirt' },
  [BLOCK.STONE]: { top: 'stone', side: 'stone', bottom: 'stone' },
  [BLOCK.SAND]: { top: 'sand', side: 'sand', bottom: 'sand' },
  [BLOCK.WOOD]: { top: 'woodTop', side: 'woodSide', bottom: 'woodTop' },
  [BLOCK.LEAVES]: { top: 'leaves', side: 'leaves', bottom: 'leaves' },
  [BLOCK.WATER]: { top: 'water', side: 'water', bottom: 'water' },
  [BLOCK.COBBLESTONE]: { top: 'cobble', side: 'cobble', bottom: 'cobble' },
  [BLOCK.PLANKS]: { top: 'planks', side: 'planks', bottom: 'planks' },
  [BLOCK.BEDROCK]: { top: 'bedrock', side: 'bedrock', bottom: 'bedrock' },
  [BLOCK.GLASS]: { top: 'glass', side: 'glass', bottom: 'glass' },
  [BLOCK.COAL_ORE]: { top: 'coal', side: 'coal', bottom: 'coal' },
  [BLOCK.IRON_ORE]: { top: 'iron', side: 'iron', bottom: 'iron' },
  [BLOCK.TORCH]: { top: 'torch', side: 'torch', bottom: 'torch' },
  [BLOCK.CRAFTING_TABLE]: { top: 'craftTop', side: 'craftSide', bottom: 'planks' },
  [BLOCK.BED]: { top: 'bedTop', side: 'bedSide', bottom: 'planks' },
  // The bed's foot is all red on every face, so it is a plain red tile.
  [BED_FOOT]: { top: 'bedRed', side: 'bedRed', bottom: 'bedRed' },
  [BLOCK.WOOL]: { top: 'wool', side: 'wool', bottom: 'wool' },
  // `front` is the tile for the side the block faces. Blocks without one look the same on every side.
  [BLOCK.FURNACE]: { top: 'furnaceTop', side: 'furnaceSide', front: 'furnaceFront', bottom: 'furnaceTop' },
  [FURNACE_STATE.LIT]: { top: 'furnaceTop', side: 'furnaceSide', front: 'furnaceLitSide', bottom: 'furnaceTop' },
  [BLOCK.DIAMOND_ORE]: { top: 'diamondOre', side: 'diamondOre', bottom: 'diamondOre' },
  [BLOCK.RAINBOW_ORE]: { top: 'rainbowOre', side: 'rainbowOre', bottom: 'rainbowOre' },
  [BLOCK.STONE_BRICKS]: { top: 'stoneBricks', side: 'stoneBricks', bottom: 'stoneBricks' },
  [BLOCK.POLISHED_STONE]: { top: 'polishedStone', side: 'polishedStone', bottom: 'polishedStone' },
  [BLOCK.BRICKS]: { top: 'bricks', side: 'bricks', bottom: 'bricks' },
  [BLOCK.CONCRETE]: { top: 'concrete', side: 'concrete', bottom: 'concrete' },
  [BLOCK.WOOD_SLAB]: { top: 'planks', side: 'planks', bottom: 'planks' },
  [BLOCK.STONE_SLAB]: { top: 'stone', side: 'stone', bottom: 'stone' },
  [BLOCK.BRICK_SLAB]: { top: 'bricks', side: 'bricks', bottom: 'bricks' },
  [BLOCK.CONCRETE_SLAB]: { top: 'concrete', side: 'concrete', bottom: 'concrete' },
  [BLOCK.WOOD_STAIRS]: { top: 'planks', side: 'planks', bottom: 'planks' },
  [BLOCK.STONE_STAIRS]: { top: 'stone', side: 'stone', bottom: 'stone' },
  [BLOCK.BRICK_STAIRS]: { top: 'bricks', side: 'bricks', bottom: 'bricks' },
  [BLOCK.CONCRETE_STAIRS]: { top: 'concrete', side: 'concrete', bottom: 'concrete' },
  [STORAGE.CHEST]: { top: 'chestTop', side: 'chestSide', front: 'chestFront', bottom: 'chestTop' },
  // Doors show the handle on their front face. Their other faces are plain door planks.
  [DOOR.DOOR]: { top: 'door', side: 'door', front: 'doorFront', bottom: 'door' },
  [DOOR.OPEN_DOOR]: { top: 'door', side: 'door', front: 'doorFront', bottom: 'door' },
};

// Builds the atlas canvas as a Uint8ClampedArray of RGBA pixels, ready for THREE.DataTexture.
export function buildAtlasPixels() {
  const size = TILE * COLS;
  const rows = Math.ceil(TILE_NAMES.length / COLS);
  const width = TILE * COLS;
  const height = TILE * rows;
  const data = new Uint8ClampedArray(width * height * 4);
  TILE_NAMES.forEach((name, t) => {
    const ox = (t % COLS) * TILE;
    const oy = Math.floor(t / COLS) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const [r, g, b, a] = PAINTERS[name](x, y);
        // Flip Y so the texture reads right side up in UV space.
        const i = ((oy + (TILE - 1 - y)) * width + (ox + x)) * 4;
        data[i] = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = b * 255;
        data[i + 3] = a * 255;
      }
    }
  });
  return { data, width, height, size, rows };
}

// Returns one tile as RGBA bytes with row 0 at the top, so it can be drawn on a 2D canvas (inventory icons).
export function tileImageData(name) {
  const data = new Uint8ClampedArray(TILE * TILE * 4);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b, a] = PAINTERS[name](x, y);
      const i = (y * TILE + x) * 4;
      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = b * 255;
      data[i + 3] = a * 255;
    }
  }
  return data;
}

// Creates a THREE.DataTexture for the atlas with nearest-neighbour filtering, so pixels stay crisp.
export function createAtlasTexture(THREE) {
  const { data, width, height } = buildAtlasPixels();
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Returns [u0, v0, u1, v1] for a tile index, in texture UV space.
export function tileUV(index) {
  const cols = COLS;
  const rows = Math.ceil(TILE_NAMES.length / COLS);
  const c = index % cols;
  const r = Math.floor(index / cols);
  // buildAtlasPixels puts row r at image rows r*TILE..(r+1)*TILE, which is v in [r/rows, (r+1)/rows].
  return [c / cols, r / rows, (c + 1) / cols, (r + 1) / rows];
}
