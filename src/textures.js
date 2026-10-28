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

// Painters for one kind of tree: its wood sides and top, its planks, and its leaves. Each kind takes its own colours
// and a seed, so the dark oak, spruce and jungle trees look different without repeating the texture code.
function woodPainters(prefix, bark, plank, leaf, seed) {
  return {
    [`${prefix}Side`]: (x, y) => {
      const groove = noise(Math.floor(x / 2), 0, seed);
      const dark = x < 1 || x > 14 ? 0.8 : 1;
      return jitter(shade(bark, (0.75 + groove * 0.4) * dark), noise(x, y, seed + 1), 0.06);
    },
    [`${prefix}Top`]: (x, y) => {
      const r = Math.hypot(x - 7.5, y - 7.5);
      const ring = Math.floor(r + smooth(x * 0.3, y * 0.3, seed + 2) * 0.8) % 2;
      return jitter(ring ? bark : shade(bark, 0.85), noise(x, y, seed + 3), 0.04);
    },
    [`${prefix}Planks`]: (x, y) => jitter(y % 4 === 0 ? shade(plank, 0.86) : plank, noise(x, y, seed + 4), 0.06),
    [`${prefix}Leaves`]: (x, y) => {
      const clump = smooth(x * 0.8, y * 0.8, seed + 5);
      if (noise(x, y, seed + 6) < 0.2) return NONE;
      return jitter(shade(leaf, 0.78 + clump * 0.42), noise(x, y, seed + 7), 0.08);
    },
  };
}

// Realism helpers. A smooth noise value gives clumps rather than static, so textures look like real material.
// `smooth` blends neighbouring random values, so a patch of pixels shares a tone and the eye reads it as texture.
function smooth(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = noise(x0, y0, seed);
  const b = noise(x0 + 1, y0, seed);
  const c = noise(x0, y0 + 1, seed);
  const d = noise(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

// Darkens a colour by a factor, for shadow edges and the darker side of a block.
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// Each painter returns [r, g, b, a] in 0..1 for pixel (x, y). Row 0 is the top of the tile.
const PAINTERS = {
  // Grass: a clumpy green top with blade flecks, so it reads as turf rather than a flat sheet.
  grassTop: (x, y) => {
    const clump = smooth(x * 0.6, y * 0.6, 21);
    const blade = noise(x, y, 22) > 0.8 ? 0.12 : 0;
    return jitter([GREEN[0] * (0.85 + clump * 0.3) + blade * 0.3, GREEN[1] * (0.85 + clump * 0.3) + blade, GREEN[2] * (0.85 + clump * 0.2)], noise(x, y, 1), 0.06);
  },
  // Grass side: a soil body with a ragged green lip along the top, which hangs down unevenly.
  grassSide: (x, y) => {
    const lip = 3 + Math.floor(noise(x, 9, 5) * 3);
    if (y < lip) return jitter(GREEN, noise(x, y, 2), 0.12);
    const soil = smooth(x * 0.7, y * 0.7, 23);
    return jitter(shade(DIRT, 0.85 + soil * 0.3), noise(x, y, 3), 0.1);
  },
  // Dirt: uneven brown with small pebbles and darker clumps.
  dirt: (x, y) => {
    const clump = smooth(x * 0.5, y * 0.5, 24);
    const pebble = noise(x, y, 6) > 0.92 ? 1.3 : 1;
    return jitter(shade(DIRT, (0.8 + clump * 0.35) * pebble), noise(x, y, 4), 0.1);
  },
  // Stone: grey with mottled patches and small cracks.
  stone: (x, y) => {
    const mottle = smooth(x * 0.45, y * 0.45, 25);
    const crack = noise(x, y, 26) > 0.96 ? 0.6 : 1;
    return jitter(shade(STONE, (0.82 + mottle * 0.3) * crack), noise(x, y, 7), 0.08);
  },
  // Sand: fine grain with faint ripples.
  sand: (x, y) => {
    const ripple = Math.sin(y * 1.1 + smooth(x * 0.3, y * 0.3, 27) * 2) * 0.04;
    return jitter([0.86 + ripple, 0.82 + ripple, 0.6 + ripple], noise(x, y, 8), 0.06);
  },
  // Wood side: bark with long vertical grooves and a darker band at the edges.
  woodSide: (x, y) => {
    const groove = noise(Math.floor(x / 2), 0, 9);
    const dark = x < 1 || x > 14 ? 0.8 : 1;
    return jitter(shade(BARK, (0.75 + groove * 0.4) * dark), noise(x, y, 28), 0.06);
  },
  // Wood top: concentric growth rings with a slightly lighter heartwood.
  woodTop: (x, y) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    const ring = Math.floor(r + smooth(x * 0.3, y * 0.3, 29) * 0.8) % 2;
    return jitter(ring ? [0.7, 0.55, 0.34] : [0.6, 0.45, 0.25], noise(x, y, 10), 0.05);
  },
  // Birch wood side: pale bark with dark horizontal marks, like birch bark.
  birchSide: (x, y) => {
    const mark = noise(x, Math.floor(y / 3), 40) > 0.7 && y % 3 === 0;
    if (mark) return jitter([0.2, 0.18, 0.16], noise(x, y, 41), 0.06);
    return jitter([0.9, 0.88, 0.82], noise(x, y, 42), 0.05);
  },
  // Birch wood top: pale growth rings, lighter than oak.
  birchTop: (x, y) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    const ring = Math.floor(r + smooth(x * 0.3, y * 0.3, 43) * 0.8) % 2;
    return jitter(ring ? [0.86, 0.82, 0.72] : [0.92, 0.9, 0.84], noise(x, y, 44), 0.04);
  },
  // Birch planks: pale boards with a fine grain line every four rows.
  birchPlanks: (x, y) => jitter(y % 4 === 0 ? [0.78, 0.7, 0.52] : [0.86, 0.78, 0.6], noise(x, y, 45), 0.06),
  // Birch leaves: light green foliage with clumps and gaps.
  birchLeaves: (x, y) => {
    const clump = smooth(x * 0.8, y * 0.8, 46);
    if (noise(x, y, 47) < 0.2) return NONE;
    return jitter(shade([0.42, 0.66, 0.3], 0.78 + clump * 0.42), noise(x, y, 48), 0.08);
  },
  ...woodPainters('darkOak', [0.3, 0.22, 0.12], [0.42, 0.3, 0.17], [0.16, 0.36, 0.14], 50),
  ...woodPainters('spruce', [0.36, 0.24, 0.14], [0.6, 0.45, 0.27], [0.14, 0.38, 0.28], 60),
  ...woodPainters('jungle', [0.5, 0.34, 0.2], [0.72, 0.48, 0.3], [0.22, 0.6, 0.12], 70),
  // Leaves: dense foliage with light and dark clumps, and small gaps where the sky shows through.
  leaves: (x, y) => {
    const clump = smooth(x * 0.8, y * 0.8, 30);
    if (noise(x, y, 11) < 0.2) return NONE;
    return jitter(shade(LEAF, 0.75 + clump * 0.45), noise(x, y, 12), 0.08);
  },
  water: (x, y) => {
    const wave = Math.sin(y * 1.2 + x * 0.3) > 0.7 ? 0.1 : 0;
    return [0.2 + wave, 0.4 + wave, 0.9, 0.6];
  },
  // Cobblestone: rounded stones of uneven size and tone, separated by dark mortar, not a regular grid.
  cobble: (x, y) => {
    const stoneTone = 0.8 + smooth(x * 0.6, y * 0.6, 13) * 0.4;
    const gap = smooth(x * 0.9, y * 0.9, 61) < 0.3;
    if (gap) return jitter([0.22, 0.21, 0.2], noise(x, y, 62), 0.06);
    return jitter(shade([0.46, 0.45, 0.43], stoneTone), noise(x, y, 13), 0.1);
  },
  // Planks: boards of varied tone, each with a dark seam and a grain line running along the board.
  planks: (x, y) => {
    const board = Math.floor(y / 4);
    const seam = y % 4 === 0;
    const boardTone = 0.92 + noise(board, 0, 63) * 0.16;
    const grain = smooth(x * 0.25, y * 0.9, 64) * 0.12;
    if (seam) return jitter([0.42, 0.31, 0.18], noise(x, y, 65), 0.05);
    return jitter(shade(PLANK, boardTone + grain), noise(x, y, 66), 0.06);
  },
  bedrock: (x, y) => jitter([0.15, 0.15, 0.15], noise(x, y, 15), 0.25),
  glass: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [0.85, 0.92, 0.96, 0.95] : [0.8, 0.9, 0.95, 0.12]),
  coal: (x, y) => (noise(x, y, 16) > 0.85 ? [0.08, 0.08, 0.08, 1] : jitter(STONE, noise(x, y, 17), 0.18)),
  iron: (x, y) => (noise(x, y, 18) > 0.88 ? [0.85, 0.65, 0.5, 1] : jitter(STONE, noise(x, y, 19), 0.18)),
  // Torch, drawn like tor.png: a chunky orange flame with a white core on top of a brown stick.
  torch: (x, y) => {
    if (y <= 4 && x >= 4 && x <= 11) {
      if (y >= 1 && y <= 2 && x >= 6 && x <= 9) return [1, 0.97, 0.8, 1];
      if (y <= 1 && x >= 5 && x <= 10) return [1, 0.85, 0.2, 1];
      return [1, 0.5, 0.1, 1];
    }
    if (y >= 5 && x >= 6 && x <= 9) return x === 9 ? [0.3, 0.2, 0.1, 1] : [0.55, 0.4, 0.22, 1];
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
  // Wheat block: a bundle of golden wheat stalks, bound with a darker band.
  wheatBlock: (x, y) => {
    const band = y === 5 || y === 10;
    if (band) return jitter([0.55, 0.42, 0.2], noise(x, y, 90), 0.06);
    return jitter([0.85, 0.72, 0.3], noise(x, y, 91), 0.1);
  },
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
  [BLOCK.BIRCH_WOOD]: { top: 'birchTop', side: 'birchSide', bottom: 'birchTop' },
  [BLOCK.BIRCH_PLANKS]: { top: 'birchPlanks', side: 'birchPlanks', bottom: 'birchPlanks' },
  [BLOCK.BIRCH_LEAVES]: { top: 'birchLeaves', side: 'birchLeaves', bottom: 'birchLeaves' },
  [BLOCK.DARK_OAK_WOOD]: { top: 'darkOakTop', side: 'darkOakSide', bottom: 'darkOakTop' },
  [BLOCK.DARK_OAK_PLANKS]: { top: 'darkOakPlanks', side: 'darkOakPlanks', bottom: 'darkOakPlanks' },
  [BLOCK.DARK_OAK_LEAVES]: { top: 'darkOakLeaves', side: 'darkOakLeaves', bottom: 'darkOakLeaves' },
  [BLOCK.SPRUCE_WOOD]: { top: 'spruceTop', side: 'spruceSide', bottom: 'spruceTop' },
  [BLOCK.SPRUCE_PLANKS]: { top: 'sprucePlanks', side: 'sprucePlanks', bottom: 'sprucePlanks' },
  [BLOCK.SPRUCE_LEAVES]: { top: 'spruceLeaves', side: 'spruceLeaves', bottom: 'spruceLeaves' },
  [BLOCK.JUNGLE_WOOD]: { top: 'jungleTop', side: 'jungleSide', bottom: 'jungleTop' },
  [BLOCK.JUNGLE_PLANKS]: { top: 'junglePlanks', side: 'junglePlanks', bottom: 'junglePlanks' },
  [BLOCK.JUNGLE_LEAVES]: { top: 'jungleLeaves', side: 'jungleLeaves', bottom: 'jungleLeaves' },
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
  [BLOCK.WHEAT_BLOCK]: { top: 'wheatBlock', side: 'wheatBlock', bottom: 'wheatBlock' },
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
