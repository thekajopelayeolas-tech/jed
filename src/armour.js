// Armour rules. Pure data and functions with no DOM or three.js, so tests run in Node.
// Each piece has a part (helmet, chest, legs, boots) and defence points. Each point blocks 4% of
// incoming damage, and the total reduction is capped at 80%.
import { BLOCK } from './blocks.js';

export const PARTS = ['helmet', 'chest', 'legs', 'boots'];
export const DEFENCE_PER_POINT = 0.04;
export const MAX_REDUCTION = 0.8;

// Armour sets per material: item id for each part, and the defence points each part gives.
export const ARMOUR_SETS = {
  wood: {
    ids: { helmet: BLOCK.WOODEN_HELMET, chest: BLOCK.WOODEN_CHEST, legs: BLOCK.WOODEN_LEGS, boots: BLOCK.WOODEN_BOOTS },
    defence: { helmet: 1, chest: 2, legs: 2, boots: 1 },
  },
  stone: {
    ids: { helmet: BLOCK.STONE_HELMET, chest: BLOCK.STONE_CHEST, legs: BLOCK.STONE_LEGS, boots: BLOCK.STONE_BOOTS },
    defence: { helmet: 2, chest: 3, legs: 2, boots: 1 },
  },
  iron: {
    ids: { helmet: BLOCK.IRON_HELMET, chest: BLOCK.IRON_CHEST, legs: BLOCK.IRON_LEGS, boots: BLOCK.IRON_BOOTS },
    defence: { helmet: 2, chest: 4, legs: 3, boots: 1 },
  },
  diamond: {
    ids: { helmet: BLOCK.DIAMOND_HELMET, chest: BLOCK.DIAMOND_CHEST, legs: BLOCK.DIAMOND_LEGS, boots: BLOCK.DIAMOND_BOOTS },
    defence: { helmet: 3, chest: 4, legs: 3, boots: 2 },
  },
};

// Looks up an item id: which part it is, and how many defence points it gives. Null if it is not armour.
const BY_ID = new Map();
for (const set of Object.values(ARMOUR_SETS)) {
  for (const part of PARTS) BY_ID.set(set.ids[part], { part, defence: set.defence[part] });
}

export function armourInfo(id) {
  return BY_ID.get(id) ?? null;
}

// The four worn slots. 0 means the slot is empty.
export function emptyArmour() {
  return { helmet: BLOCK.AIR, chest: BLOCK.AIR, legs: BLOCK.AIR, boots: BLOCK.AIR };
}

// Total defence points from the worn pieces.
export function defencePoints(worn) {
  let total = 0;
  for (const part of PARTS) {
    const info = armourInfo(worn[part]);
    if (info) total += info.defence;
  }
  return total;
}

// Fraction of incoming damage blocked, from 0 to MAX_REDUCTION.
export function damageReduction(worn) {
  return Math.min(MAX_REDUCTION, defencePoints(worn) * DEFENCE_PER_POINT);
}
