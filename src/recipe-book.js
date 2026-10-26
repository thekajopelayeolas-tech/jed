// Recipe book logic. Pure functions with no DOM or three.js, so tests run in Node.
// Every recipe comes from RECIPES in inventory.js, so the book always matches the crafting grid.
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { RECIPES } from './inventory.js';

// Per-recipe ingredients as { id, count }, counted from the pattern. Each pattern cell uses one item.
export function recipeIngredients(recipe) {
  const counts = new Map();
  for (const row of recipe.pattern) {
    for (const ch of row) {
      if (ch === ' ') continue;
      const id = recipe.key[ch];
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts].map(([id, count]) => ({ id, count }));
}

// Every recipe, in the order they are defined, with its ingredients and result. The book shows them all.
// Each entry keeps the raw RECIPES shape: `result` is the item id and `count` is how many it makes.
export function allRecipes() {
  return RECIPES.map((r, index) => ({
    index,
    result: r.result,
    count: r.count,
    resultName: BLOCK_DEFS[r.result]?.name ?? 'Unknown',
    pattern: r.pattern,
    key: r.key,
    ingredients: recipeIngredients(r),
  }));
}

// For each ingredient, how many the inventory holds and whether that is enough. Used to colour the book.
export function ingredientStatus(recipe, inventory) {
  return recipeIngredients(recipe).map((need) => {
    const have = inventory.countOf(need.id);
    return { ...need, have, ok: have >= need.count };
  });
}

// True when the inventory holds every ingredient at least once.
export function canCraft(recipe, inventory) {
  return ingredientStatus(recipe, inventory).every((s) => s.ok);
}

// Crafts one of the recipe's results from the inventory. Consumes exactly the ingredients and adds the result.
// Returns true on success. If the result does not fit in the inventory, nothing is taken.
export function craftOnce(recipe, inventory) {
  if (!canCraft(recipe, inventory)) return false;
  // Check that the result fits before taking anything, so no ingredients are lost.
  if (!canFit(inventory, recipe.result, recipe.count)) return false;
  for (const need of recipeIngredients(recipe)) {
    inventory.remove(need.id, need.count);
  }
  inventory.add(recipe.result, recipe.count);
  return true;
}

// True if `count` items of `id` fit in the inventory without leaving anything behind.
// Free space is the empty slots plus the room left in matching stacks.
export function canFit(inventory, id, count) {
  const STACK = 64;
  let room = 0;
  for (const s of inventory.slots) {
    if (s.id === BLOCK.AIR) room += STACK;
    else if (s.id === id) room += STACK - s.count;
  }
  return room >= count;
}

// Crafts as many of a recipe as the inventory allows, one at a time. Returns how many were made.
export function craftMax(recipe, inventory) {
  let made = 0;
  while (craftOnce(recipe, inventory)) made += 1;
  return made;
}
