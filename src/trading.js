import { BLOCK } from './blocks.js';
import { VILLAGER_JOBS } from './mobs.js';

// A compact village market: villagers buy farm goods and sell useful supplies for emeralds.
export const VILLAGER_TRADES = [
  // Farmer
  { id: 'wheat', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.WHEAT, count: 10 }, output: { id: BLOCK.EMERALD, count: 1 } },
  { id: 'chicken', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.COOKED_CHICKEN, count: 5 }, output: { id: BLOCK.EMERALD, count: 2 } },
  { id: 'flowers', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.RED_FLOWER, count: 4 }, output: { id: BLOCK.EMERALD, count: 1 } },
  { id: 'bread', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.EMERALD, count: 1 }, output: { id: BLOCK.BREAD, count: 3 } },
  { id: 'pork', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.COOKED_PORK, count: 3 }, output: { id: BLOCK.EMERALD, count: 2 } },
  { id: 'rabbit', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.COOKED_RABBIT, count: 3 }, output: { id: BLOCK.EMERALD, count: 2 } },

  // Blacksmith
  { id: 'iron', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 3 }, output: { id: BLOCK.IRON_INGOT, count: 2 } },
  { id: 'coal', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.COAL, count: 8 }, output: { id: BLOCK.EMERALD, count: 1 } },
  { id: 'iron-sword', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 6 }, output: { id: BLOCK.IRON_SWORD, count: 1 } },
  { id: 'iron-pickaxe', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 6 }, output: { id: BLOCK.IRON_PICKAXE, count: 1 } },
  { id: 'iron-axe', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 6 }, output: { id: BLOCK.IRON_AXE, count: 1 } },

  // Toolsmith
  { id: 'diamond', job: VILLAGER_JOBS.TOOLSMITH, input: { id: BLOCK.EMERALD, count: 12 }, output: { id: BLOCK.DIAMOND, count: 1 } },
  { id: 'emerald-helmet', job: VILLAGER_JOBS.TOOLSMITH, input: { id: BLOCK.EMERALD, count: 8 }, output: { id: BLOCK.EMERALD_HELMET, count: 1 } },
  { id: 'emerald-chest', job: VILLAGER_JOBS.TOOLSMITH, input: { id: BLOCK.EMERALD, count: 14 }, output: { id: BLOCK.EMERALD_CHEST, count: 1 } },
  { id: 'diamond-sword', job: VILLAGER_JOBS.TOOLSMITH, input: { id: BLOCK.DIAMOND, count: 3 }, output: { id: BLOCK.DIAMOND_SWORD, count: 1 } },
  { id: 'diamond-pickaxe', job: VILLAGER_JOBS.TOOLSMITH, input: { id: BLOCK.DIAMOND, count: 4 }, output: { id: BLOCK.DIAMOND_PICKAXE, count: 1 } },

  // Map Creator
  { id: 'rainbow-gem', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.EMERALD, count: 20 }, output: { id: BLOCK.RAINBOW_GEM, count: 1 } },
  { id: 'paper-trade', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.WHEAT, count: 20 }, output: { id: BLOCK.EMERALD, count: 1 } },
  { id: 'pearl-trade', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.ENDER_PEARL, count: 1 }, output: { id: BLOCK.EMERALD, count: 5 } },
  { id: 'bamboo-trade', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.BAMBOO, count: 10 }, output: { id: BLOCK.EMERALD, count: 1 } },
  { id: 'map', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.EMERALD, count: 5 }, output: { id: BLOCK.MAP, count: 1 } },
  { id: 'mansion-map', job: VILLAGER_JOBS.MAP_CREATOR, input: { id: BLOCK.EMERALD, count: 10 }, output: { id: BLOCK.MANSION_MAP, count: 1 } },
];

export function canFitTradeOutput(inventory, output) {
  const matchingSpace = inventory.slots.reduce((sum, slot) => sum + (slot.id === output.id ? Math.max(0, 64 - slot.count) : 0), 0);
  const emptySlots = inventory.slots.reduce((sum, slot) => sum + (slot.id === BLOCK.AIR ? 64 : 0), 0);
  return matchingSpace + emptySlots >= output.count;
}

export function canMakeTrade(inventory, offer) {
  return inventory.countOf(offer.input.id) >= offer.input.count && canFitTradeOutput(inventory, offer.output);
}

// Atomic transaction: insufficient payment or reward capacity leaves the inventory unchanged.
export function executeTrade(inventory, offer) {
  if (!canMakeTrade(inventory, offer)) return false;
  if (!inventory.remove(offer.input.id, offer.input.count)) return false;
  return inventory.add(offer.output.id, offer.output.count) === 0;
}
