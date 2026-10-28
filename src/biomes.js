import { valueNoise2D } from './noise.js';
import { SEA_LEVEL } from './constants.js';

// Biome ids. Ids 0 to 2 are the original biomes and are kept, because saved worlds store them. Ids 3 to 13 are the
// highland and mountain biomes. Ids are fixed, so a saved chunk still reads the same biome after an update.
export const BIOME = {
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
  JAGGED_PEAKS: 3,
  FROZEN_PEAKS: 4,
  STONY_PEAKS: 5,
  MEADOW: 6,
  GROVE: 7,
  CHERRY_GROVE: 8,
  SNOWY_SLOPES: 9,
  WINDSWEPT_HILLS: 10,
  WINDSWEPT_GRAVELLY_HILLS: 11,
  WINDSWEPT_FOREST: 12,
  // Woodland and forest biomes. Ids 13 to 23 are new and never reused.
  FOREST_FLOWER: 13,
  DARK_FOREST: 14,
  BIRCH_FOREST: 15,
  OLD_GROWTH_BIRCH_FOREST: 16,
  TAIGA: 17,
  SNOWY_TAIGA: 18,
  OLD_GROWTH_PINE_TAIGA: 19,
  OLD_GROWTH_SPRUCE_TAIGA: 20,
  JUNGLE: 21,
  SPARSE_JUNGLE: 22,
  BAMBOO_JUNGLE: 23,
  // Wetland and coastal biomes. Ids 24 to 30 are new and never reused.
  RIVER: 24,
  FROZEN_RIVER: 25,
  SWAMP: 26,
  MANGROVE_SWAMP: 27,
  BEACH: 28,
  SNOWY_BEACH: 29,
  STONY_SHORE: 30,
};

// Each biome: `treeDensity` scales how often a grass column gets a tree (1 is the original rate, 0 is none).
// `surface` is the block on top, and `lift` raises the ground in blocks (mountains are high). `alt` marks a
// mountain biome, so it is picked at altitude. The blocks are the ones the game has. Biomes that need snow, ice, or
// cherry blocks use the nearest existing block, and the names are kept so the biome list matches the request.
export const BIOME_DEFS = {
  [BIOME.PLAINS]: { name: 'Plains', treeDensity: 1.0, surface: 'grass', lift: 0, alt: false, sink: 0 },
  [BIOME.FOREST]: { name: 'Forest', treeDensity: 1.8, surface: 'grass', lift: 0, alt: false, sink: 0 },
  [BIOME.DESERT]: { name: 'Desert', treeDensity: 0, surface: 'sand', lift: 0, alt: false, sink: 0 },
  [BIOME.JAGGED_PEAKS]: { name: 'Jagged Peaks', treeDensity: 0, surface: 'stone', lift: 34, alt: true, sink: 0 },
  [BIOME.FROZEN_PEAKS]: { name: 'Frozen Peaks', treeDensity: 0, surface: 'stone', lift: 30, alt: true, sink: 0 },
  [BIOME.STONY_PEAKS]: { name: 'Stony Peaks', treeDensity: 0, surface: 'stone', lift: 26, alt: true, sink: 0 },
  [BIOME.MEADOW]: { name: 'Meadow', treeDensity: 0.2, surface: 'grass', lift: 12, alt: true, sink: 0 },
  [BIOME.GROVE]: { name: 'Grove', treeDensity: 1.4, surface: 'grass', lift: 14, alt: true, sink: 0 },
  [BIOME.CHERRY_GROVE]: { name: 'Cherry Grove', treeDensity: 1.2, surface: 'grass', lift: 14, alt: true, sink: 0 },
  [BIOME.SNOWY_SLOPES]: { name: 'Snowy Slopes', treeDensity: 0.1, surface: 'stone', lift: 20, alt: true, sink: 0 },
  [BIOME.WINDSWEPT_HILLS]: { name: 'Windswept Hills', treeDensity: 0.3, surface: 'stone', lift: 10, alt: false, sink: 0 },
  [BIOME.WINDSWEPT_GRAVELLY_HILLS]: { name: 'Windswept Gravelly Hills', treeDensity: 0, surface: 'gravel', lift: 14, alt: false, sink: 0 },
  [BIOME.WINDSWEPT_FOREST]: { name: 'Windswept Forest', treeDensity: 1.0, surface: 'grass', lift: 10, alt: false, sink: 0 },
  // Woodland. `trunk` is the tree's base trunk height (the oak tree is 4 to 5). Only oak wood exists in the game, so
  // every tree is oak, and the variants differ by how many trees grow and how tall they are.
  [BIOME.FOREST_FLOWER]: { name: 'Flower Forest', treeDensity: 1.5, surface: 'grass', lift: 0, alt: false, trunk: 0, sink: 0 },
  [BIOME.DARK_FOREST]: { name: 'Dark Forest', treeDensity: 2.6, surface: 'grass', lift: 0, alt: false, trunk: 1, wood: 'dark', sink: 0 },
  // Birch forests grow birch trees: pale wood and light leaves. `birch` picks the wood the trees are made of.
  [BIOME.BIRCH_FOREST]: { name: 'Birch Forest', treeDensity: 1.1, surface: 'grass', lift: 0, alt: false, trunk: 1, wood: 'birch', sink: 0 },
  [BIOME.OLD_GROWTH_BIRCH_FOREST]: { name: 'Old Growth Birch Forest', treeDensity: 1.3, surface: 'grass', lift: 0, alt: false, trunk: 3, wood: 'birch', sink: 0 },
  [BIOME.TAIGA]: { name: 'Taiga', treeDensity: 0.7, surface: 'grass', lift: 0, alt: false, trunk: 1, wood: 'spruce', sink: 0 },
  [BIOME.SNOWY_TAIGA]: { name: 'Snowy Taiga', treeDensity: 0.6, surface: 'grass', lift: 0, alt: false, trunk: 1, wood: 'spruce', sink: 0 },
  [BIOME.OLD_GROWTH_PINE_TAIGA]: { name: 'Old Growth Pine Taiga', treeDensity: 0.5, surface: 'grass', lift: 0, alt: false, trunk: 4, wood: 'spruce', sink: 0 },
  [BIOME.OLD_GROWTH_SPRUCE_TAIGA]: { name: 'Old Growth Spruce Taiga', treeDensity: 0.5, surface: 'grass', lift: 0, alt: false, trunk: 4, wood: 'spruce', sink: 0 },
  [BIOME.JUNGLE]: { name: 'Jungle', treeDensity: 2.2, surface: 'grass', lift: 0, alt: false, trunk: 3, wood: 'jungle', sink: 0 },
  [BIOME.SPARSE_JUNGLE]: { name: 'Sparse Jungle', treeDensity: 0.9, surface: 'grass', lift: 0, alt: false, trunk: 3, wood: 'jungle', sink: 0 },
  [BIOME.BAMBOO_JUNGLE]: { name: 'Bamboo Jungle', treeDensity: 1.6, surface: 'grass', lift: 0, alt: false, trunk: 2, wood: 'jungle', sink: 0 },
  // Wetland and coast. `channel` is a river: the ground is cut down below sea level so water fills it.
  // `sink` lowers the ground a little, so swamps are flat and wet.
  [BIOME.RIVER]: { name: 'River', treeDensity: 0, surface: 'sand', lift: 0, alt: false, trunk: 0, channel: true, sink: 0 },
  [BIOME.FROZEN_RIVER]: { name: 'Frozen River', treeDensity: 0, surface: 'sand', lift: 0, alt: false, trunk: 0, channel: true, sink: 0 },
  [BIOME.SWAMP]: { name: 'Swamp', treeDensity: 0.5, surface: 'grass', lift: 0, alt: false, trunk: 0, channel: false, sink: 2 },
  [BIOME.MANGROVE_SWAMP]: { name: 'Mangrove Swamp', treeDensity: 0.9, surface: 'grass', lift: 0, alt: false, trunk: 1, channel: false, sink: 2 },
  [BIOME.BEACH]: { name: 'Beach', treeDensity: 0, surface: 'sand', lift: 0, alt: false, trunk: 0, channel: false, sink: 0 },
  [BIOME.SNOWY_BEACH]: { name: 'Snowy Beach', treeDensity: 0, surface: 'sand', lift: 0, alt: false, trunk: 0, channel: false, sink: 0 },
  [BIOME.STONY_SHORE]: { name: 'Stony Shore', treeDensity: 0, surface: 'stone', lift: 0, alt: false, trunk: 0, channel: false, sink: 0 },
};

// Picks a biome from large-scale noise: temperature and humidity for the lowland biomes, and an altitude field
// (`height`, the terrain height at this column) for the mountain biomes. Higher ground becomes a mountain biome.
export function biomeAt(wx, wz, seed, height = 0) {
  const temperature = valueNoise2D(wx * 0.004, wz * 0.004, seed + 201);
  const humidity = valueNoise2D(wx * 0.004, wz * 0.004, seed + 301);
  // Mountain zones: a separate noise field decides which mountain kind. Only high ground is a mountain.
  if (height >= 52) {
    const zone = valueNoise2D(wx * 0.006, wz * 0.006, seed + 501);
    if (zone < 0.2) return BIOME.JAGGED_PEAKS;
    if (zone < 0.4) return BIOME.FROZEN_PEAKS;
    if (zone < 0.55) return BIOME.STONY_PEAKS;
    if (zone < 0.7) return BIOME.SNOWY_SLOPES;
    return BIOME.STONY_PEAKS;
  }
  if (height >= 44) {
    const zone = valueNoise2D(wx * 0.006, wz * 0.006, seed + 503);
    if (zone < 0.25) return BIOME.MEADOW;
    if (zone < 0.5) return BIOME.GROVE;
    if (zone < 0.7) return BIOME.CHERRY_GROVE;
    return BIOME.MEADOW;
  }
  // Windswept lands are a lowland noise field. Their kind depends on humidity.
  const windswept = valueNoise2D(wx * 0.005, wz * 0.005, seed + 505);
  if (windswept > 0.72) {
    if (humidity > 0.6) return BIOME.WINDSWEPT_FOREST;
    if (temperature > 0.5) return BIOME.WINDSWEPT_GRAVELLY_HILLS;
    return BIOME.WINDSWEPT_HILLS;
  }
  // Wetland and coast. A river is a thin ridge in a noise field: where the field is near its middle, the ground is
  // cut into a channel. Shores are the low ground near sea level, and swamps are wet low ground.
  const ridge = Math.abs(valueNoise2D(wx * 0.007, wz * 0.007, seed + 601) - 0.5);
  if (ridge < 0.025 && height < SEA_LEVEL + 12) {
    return temperature < 0.3 ? BIOME.FROZEN_RIVER : BIOME.RIVER;
  }
  if (height <= SEA_LEVEL + 2 && height > SEA_LEVEL - 3) {
    const shore = valueNoise2D(wx * 0.009, wz * 0.009, seed + 603);
    if (shore < 0.3) return BIOME.STONY_SHORE;
    if (temperature < 0.3) return BIOME.SNOWY_BEACH;
    return BIOME.BEACH;
  }
  if (height <= SEA_LEVEL + 6 && humidity > 0.7) {
    return valueNoise2D(wx * 0.01, wz * 0.01, seed + 605) > 0.5 ? BIOME.MANGROVE_SWAMP : BIOME.SWAMP;
  }
  // Woodland: cool ground is taiga, wet ground is jungle, and the rest is forest of birch or oak.
  // A second noise field picks the variant inside each kind.
  const variant = valueNoise2D(wx * 0.008, wz * 0.008, seed + 507);
  if (temperature < 0.3 && humidity > 0.45) {
    if (variant < 0.25) return BIOME.SNOWY_TAIGA;
    if (variant < 0.6) return BIOME.TAIGA;
    if (variant < 0.8) return BIOME.OLD_GROWTH_PINE_TAIGA;
    return BIOME.OLD_GROWTH_SPRUCE_TAIGA;
  }
  if (humidity > 0.8) {
    if (variant < 0.4) return BIOME.JUNGLE;
    if (variant < 0.7) return BIOME.SPARSE_JUNGLE;
    return BIOME.BAMBOO_JUNGLE;
  }
  if (humidity > 0.62) {
    if (variant < 0.3) return BIOME.DARK_FOREST;
    if (variant < 0.5) return BIOME.FOREST_FLOWER;
    if (variant < 0.7) return BIOME.BIRCH_FOREST;
    return BIOME.OLD_GROWTH_BIRCH_FOREST;
  }
  if (temperature > 0.62) return BIOME.DESERT;
  if (humidity > 0.55) return BIOME.FOREST;
  return BIOME.PLAINS;
}
