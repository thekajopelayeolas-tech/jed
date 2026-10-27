import { allRecipes, categoryOf, CATEGORIES } from '../src/recipe-book.js';
import { RECIPES } from '../src/inventory.js';
import { BUILD, DOOR } from '../src/building.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const recipes = allRecipes();

// The door recipe is in the book and sorted under a real category, not 'Other'.
const door = recipes.find((r) => r.result === DOOR.DOOR);
check('the door recipe is in the recipe book', !!door);
check('the door recipe is named Door', door?.resultName === 'Door');
check('the door recipe is under Basics and doors', door?.category === 'Basics and doors');

// Every recipe has a category from the list, so none is left as 'Other'.
const names = new Set(CATEGORIES.map((c) => c.name));
check('no recipe falls into Other', recipes.every((r) => names.has(r.category)));

// Tools, armour, and building blocks each go to their own category.
check('a pickaxe is a tool', categoryOf(BLOCK.WOODEN_PICKAXE) === 'Tools');
// Shovels were removed, so no recipe makes one, and the shovel ids are not items any more.
check('no recipe makes a shovel', RECIPES.every((r) => !/SHOVEL/.test(Object.keys(BLOCK).find((k) => BLOCK[k] === r.result) ?? '')));
check('a helmet is armour', categoryOf(BLOCK.IRON_HELMET) === 'Armour');
check('a stone slab is a building block', categoryOf(BUILD.STONE_SLAB) === 'Building');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
