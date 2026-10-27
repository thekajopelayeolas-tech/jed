// Farming, food, chickens, and village guards. Each check is labelled, and the file exits non-zero on failure.
import { World } from '../src/world.js';
import { DropManager } from '../src/drops.js';
import { Inventory } from '../src/inventory.js';
import { Mob, MobManager, MOB } from '../src/mobs.js';
import { BLOCK, isItem, BLOCK_DEFS } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import { FOOD_POINTS } from '../src/hunger.js';
import { SMELT } from '../src/smelting.js';
import { matchRecipe, RECIPES } from '../src/inventory.js';
import { CATEGORIES, categoryOf } from '../src/recipe-book.js';
import { villageCentre, farmCells, penCells } from '../src/village.js';
import { surfaceHeight } from '../src/chunk.js';
import { itemPixels } from '../src/item-icons.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const SEED = 1337;

// A chicken is a passive mob that drops raw chicken and an egg.
const chicken = new Mob(scene, new World(scene, SEED, {}, {}), MOB.CHICKEN, 8.5, 60, 8.5);
check('a chicken is passive (not hostile)', chicken.def.hostile === false);
check('a chicken drops raw chicken and an egg', chicken.def.drops.includes(BLOCK.RAW_CHICKEN) && chicken.def.drops.includes(BLOCK.EGG));

// Killing a chicken spawns its meat and egg, and both are picked up.
{
  const w = new World(scene, SEED, {}, {});
  w.update(8, 8, 2, 25);
  const drops = new DropManager(scene, w, {});
  const inv = new Inventory();
  const c = new Mob(scene, w, MOB.CHICKEN, 8.5, 60, 8.5);
  c.takeHit(100, 0, 0);
  for (const id of c.def.drops) drops.spawn(id, c.pos.x, c.pos.y, c.pos.z);
  const at = new THREE.Vector3(drops.items[0].pos.x, drops.items[0].pos.y, drops.items[0].pos.z);
  for (let t = 0; t < 4; t += 1 / 60) drops.update(1 / 60, at, inv);
  check('a killed chicken gives raw chicken', inv.countOf(BLOCK.RAW_CHICKEN) === 1);
  check('a killed chicken gives an egg', inv.countOf(BLOCK.EGG) === 1);
}

// Raw chicken cooks in a furnace, and the cooked meat feeds the player.
check('raw chicken smelts into cooked chicken', SMELT[BLOCK.RAW_CHICKEN] === BLOCK.COOKED_CHICKEN);
check('cooked chicken restores hunger', (FOOD_POINTS[BLOCK.COOKED_CHICKEN] ?? 0) > 0);

// Wheat: nine wheat make one wheat block, and one wheat block gives back nine wheat.
const grid = (rows) => {
  const out = Array(9).fill(0);
  rows.forEach((row, r) => row.forEach((id, c) => { out[r * 3 + c] = id; }));
  return out;
};
const W = BLOCK.WHEAT, WB = BLOCK.WHEAT_BLOCK;
check('nine wheat make a wheat block', matchRecipe(grid([[W, W, W], [W, W, W], [W, W, W]]), 3)?.result === WB);
check('a wheat block makes nine wheat', RECIPES.some((r) => r.result === W && r.count === 9 && r.key.W === WB));
check('bread is made from wheat', matchRecipe(grid([[W, W, W]]), 3)?.result === BLOCK.BREAD);

// Food & Drinks: the new food items are in their own recipe category.
check('bread is in Food & Drinks', categoryOf(BLOCK.BREAD) === 'Food & Drinks');
check('the Food & Drinks category exists', CATEGORIES.some((c) => c.name === 'Food & Drinks'));

// The wheat block is a placeable block with a texture, and the food items are items.
check('wheat block is placeable (not an item)', !isItem(WB) && BLOCK_DEFS[WB].solid === true);
check('wheat block has a texture', !!BLOCK_TILES[WB]);
for (const id of [BLOCK.WHEAT, BLOCK.BREAD, BLOCK.CAKE, BLOCK.COOKIES, BLOCK.STEW, BLOCK.RAW_CHICKEN, BLOCK.COOKED_CHICKEN, BLOCK.EGG]) {
  check(`${BLOCK_DEFS[id].name} is an item with a sprite`, isItem(id) && !!itemPixels(id));
}

// Villages get farm plots (wheat blocks on planks) and an animal pen (a planks fence).
const farm = farmCells(60);
check('a farm has wheat blocks on planks', farm.some((c) => c.id === WB) && farm.some((c) => c.id === BLOCK.PLANKS));
check('the animal pen is a planks fence', penCells(60).every((c) => c.id === BLOCK.PLANKS));

// Iron golems: a golem is peaceful until a villager is hit, then it turns on the player.
const golemDef = new Mob(scene, new World(scene, SEED, {}, {}), MOB.IRON_GOLEM, 0, 60, 0).def;
check('an iron golem has 30 health', golemDef.health === 30);
check('an iron golem is not hostile by default', golemDef.hostile === false);
{
  const w = new World(scene, SEED, {}, {});
  const mm = new MobManager(scene, w, SEED);
  const home = { x: 100, z: 100 };
  const villager = new Mob(scene, w, MOB.VILLAGER, 100, 60, 100);
  villager.home = home;
  const golem = new Mob(scene, w, MOB.IRON_GOLEM, 103, 60, 100);
  golem.home = home;
  const otherGolem = new Mob(scene, w, MOB.IRON_GOLEM, 300, 60, 300);
  otherGolem.home = { x: 300, z: 300 };
  mm.mobs.push(villager, golem, otherGolem);
  check('a golem starts calm', golem.angry === false);
  mm.angerGolemsOf(villager);
  check('hitting a villager angers its village golem', golem.angry === true);
  check('a golem of another village stays calm', otherGolem.angry === false);
  let hits = 0;
  let damage = 0;
  // The player stands next to the golem, inside its strike range.
  golem.update(0.1, new THREE.Vector3(103.5, 60, 100), (m, d) => { hits++; damage = d; });
  check('an angry golem strikes the player with 7 damage', hits === 1 && damage === 7);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
