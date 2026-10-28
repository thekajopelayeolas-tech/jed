// The tree kinds. Each kind has its trunk wood, its planks, and its leaves. Oak is the original and the default.
// A biome names its kind in biomes.js (`wood`), and the trees and village houses there use that kind.
import { BLOCK } from './blocks.js';

export const WOOD_SETS = {
  oak: { wood: BLOCK.WOOD, planks: BLOCK.PLANKS, leaves: BLOCK.LEAVES },
  birch: { wood: BLOCK.BIRCH_WOOD, planks: BLOCK.BIRCH_PLANKS, leaves: BLOCK.BIRCH_LEAVES },
  dark: { wood: BLOCK.DARK_OAK_WOOD, planks: BLOCK.DARK_OAK_PLANKS, leaves: BLOCK.DARK_OAK_LEAVES },
  spruce: { wood: BLOCK.SPRUCE_WOOD, planks: BLOCK.SPRUCE_PLANKS, leaves: BLOCK.SPRUCE_LEAVES },
  jungle: { wood: BLOCK.JUNGLE_WOOD, planks: BLOCK.JUNGLE_PLANKS, leaves: BLOCK.JUNGLE_LEAVES },
};

// The wood set for a kind name. An unknown or missing name gives oak.
export function woodSet(kind) {
  return WOOD_SETS[kind] ?? WOOD_SETS.oak;
}
