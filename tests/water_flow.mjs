// Poured water is one block, drawn as a ramp. It does not spread into new water blocks. Three water pieces
// that meet turn into one full water block.
import { BLOCK } from '../src/blocks.js';
import { waterMerge } from '../src/water.js';
import { boxesFor } from '../src/building.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A world backed by a map. Ground is stone at y <= 10, and air above it, unless a cell has been set.
const makeWorld = (initial = []) => {
  const cells = new Map(initial);
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

// A pour does not spread: a single poured water block leaves its neighbours as air.
{
  const w = makeWorld([['0,11,0', BLOCK.WATER]]);
  const merged = waterMerge(w, 0, 11, 0);
  check('a single poured water block does not spread to its neighbours', w.getBlock(1, 11, 0) === BLOCK.AIR);
  check('a single poured water block does not merge', merged === false);
}

// A placed water cell is drawn as a ramp: lower than a full block, not a cube.
{
  const ramp = boxesFor(BLOCK.WATER, 0);
  check('water is drawn as a ramp shape', ramp.length >= 1 && ramp.every((b) => b[4] < 1));
  check('the ramp is not a full block', !(ramp.length === 1 && ramp[0][1] === 0 && ramp[0][4] === 1 && ramp[0][3] === 1));
}

// Three water pieces that touch turn into one full water block. Two do not.
{
  const w = makeWorld([['0,11,0', BLOCK.WATER], ['1,11,0', BLOCK.WATER], ['0,11,1', BLOCK.WATER]]);
  const merged = waterMerge(w, 0, 11, 0);
  check('three connected water pieces merge into a full water block', merged === true && w.getBlock(0, 11, 0) === BLOCK.WATER);
  const pair = makeWorld([['0,11,0', BLOCK.WATER], ['1,11,0', BLOCK.WATER]]);
  check('two connected water pieces do not merge', waterMerge(pair, 0, 11, 0) === false);
}

// The ramp is keyed to the water id. The id is repeated in building.js to avoid an import cycle, so check it.
check('the water id used for the ramp matches the water block', BLOCK.WATER === 7);
// The mesher draws the ramp as a box, not a cube, so a single water cell uses fewer faces than a full block would.
{
  const cube = boxesFor(BLOCK.STONE, 0);
  check('a full cube is one box that fills the cell', cube.length === 1 && cube[0][4] === 1);
  check('a water ramp is a lower box, not the full cell', boxesFor(BLOCK.WATER, 0)[0][4] === 0.5);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
