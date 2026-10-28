// Poured water is one block, a single block. It does not spread into new water blocks. Three water pieces
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

// A water source is drawn as a full block, so it reads as a block you can point at.
{
  const source = boxesFor(BLOCK.WATER, 0);
  check('a water source is drawn as a full block', source.length === 1 && source[0][4] === 1);
}

// Three water pieces that touch turn into one full water block. Two do not.
{
  const w = makeWorld([['0,11,0', BLOCK.WATER], ['1,11,0', BLOCK.WATER], ['0,11,1', BLOCK.WATER]]);
  const merged = waterMerge(w, 0, 11, 0);
  check('three connected water pieces merge into a full water block', merged === true && w.getBlock(0, 11, 0) === BLOCK.WATER);
  const pair = makeWorld([['0,11,0', BLOCK.WATER], ['1,11,0', BLOCK.WATER]]);
  check('two connected water pieces do not merge', waterMerge(pair, 0, 11, 0) === false);
}



console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
