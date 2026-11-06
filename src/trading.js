import { BLOCK } from './blocks.js';
import { VILLAGER_JOBS } from './mobs.js';

// A selection of high-value trades for various professions.
const BETTER_ITEMS = [
  { id: BLOCK.DIAMOND, count: 1 },
  { id: BLOCK.GOLD_INGOT, count: 5 },
  { id: BLOCK.IRON_SWORD, count: 1 },
  { id: BLOCK.DIAMOND_PICKAXE, count: 1 },
  { id: BLOCK.COOKED_BEEF, count: 10 },
  { id: BLOCK.ENDER_PEARL, count: 2 },
  { id: BLOCK.OBSIDIAN, count: 3 },
  { id: BLOCK.ENCHANTING_TABLE, count: 1 }
];

const NEW_TRADES = [];
const ALL_JOBS = Object.values(VILLAGER_JOBS);
for (let i = 0; i < 200; i++) {
  const item = BETTER_ITEMS[i % BETTER_ITEMS.length];
  NEW_TRADES.push({
    id: `trade-${i}`,
    job: ALL_JOBS[i % ALL_JOBS.length],
    input: { id: BLOCK.EMERALD, count: 5 + (i % 10) },
    output: item
  });
}

// A refined village market with better, more useful trade offers.
export const VILLAGER_TRADES = [
  // Farmer (Renamed/Reorganized)
  { id: 'golden-apple', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.EMERALD, count: 10 }, output: { id: BLOCK.GOLDEN_APPLE, count: 1 } },
  { id: 'cooked-beef', job: VILLAGER_JOBS.FARMER, input: { id: BLOCK.EMERALD, count: 2 }, output: { id: BLOCK.COOKED_BEEF, count: 5 } },

  // Blacksmith
  { id: 'diamond-sword', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 15 }, output: { id: BLOCK.DIAMOND_SWORD, count: 1 } },
  { id: 'iron-block', job: VILLAGER_JOBS.BLACKSMITH, input: { id: BLOCK.EMERALD, count: 5 }, output: { id: BLOCK.IRON_BLOCK, count: 1 } },

  // Tuturmen (New Specialized Job)
  { id: 'diamond-pick', job: VILLAGER_JOBS.TUTURMEN, input: { id: BLOCK.EMERALD, count: 20 }, output: { id: BLOCK.DIAMOND_PICKAXE, count: 1 } },
  { id: 'obsidian', job: VILLAGER_JOBS.TUTURMEN, input: { id: BLOCK.EMERALD, count: 3 }, output: { id: BLOCK.OBSIDIAN, count: 2 } },
  { id: 'enchanting-table', job: VILLAGER_JOBS.TUTURMEN, input: { id: BLOCK.EMERALD, count: 30 }, output: { id: BLOCK.ENCHANTING_TABLE, count: 1 } },

  ...NEW_TRADES
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
