import { valueNoise2D } from './noise.js';

// Biome ids. Each biome changes the surface block and how dense trees are.
export const BIOME = {
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
};

export const BIOME_DEFS = {
  // treeDensity scales how often a grass column gets a tree (1 = original rate, 0 = none).
  [BIOME.PLAINS]: { name: 'Plains', treeDensity: 1.0 },
  [BIOME.FOREST]: { name: 'Forest', treeDensity: 1.8 },
  [BIOME.DESERT]: { name: 'Desert', treeDensity: 0 },
};

// Picks a biome from two large-scale noise fields: temperature and humidity.
export function biomeAt(wx, wz, seed) {
  const temperature = valueNoise2D(wx * 0.004, wz * 0.004, seed + 201);
  const humidity = valueNoise2D(wx * 0.004, wz * 0.004, seed + 301);
  if (temperature > 0.62) return BIOME.DESERT;
  if (humidity > 0.55) return BIOME.FOREST;
  return BIOME.PLAINS;
}
