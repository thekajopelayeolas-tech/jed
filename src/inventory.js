import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { DOOR, STORAGE } from './building.js';

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
  // Chest: a ring of eight planks around an empty centre, like the furnace pattern but in planks.
  { result: STORAGE.CHEST, count: 1, shaped: true, pattern: ['PPP', 'P P', 'PPP'], key: { P: BLOCK.PLANKS } },
  // Door: six planks in two columns of three. Makes one closed door.
  { result: DOOR.DOOR, count: 1, shaped: true, pattern: ['PP', 'PP', 'PP'], key: { P: BLOCK.PLANKS } },
  // Furnace: a ring of eight cobblestone around an empty centre.
  { result: BLOCK.FURNACE, count: 1, shaped: true, pattern: ['CCC', 'C C', 'CCC'], key: { C: BLOCK.COBBLESTONE } },
  // Shovels (one planks, cobblestone, or iron ingot on top of two sticks).
  { result: BLOCK.WOODEN_SHOVEL, count: 1, shaped: true, pattern: ['P', 'S', 'S'], key: { P: BLOCK.PLANKS, S: BLOCK.STICK } },
  { result: BLOCK.STONE_SHOVEL, count: 1, shaped: true, pattern: ['C', 'S', 'S'], key: { C: BLOCK.COBBLESTONE, S: BLOCK.STICK } },
  { result: BLOCK.IRON_SHOVEL, count: 1, shaped: true, pattern: ['I', 'S', 'S'], key: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK } },
  // Armour. Each material has a helmet, chestplate, leggings, and boots, built in the usual shapes.
  // Wood uses planks, stone uses cobblestone, iron uses ingots, and diamond uses diamonds.
  { result: BLOCK.WOODEN_HELMET, count: 1, shaped: true, pattern: ['PPP', 'P P'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.WOODEN_CHEST, count: 1, shaped: true, pattern: ['P P', 'PPP', 'PPP'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.WOODEN_LEGS, count: 1, shaped: true, pattern: ['PPP', 'P P', 'P P'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.WOODEN_BOOTS, count: 1, shaped: true, pattern: ['P P', 'P P'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.STONE_HELMET, count: 1, shaped: true, pattern: ['CCC', 'C C'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.STONE_CHEST, count: 1, shaped: true, pattern: ['C C', 'CCC', 'CCC'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.STONE_LEGS, count: 1, shaped: true, pattern: ['CCC', 'C C', 'C C'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.STONE_BOOTS, count: 1, shaped: true, pattern: ['C C', 'C C'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.IRON_HELMET, count: 1, shaped: true, pattern: ['III', 'I I'], key: { I: BLOCK.IRON_INGOT } },
  { result: BLOCK.IRON_CHEST, count: 1, shaped: true, pattern: ['I I', 'III', 'III'], key: { I: BLOCK.IRON_INGOT } },
  { result: BLOCK.IRON_LEGS, count: 1, shaped: true, pattern: ['III', 'I I', 'I I'], key: { I: BLOCK.IRON_INGOT } },
  { result: BLOCK.IRON_BOOTS, count: 1, shaped: true, pattern: ['I I', 'I I'], key: { I: BLOCK.IRON_INGOT } },
  { result: BLOCK.DIAMOND_HELMET, count: 1, shaped: true, pattern: ['DDD', 'D D'], key: { D: BLOCK.DIAMOND } },
  { result: BLOCK.DIAMOND_CHEST, count: 1, shaped: true, pattern: ['D D', 'DDD', 'DDD'], key: { D: BLOCK.DIAMOND } },
  { result: BLOCK.DIAMOND_LEGS, count: 1, shaped: true, pattern: ['DDD', 'D D', 'D D'], key: { D: BLOCK.DIAMOND } },
  { result: BLOCK.DIAMOND_BOOTS, count: 1, shaped: true, pattern: ['D D', 'D D'], key: { D: BLOCK.DIAMOND } },
  // Building blocks. Each material gets a block, slabs, and stairs.
  { result: BLOCK.STONE_BRICKS, count: 4, shaped: true, pattern: ['SS', 'SS'], key: { S: BLOCK.STONE } },
  { result: BLOCK.POLISHED_STONE, count: 4, shaped: true, pattern: ['CC', 'CC'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.BRICKS, count: 1, shaped: true, pattern: ['CC', 'CC'], key: { C: BLOCK.COBBLESTONE } },
  { result: BLOCK.CONCRETE, count: 4, shaped: true, pattern: ['SCS', 'CSC'], key: { S: BLOCK.SAND, C: BLOCK.COBBLESTONE } },
  { result: BLOCK.WOOD_SLAB, count: 6, shaped: true, pattern: ['PPP'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.STONE_SLAB, count: 6, shaped: true, pattern: ['SSS'], key: { S: BLOCK.STONE } },
  { result: BLOCK.BRICK_SLAB, count: 6, shaped: true, pattern: ['BBB'], key: { B: BLOCK.BRICKS } },
  { result: BLOCK.CONCRETE_SLAB, count: 6, shaped: true, pattern: ['CCC'], key: { C: BLOCK.CONCRETE } },
  { result: BLOCK.WOOD_STAIRS, count: 4, shaped: true, pattern: ['P  ', 'PP ', 'PPP'], key: { P: BLOCK.PLANKS } },
  { result: BLOCK.STONE_STAIRS, count: 4, shaped: true, pattern: ['S  ', 'SS ', 'SSS'], key: { S: BLOCK.STONE } },
  { result: BLOCK.BRICK_STAIRS, count: 4, shaped: true, pattern: ['B  ', 'BB ', 'BBB'], key: { B: BLOCK.BRICKS } },
  { result: BLOCK.CONCRETE_STAIRS, count: 4, shaped: true, pattern: ['C  ', 'CC ', 'CCC'], key: { C: BLOCK.CONCRETE } },
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
