import { BLOCK, BLOCK_DEFS, isItem, isSolid } from '../src/blocks.js';
import { BED_FOOT } from '../src/building.js';
import { BLOCK_TILES, tileImageData } from '../src/textures.js';
import { RECIPES } from '../src/inventory.js';
import { blockInfo, breakTime } from '../src/mining.js';
import { World } from '../src/world.js';
import { FACING } from '../src/facing.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The foot is its own placeable block, solid, with an all-red texture and a definition.
check('the bed foot id is 80, a new id', BED_FOOT === 80);
check('the bed foot is a placeable block, not an item', !isItem(BED_FOOT));
check('the bed foot is solid', isSolid(BED_FOOT));
check('the bed foot has a definition named Bed Foot', BLOCK_DEFS[BED_FOOT]?.name === 'Bed Foot');
check('the bed foot has a texture', !!BLOCK_TILES[BED_FOOT]);
check('the bed foot is mined like the bed', blockInfo(BED_FOOT).hardness === blockInfo(BLOCK.BED).hardness);
check('the bed foot breaks in the same time as the bed', breakTime(BED_FOOT, 0) === breakTime(BLOCK.BED, 0));

// The foot's texture is all red: its average pixel is much redder than green or blue.
{
  const data = tileImageData(BLOCK_TILES[BED_FOOT].top);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  check('the bed foot texture is all red', r / n > 2 * (g / n) && r / n > 2 * (b / n));
}

// The bed's head and foot have different textures: the head has a white pillow, the foot is all red.
check('the foot texture differs from the head texture', BLOCK_TILES[BED_FOOT].top !== BLOCK_TILES[BLOCK.BED].top);

// Crafting still makes a bed (the head), never a bed foot.
const bedRecipe = RECIPES.find((r) => r.result === BLOCK.BED);
check('the bed recipe still makes the bed head', !!bedRecipe);
check('no recipe makes the bed foot', RECIPES.every((r) => r.result !== BED_FOOT));

// Placing a bed writes the head and an all-red foot, and breaking the foot clears both.
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
const x = 8, y = 80, z = 8;
w.setBlock(x, y - 1, z, BLOCK.STONE);
w.setBlock(x, y, z, BLOCK.AIR);
w.setBlock(x + 1, y, z, BLOCK.AIR);
check('a bed places with its head and foot', w.placeWhole(x, y, z, BLOCK.BED, FACING.EAST));
check('the head is the bed block', w.getBlock(x, y, z) === BLOCK.BED);
check('the foot is the bed foot block', w.getBlock(x + 1, y, z) === BED_FOOT);
const broke = w.breakWhole(x + 1, y, z);
check('breaking the foot clears the head too', broke.length === 2);
check('the head is gone after breaking the foot', w.getBlock(x, y, z) === BLOCK.AIR);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
