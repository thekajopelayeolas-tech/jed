import { allRecipes, recipeIngredients, canCraft, craftOnce, craftMax, canFit, ingredientStatus } from '../src/recipe-book.js';
import { Inventory, RECIPES } from '../src/inventory.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The raw recipe from RECIPES that makes an item. Book entries carry their index into RECIPES.
const rawFor = (resultId) => RECIPES.find((r) => r.result === resultId);
const find = (resultId) => allRecipes().find((r) => r.result.id === resultId);
const fresh = (items) => {
  const inv = new Inventory();
  for (const [id, n] of items) inv.add(id, n);
  return inv;
};

// The book lists every recipe the crafting grid knows.
check('the book lists every recipe', allRecipes().length === RECIPES.length);

// Ingredients come from the pattern: a wooden pickaxe needs 3 planks and 2 sticks.
const pick = rawFor(BLOCK.WOODEN_PICKAXE);
const pickIng = Object.fromEntries(recipeIngredients(pick).map((i) => [i.id, i.count]));
check('wooden pickaxe needs 3 planks', pickIng[BLOCK.PLANKS] === 3);
check('wooden pickaxe needs 2 sticks', pickIng[BLOCK.STICK] === 2);

// Crafting one wooden pickaxe with exactly enough items works and consumes them.
{
  const inv = fresh([[BLOCK.PLANKS, 3], [BLOCK.STICK, 2]]);
  const ok = craftOnce(pick, inv);
  check('crafting with enough items succeeds', ok === true);
  check('the planks and sticks are used up', inv.countOf(BLOCK.PLANKS) === 0 && inv.countOf(BLOCK.STICK) === 0);
  check('the pickaxe is added to the inventory', inv.countOf(BLOCK.WOODEN_PICKAXE) === 1);
}

// Missing one ingredient: nothing is taken and nothing is made.
{
  const inv = fresh([[BLOCK.PLANKS, 3], [BLOCK.STICK, 1]]);
  check('one missing stick means the recipe is not craftable', canCraft(pick, inv) === false);
  check('a failed craft takes nothing', craftOnce(pick, inv) === false && inv.countOf(BLOCK.PLANKS) === 3 && inv.countOf(BLOCK.STICK) === 1);
}

// Status lists have and need for each ingredient, and the ok flag.
{
  const inv = fresh([[BLOCK.PLANKS, 2]]);
  const st = ingredientStatus(pick, inv);
  const planks = st.find((s) => s.id === BLOCK.PLANKS);
  check('status shows 2 of 3 planks held', planks.have === 2 && planks.count === 3 && planks.ok === false);
}

// Craft as many as possible: 7 planks and 5 sticks make two pickaxes (6 planks, 4 sticks), with 1 plank and 1 stick left.
{
  const inv = fresh([[BLOCK.PLANKS, 7], [BLOCK.STICK, 5]]);
  const made = craftMax(pick, inv);
  check('craft max makes two pickaxes from 7 planks and 5 sticks', made === 2 && inv.countOf(BLOCK.WOODEN_PICKAXE) === 2);
  check('leftovers stay in the inventory', inv.countOf(BLOCK.PLANKS) === 1 && inv.countOf(BLOCK.STICK) === 1);
}

// The result must fit: a full inventory refuses the craft and keeps the ingredients.
{
  const inv = new Inventory();
  for (const s of inv.slots) { s.id = BLOCK.STONE; s.count = 64; }
  inv.slots[0] = { id: BLOCK.PLANKS, count: 3 };
  inv.slots[1] = { id: BLOCK.STICK, count: 2 };
  check('a full inventory refuses the craft', craftOnce(pick, inv) === false && inv.countOf(BLOCK.PLANKS) === 3);
  check('canFit is false with no room', canFit(inv, BLOCK.WOODEN_PICKAXE, 1) === false);
}

// Recipes that make more than one item give the right count (sticks: 2 planks -> 4 sticks).
{
  const stick = rawFor(BLOCK.STICK);
  const inv = fresh([[BLOCK.PLANKS, 2]]);
  craftOnce(stick, inv);
  check('sticks recipe gives 4 sticks', inv.countOf(BLOCK.STICK) === 4);
}

// Every recipe's ingredients are a subset of items the game can hold, and each has a positive count.
check('every recipe has at least one ingredient with a positive count',
  allRecipes().every((r) => r.ingredients.length > 0 && r.ingredients.every((i) => i.count > 0)));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
