import { facingToward, FACING } from '../src/facing.js';
import { partOffsets } from '../src/building.js';
import { BLOCK, BLOCK_DEFS, TOOL, TOOL_ITEMS, isItem } from '../src/blocks.js';
import { RECIPES } from '../src/inventory.js';
import { BLOCK_TILES } from '../src/textures.js';
import { itemPixels } from '../src/item-icons.js';
import { breakTime, canHarvest, attackDamage } from '../src/mining.js';
import { boatSpotAt, nextBoatPosition, BOAT_ID } from '../src/boat.js';
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

// ---- Shovels are back as a tool class, and they dig grass, dirt and sand ----
check('the shovel tool class exists', TOOL.SHOVEL === 'shovel');
check('a shovel is made by a recipe', RECIPES.some((r) => r.result === BLOCK.IRON_SHOVEL));
check('grass, dirt and sand break faster with a shovel than bare-handed',
  [BLOCK.GRASS, BLOCK.DIRT, BLOCK.SAND].every((id) => breakTime(id, BLOCK.IRON_SHOVEL) < breakTime(id, 0)));

// ---- Boats ----
check('the boat is an item with an id', BOAT_ID === 85 && isItem(BLOCK.BOAT));
check('a boat has a name and a sprite', BLOCK_DEFS[BLOCK.BOAT].name === 'Boat' && !!itemPixels(BLOCK.BOAT));
check('a boat has a recipe made from planks', RECIPES.some((r) => r.result === BLOCK.BOAT && r.key.P === BLOCK.PLANKS));

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
// A boat can be placed anywhere it has room: on land, on a block, or on water. These cells are in the loaded area
// around (8, 8), since writes outside loaded chunks are refused.
const bx = 8, bz = 8;
w.setBlock(bx, 60, bz, BLOCK.STONE);
w.setBlock(bx, 61, bz, BLOCK.AIR);
w.setBlock(bx, 62, bz, BLOCK.AIR);
check('a boat places on land (the ground cell below)', boatSpotAt(w, bx, 61, bz) !== null);
check('a boat placed on land sits where it was aimed', boatSpotAt(w, bx, 61, bz).y === 61);

// On water: aimed at the air cell above the surface, the boat sits there.
w.setBlock(bx + 1, 60, bz, BLOCK.WATER);
w.setBlock(bx + 1, 61, bz, BLOCK.AIR);
w.setBlock(bx + 1, 62, bz, BLOCK.AIR);
check('a boat places on water', boatSpotAt(w, bx + 1, 61, bz) !== null);
// Aimed into the water itself: the boat climbs to the surface above it.
check('aimed into water, the boat sits on the surface', boatSpotAt(w, bx + 1, 60, bz).y === 61);

// A boat does not place where there is no room above it.
w.setBlock(bx + 2, 60, bz, BLOCK.STONE);
w.setBlock(bx + 2, 61, bz, BLOCK.AIR);
w.setBlock(bx + 2, 62, bz, BLOCK.STONE);
check('no boat where the cell above is blocked', boatSpotAt(w, bx + 2, 61, bz) === null);

// A boat does not hang in the air with nothing under it.
w.setBlock(bx + 3, 59, bz, BLOCK.AIR);
w.setBlock(bx + 3, 60, bz, BLOCK.AIR);
w.setBlock(bx + 3, 61, bz, BLOCK.AIR);
check('no boat over empty air', boatSpotAt(w, bx + 3, 61, bz) === null);

// Riding: a boat moves only over water, and stops at the shore.
// A pond of water, and dry land beside it, inside the loaded area.
for (let x = 0; x <= 3; x++) w.setBlock(x, 60, 0, BLOCK.WATER);
for (let x = 0; x <= 3; x++) w.setBlock(x, 60, 3, BLOCK.STONE);
// A boat on the water at (1.5, 61, 0.5) moves along the water when pushed east (yaw points -x, so use -PI/2).
const moved = nextBoatPosition(w, { x: 1.5, y: 61, z: 0.5 }, -Math.PI / 2, 0.1);
check('a boat moves across water', moved !== null);
// Yaw PI heads toward +z. The pond is z = 0 and the land starts at z = 3, so the boat is stopped before the shore
// and cannot move onto the land.
const shore = nextBoatPosition(w, { x: 1.5, y: 61, z: 0.5 }, Math.PI, 10);
check('a boat does not move onto land', shore === null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
