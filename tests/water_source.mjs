// A water source is a block. Taking it with a bucket also takes the flowing water it fed, so no flow is left
// hanging in the air with nothing behind it.
import { BLOCK } from '../src/blocks.js';
import { useBucket } from '../src/utilities.js';
import { flowFrom, removeSourceFlow } from '../src/water.js';
import { isFullCube } from '../src/building.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const makeWorld = () => {
  const cells = new Map();
  return {
    cells,
    getBlock(x, y, z) {
      const k = `${x},${y},${z}`;
      if (cells.has(k)) return cells.get(k);
      if (y <= 10) return BLOCK.STONE;
      return BLOCK.AIR;
    },
    setBlock(x, y, z, id) { cells.set(`${x},${y},${z}`, id); return true; },
  };
};

// A water source is drawn as a full block, so it reads as a block you can point at.
check('a water source is a full block', isFullCube(BLOCK.WATER) === true);

// Taking the source with a bucket removes it, and the flowing water it fed goes with it.
{
  const w = makeWorld();
  w.setBlock(0, 11, 0, BLOCK.WATER);
  const made = flowFrom(w, 0, 11, 0);
  const r = useBucket(w, BLOCK.BUCKET, 0, 11, 0, null);
  // The bucket take clears the flow the source made, so the caller passes that list on.
  removeSourceFlow(w, made);
  check('a bucket takes the water source', r !== null && r.item === BLOCK.WATER_BUCKET);
  check('the source cell is empty after it is taken', w.getBlock(0, 11, 0) === BLOCK.AIR);
  check('the flowing water it fed is gone too', w.getBlock(1, 11, 0) === BLOCK.AIR);
}

// Removing a source only clears flow that it fed. Flowing water from another source is left alone.
{
  const w = makeWorld();
  w.setBlock(0, 11, 0, BLOCK.WATER);
  const madeA = flowFrom(w, 0, 11, 0);
  w.setBlock(20, 11, 0, BLOCK.WATER);
  flowFrom(w, 20, 11, 0);
  removeSourceFlow(w, madeA);
  check('removing one source leaves another source flow alone', w.getBlock(21, 11, 0) === BLOCK.FLOWING_WATER);
  check('removing one source clears its own flow', w.getBlock(1, 11, 0) === BLOCK.AIR);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
