import { facingToward, FACING } from '../src/facing.js';
import { partOffsets } from '../src/building.js';
import { BLOCK, BLOCK_DEFS, TOOL, TOOL_ITEMS, isItem } from '../src/blocks.js';
import { RECIPES } from '../src/inventory.js';
import { BLOCK_TILES } from '../src/textures.js';
import { itemPixels } from '../src/item-icons.js';
import { breakTime, canHarvest, attackDamage } from '../src/mining.js';
import { canFloatAt, nextBoatPosition, BOAT_ID } from '../src/boat.js';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// ---- Bed: the head is the cell nearest the player, the foot is further away ----
// The game places a bed with facing toward the player, then flips it by 2 so the foot lands away from them.
const placedFacing = (head, player) => (facingToward(head.x, head.z, player.x, player.z) + 2) & 3;
const dist = (ax, az, bx, bz, p) => Math.hypot(ax + 0.5 - p.x, az + 0.5 - p.z);
const cases = [
  { name: 'player to the west', head: { x: 5, z: 0 }, player: { x: 0.5, z: 0.5 } },
  { name: 'player to the east', head: { x: 0, z: 0 }, player: { x: 6.5, z: 0.5 } },
  { name: 'player to the north', head: { x: 0, z: 5 }, player: { x: 0.5, z: 0.5 } },
  { name: 'player to the south', head: { x: 0, z: 0 }, player: { x: 0.5, z: 6.5 } },
];
for (const c of cases) {
  const f = placedFacing(c.head, c.player);
  const off = partOffsets(BLOCK.BED, f)[0];
  const headD = dist(c.head.x, c.head.z, 0, 0, c.player);
  const footD = dist(c.head.x + off.dx, c.head.z + off.dz, 0, 0, c.player);
  check(`bed with the ${c.name}: head is nearer the player than the foot`, headD < footD);
}

// ---- Diamond tools ----
check('a diamond pickaxe is tier 4 (top tier)', TOOL_ITEMS[BLOCK.DIAMOND_PICKAXE].tier === 4);
check('a diamond pickaxe mines the rainbow ore that needs a diamond-level tool', canHarvest(BLOCK.RAINBOW_ORE, BLOCK.DIAMOND_PICKAXE));
check('a diamond pickaxe mines faster than an iron pickaxe', breakTime(BLOCK.STONE, BLOCK.DIAMOND_PICKAXE) < breakTime(BLOCK.STONE, BLOCK.IRON_PICKAXE));
check('a diamond sword does more damage than an iron sword', attackDamage(BLOCK.DIAMOND_SWORD) > attackDamage(BLOCK.IRON_SWORD));
check('a diamond tool is an item, not a block', isItem(BLOCK.DIAMOND_PICKAXE) && isItem(BLOCK.DIAMOND_AXE) && isItem(BLOCK.DIAMOND_SWORD));
for (const [name, id] of [['pickaxe', BLOCK.DIAMOND_PICKAXE], ['axe', BLOCK.DIAMOND_AXE], ['sword', BLOCK.DIAMOND_SWORD]]) {
  check(`the diamond ${name} has a name and a sprite`, !!BLOCK_DEFS[id]?.name && !!itemPixels(id));
  check(`the diamond ${name} has a recipe`, RECIPES.some((r) => r.result === id));
}
const diamondRecipe = RECIPES.find((r) => r.result === BLOCK.DIAMOND_PICKAXE);
check('the diamond pickaxe is made from diamonds and sticks', diamondRecipe.key.D === BLOCK.DIAMOND && diamondRecipe.key.S === BLOCK.STICK);

// ---- Shovels are gone ----
check('no recipe makes a shovel', RECIPES.every((r) => !TOOL_ITEMS[r.result] || TOOL_ITEMS[r.result].tool !== 'shovel'));
check('the shovel tool class is removed', TOOL.SHOVEL === undefined);
check('grass, dirt and sand still mine with the dig class', [BLOCK.GRASS, BLOCK.DIRT, BLOCK.SAND].every((id) => breakTime(id, 0) > 0));

// ---- Boats ----
check('the boat is an item with an id', BOAT_ID === 85 && isItem(BLOCK.BOAT));
check('a boat has a name and a sprite', BLOCK_DEFS[BLOCK.BOAT].name === 'Boat' && !!itemPixels(BLOCK.BOAT));
check('a boat has a recipe made from planks', RECIPES.some((r) => r.result === BLOCK.BOAT && r.key.P === BLOCK.PLANKS));

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
// A water cell with air above floats a boat; a dry cell or a blocked cell does not.
w.setBlock(20, 60, 20, BLOCK.WATER);
w.setBlock(20, 61, 20, BLOCK.AIR);
check('a boat floats on water with air above', canFloatAt(w, 20, 60, 20));
w.setBlock(21, 60, 21, BLOCK.STONE);
check('a boat does not float on land', !canFloatAt(w, 21, 60, 21));
w.setBlock(22, 60, 22, BLOCK.WATER);
w.setBlock(22, 61, 22, BLOCK.STONE);
check('a boat does not float under a block', !canFloatAt(w, 22, 60, 22));

// Riding: a boat moves only over water, and stops at the shore.
w.setBlock(30, 60, 30, BLOCK.WATER);
w.setBlock(31, 60, 30, BLOCK.WATER);
const moved = nextBoatPosition(w, { x: 30.5, y: 61, z: 30.5 }, 0, 0.1);
check('a boat moves across water', moved !== null);
const shore = nextBoatPosition(w, { x: 30.5, y: 61, z: 30.5 }, Math.PI / 2, 10);
check('a boat does not move onto land', shore === null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
