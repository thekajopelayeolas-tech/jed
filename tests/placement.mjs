import { World } from '../src/world.js';
import { buildChunkGeometry } from '../src/mesher.js';
import { BLOCK, isItem } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

// Items have no block texture, so the world must refuse them. Before the fix, the item id was stored
// and the mesher crashed reading BLOCK_TILES[id].side.
const someChunk = w.chunks.values().next().value;
const x = someChunk.cx * 16 + 2;
const z = someChunk.cz * 16 + 2;
const y = 60;
const before = w.getBlock(x, y, z);
check('setBlock refuses a stick (item id)', w.setBlock(x, y, z, BLOCK.STICK) === false);
check('setBlock refuses coal (item id)', w.setBlock(x, y, z, BLOCK.COAL) === false);
check('setBlock refuses an unknown id', w.setBlock(x, y, z, 999) === false);
check('refused writes leave the block unchanged', w.getBlock(x, y, z) === before);

// Placeable blocks still work.
check('setBlock accepts stone', w.setBlock(x, y, z, BLOCK.STONE) === true);
check('stone is stored', w.getBlock(x, y, z) === BLOCK.STONE);
w.setBlock(x, y, z, before);

// Every item id is recognised as an item, so placeBlock can refuse it.
const itemIds = [BLOCK.BEEF, BLOCK.STICK, BLOCK.COAL, BLOCK.WOODEN_PICKAXE, BLOCK.IRON_INGOT];
check('all item ids are flagged as items', itemIds.every((id) => isItem(id)));
check('placeable blocks are not items', [BLOCK.STONE, BLOCK.DIRT, BLOCK.TORCH].every((id) => !isItem(id)));

// A chunk that already holds an item id (for example from an older save) must not crash the mesher.
someChunk.set(2, y, 2, BLOCK.STICK);
let meshOk = true;
try {
  for (const chunk of w.chunks.values()) buildChunkGeometry(chunk, w);
} catch (err) {
  meshOk = false;
  console.log(err.message);
}
check('mesher skips item ids without throwing', meshOk);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
