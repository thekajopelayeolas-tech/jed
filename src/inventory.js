import { BLOCK, BLOCK_DEFS } from './blocks.js';

export const HOTBAR_SIZE = 9;
export const INV_SIZE = 36;

// Recipes: pattern is an array of rows using ' ' for empty. Keys map to item ids.
// Shapeless recipes list ingredients as counts.
export const RECIPES = [
  { result: BLOCK.PLANKS, count: 4, shaped: true, pattern: ['W'], key: { W: BLOCK.WOOD } },
  { result: BLOCK.CRAFTING_TABLE, count: 1, shaped: true, pattern: ['PP', 'PP'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.TORCH, count: 4, shaped: true, pattern: ['C', 'S'], key: { C: BLOCK.COAL, S: BLOCK.STICK } },
  { result: BLOCK.GLASS, count: 1, shaped: true, pattern: ['SS', 'SS'], key: { S: BLOCK.SAND } },
  { result: BLOCK.STICK, count: 4, shaped: true, pattern: ['P', 'P'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.BED, count: 1, shaped: true, pattern: ['WWW', 'PPP'], key: { W: BLOCK.WOOL, P: BLOCK.PLANKS } },
  // Wooden tools (planks + sticks).
  { result: BLOCK.WOODEN_PICKAXE, count: 1, shaped: true, pattern: ['PPP', ' S ', ' S '], key: { P: BLOCK.PLANKS, S: BLOCK.STICK } },
  { result: BLOCK.WOODEN_AXE, count: 1, shaped: true, pattern: ['PP', 'PS', ' S'], key: { P: BLOCK.PLANKS, S: BLOCK.STICK } },
  { result: BLOCK.WOODEN_SWORD, count: 1, shaped: true, pattern: ['P', 'P', 'S'], key: { P: BLOCK.PLANKS, S: BLOCK.STICK } },
  // Stone tools (cobblestone + sticks).
  { result: BLOCK.STONE_PICKAXE, count: 1, shaped: true, pattern: ['CCC', ' S ', ' S '], key: { C: BLOCK.COBBLESTONE, S: BLOCK.STICK } },
  { result: BLOCK.STONE_AXE, count: 1, shaped: true, pattern: ['CC', 'CS', ' S'], key: { C: BLOCK.COBBLESTONE, S: BLOCK.STICK } },
  { result: BLOCK.STONE_SWORD, count: 1, shaped: true, pattern: ['C', 'C', 'S'], key: { C: BLOCK.COBBLESTONE, S: BLOCK.STICK } },
  // Iron tools (iron ingots + sticks).
  { result: BLOCK.IRON_PICKAXE, count: 1, shaped: true, pattern: ['III', ' S ', ' S '], key: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK } },
  { result: BLOCK.IRON_SWORD, count: 1, shaped: true, pattern: ['I', 'I', 'S'], key: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK } },
];

// Items are {id, count}. Returns a 2D grid recipe match or null.
export function matchRecipe(grid, size) {
  // grid is a flat array of ids (0 for empty), length size*size.
  const filled = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r * size + c] !== BLOCK.AIR) filled.push({ r, c, id: grid[r * size + c] });
    }
  }
  if (filled.length === 0) return null;
  const minR = Math.min(...filled.map((f) => f.r));
  const minC = Math.min(...filled.map((f) => f.c));
  const maxR = Math.max(...filled.map((f) => f.r));
  const maxC = Math.max(...filled.map((f) => f.c));

  for (const recipe of RECIPES) {
    const rows = recipe.pattern.length;
    const cols = recipe.pattern[0].length;
    if (maxR - minR + 1 !== rows || maxC - minC + 1 !== cols) continue;
    let ok = true;
    for (let r = 0; r < rows && ok; r++) {
      for (let c = 0; c < cols && ok; c++) {
        const ch = recipe.pattern[r][c];
        const id = grid[(minR + r) * size + (minC + c)];
        if (ch === ' ') { if (id !== BLOCK.AIR) ok = false; }
        else if (recipe.key[ch] !== id) ok = false;
      }
    }
    if (ok) return recipe;
  }
  return null;
}

export class Inventory {
  constructor() {
    this.slots = new Array(INV_SIZE).fill(null).map(() => ({ id: BLOCK.AIR, count: 0 }));
    this.selected = 0;
  }

  get selectedItem() {
    return this.slots[this.selected];
  }

  // Adds items, stacking up to 64. Returns the number that did not fit.
  add(id, count = 1) {
    if (id === BLOCK.AIR) return 0;
    let remaining = count;
    for (const s of this.slots) {
      if (s.id === id && s.count < 64) {
        const take = Math.min(64 - s.count, remaining);
        s.count += take;
        remaining -= take;
        if (remaining === 0) return 0;
      }
    }
    for (const s of this.slots) {
      if (s.id === BLOCK.AIR) {
        const take = Math.min(64, remaining);
        s.id = id;
        s.count = take;
        remaining -= take;
        if (remaining === 0) return 0;
      }
    }
    return remaining;
  }

  consumeSelected(n = 1) {
    const s = this.selectedItem;
    if (s.id === BLOCK.AIR) return false;
    s.count -= n;
    if (s.count <= 0) { s.id = BLOCK.AIR; s.count = 0; }
    return true;
  }

  // Removes count of an item type across all slots. Returns true if fully removed.
  remove(id, count) {
    let have = 0;
    for (const s of this.slots) if (s.id === id) have += s.count;
    if (have < count) return false;
    let left = count;
    for (const s of this.slots) {
      if (s.id !== id || left === 0) continue;
      const take = Math.min(s.count, left);
      s.count -= take;
      left -= take;
      if (s.count === 0) s.id = BLOCK.AIR;
    }
    return true;
  }

  countOf(id) {
    let n = 0;
    for (const s of this.slots) if (s.id === id) n += s.count;
    return n;
  }

  // Returns the recipe result for crafting grid input, or null.
  craft(grid, size) {
    const recipe = matchRecipe(grid, size);
    if (!recipe) return null;
    return { id: recipe.result, count: recipe.count };
  }

  label(id) {
    return BLOCK_DEFS[id]?.name ?? '';
  }
}
