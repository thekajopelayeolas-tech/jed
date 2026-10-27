import { BLOCK, BLOCK_DEFS, TOOL, TOOL_ITEMS, isItem } from '../src/blocks.js';
import { RECIPES } from '../src/inventory.js';
import { BLOCK_TILES } from '../src/textures.js';
import { itemPixels } from '../src/item-icons.js';
import { breakTime, canHarvest } from '../src/mining.js';
import { Mob, MOB } from '../src/mobs.js';
import { useBucket } from '../src/utilities.js';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// ---- Every new item exists: a name, a sprite, and a recipe ----
const newItems = {
  'wooden shovel': BLOCK.WOODEN_SHOVEL, 'stone shovel': BLOCK.STONE_SHOVEL, 'iron shovel': BLOCK.IRON_SHOVEL,
  'wooden hoe': BLOCK.WOODEN_HOE, 'stone hoe': BLOCK.STONE_HOE, 'iron hoe': BLOCK.IRON_HOE,
  bucket: BLOCK.BUCKET, 'water bucket': BLOCK.WATER_BUCKET, shears: BLOCK.SHEARS,
};
for (const [name, id] of Object.entries(newItems)) {
  check(`${name} is an item with a name and sprite`, isItem(id) && !!BLOCK_DEFS[id]?.name && !!itemPixels(id));
  // A water bucket is made by filling an empty bucket from water, so it has no crafting recipe of its own.
  if (id !== BLOCK.WATER_BUCKET) check(`${name} has a recipe`, RECIPES.some((r) => r.result === id));
}
check('a water bucket has no recipe, it comes from filling a bucket', !RECIPES.some((r) => r.result === BLOCK.WATER_BUCKET));

// ---- Shovels dig grass, dirt, sand; they are faster than bare hands. Wood and stone tiers rise. ----
check('shovels have the shovel class', [BLOCK.WOODEN_SHOVEL, BLOCK.STONE_SHOVEL, BLOCK.IRON_SHOVEL].every((id) => TOOL_ITEMS[id].tool === TOOL.SHOVEL));
check('an iron shovel digs dirt faster than a wooden one', breakTime(BLOCK.DIRT, BLOCK.IRON_SHOVEL) < breakTime(BLOCK.DIRT, BLOCK.WOODEN_SHOVEL));

// ---- Hoes break leaves faster than bare hands ----
check('hoes have the hoe class', [BLOCK.WOODEN_HOE, BLOCK.STONE_HOE, BLOCK.IRON_HOE].every((id) => TOOL_ITEMS[id].tool === TOOL.HOE));
check('a hoe breaks leaves faster than a bare hand', breakTime(BLOCK.LEAVES, BLOCK.IRON_HOE) < breakTime(BLOCK.LEAVES, 0));
check('a hoe is a weak weapon (1 damage)', TOOL_ITEMS[BLOCK.IRON_HOE].damage === 1);

// ---- Shears: sheep give 2 wool when sheared, and the sheep lives ----
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
const sheep = new Mob(scene, w, MOB.SHEEP, 8.5, 60, 8.5);
check('shearing a sheep gives 2 wool', sheep.shear() === 2);
check('the sheep is still alive after shearing', sheep.dead === false && sheep.health > 0);
check('a sheared sheep cannot be sheared again straight away', sheep.shear() === 0);
const cow = new Mob(scene, w, MOB.COW, 8.5, 60, 8.5);
check('shears do nothing to a cow', cow.shear() === 0);
// Wool grows back after the regrow time, and then the sheep can be sheared again.
for (let t = 0; t < 70; t += 1) sheep.update(1, sheep.pos, 0.5, () => {});
check('the wool grows back after time', sheep.sheared === false);
check('a regrown sheep can be sheared again', sheep.shear() === 2);

// Killing a sheep still drops mutton and wool, as before shears.
const killed = new Mob(scene, w, MOB.SHEEP, 8.5, 60, 8.5);
check('a sheep killed still drops wool and mutton', killed.def.drops.includes(BLOCK.WOOL) && killed.def.drops.includes(BLOCK.RAW_MUTTON));

// ---- Buckets: an empty bucket fills from water; a water bucket pours water and gives the bucket back ----
const bw = new World(scene, 1337, {}, {});
bw.update(8, 8, 2, 25);
bw.setBlock(8, 80, 8, BLOCK.WATER);
const filled = useBucket(bw, BLOCK.BUCKET, 8, 80, 8, null);
check('an empty bucket fills from a water block', filled !== null && filled.item === BLOCK.WATER_BUCKET);
check('the water is taken out of the world', bw.getBlock(8, 80, 8) === BLOCK.AIR);
check('an empty bucket does nothing on land', useBucket(bw, BLOCK.BUCKET, 8, 80, 9, null) === null);
const poured = useBucket(bw, BLOCK.WATER_BUCKET, 0, 0, 0, { x: 9, y: 80, z: 8 });
check('a water bucket pours water into a free cell', poured !== null && poured.item === BLOCK.BUCKET && poured.placed);
check('the poured water is in the world', bw.getBlock(9, 80, 8) === BLOCK.WATER);
bw.setBlock(10, 80, 8, BLOCK.STONE);
check('a water bucket does not pour into a solid block', useBucket(bw, BLOCK.WATER_BUCKET, 0, 0, 0, { x: 10, y: 80, z: 8 }) === null);
check('a bucket only holds water (cannot fill from stone)', useBucket(bw, BLOCK.BUCKET, 10, 80, 8, null) === null);

// ---- Aiming a bucket at water: a normal ray passes over water, a bucket's ray (stopOnWater) stops on it ----
{
  const aw = new World(scene, 1337, {}, {});
  aw.update(8, 8, 2, 25);
  // A water cell at (8, 80, 8), with air around it. A ray from above-and-west, looking east and down, passes through it.
  aw.setBlock(8, 80, 8, BLOCK.WATER);
  aw.setBlock(8, 79, 8, BLOCK.STONE);
  const origin = { x: 6.5, y: 80.5, z: 8.5 };
  const dir = { x: 1, y: 0, z: 0 };
  const normal = aw.raycast(origin, dir, 6);
  const bucketRay = aw.raycast(origin, dir, 6, true);
  check('a normal ray skips over water', normal === null || normal.id !== BLOCK.WATER);
  check('a bucket ray stops on the water it is aimed at', bucketRay !== null && bucketRay.id === BLOCK.WATER && bucketRay.block.x === 8);
  const filled2 = useBucket(aw, BLOCK.BUCKET, bucketRay.block.x, bucketRay.block.y, bucketRay.block.z, null);
  check('the bucket fills from the water the ray found', filled2 !== null && filled2.item === BLOCK.WATER_BUCKET);
}


console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
