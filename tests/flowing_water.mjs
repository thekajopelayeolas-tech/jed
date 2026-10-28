// Flowing water: water that spreads out from a pour is made of slabs. A bucket cannot pick slab water up, but it
// can still pick up the full water block you poured.
import { BLOCK, BLOCK_DEFS, isSolid } from '../src/blocks.js';
import { useBucket } from '../src/utilities.js';
import { BUILD, boxesFor, isFullCube } from '../src/building.js';
import { BLOCK_TILES } from '../src/textures.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Flowing water is its own block: it has a name and a texture, is not solid, and is drawn as a slab.
check('flowing water is a registered block', BLOCK.FLOWING_WATER !== undefined);
check('flowing water has a name', BLOCK_DEFS[BLOCK.FLOWING_WATER]?.name === 'Flowing Water');
check('flowing water has a texture', !!BLOCK_TILES[BLOCK.FLOWING_WATER]);
check('flowing water is not solid', isSolid(BLOCK.FLOWING_WATER) === false);
check('flowing water is drawn as a slab, not a full cube', !isFullCube(BLOCK.FLOWING_WATER) && boxesFor(BLOCK.FLOWING_WATER, 0)[0][4] === 0.5);

// A bucket cannot fill from flowing water: the cell is left alone and the bucket stays empty.
{
  const cells = new Map([['8,80,8', BLOCK.FLOWING_WATER]]);
  const w = {
    getBlock: (x, y, z) => cells.get(`${x},${y},${z}`) ?? BLOCK.AIR,
    setBlock: (x, y, z, id) => { cells.set(`${x},${y},${z}`, id); return true; },
  };
  const r = useBucket(w, BLOCK.BUCKET, 8, 80, 8, null);
  check('a bucket cannot fill from flowing water', r === null);
  check('flowing water is left in the world when a bucket is used on it', w.getBlock(8, 80, 8) === BLOCK.FLOWING_WATER);
}

// A bucket still fills from the full water block, so a poured block can be picked up.
{
  const cells = new Map([['8,80,8', BLOCK.WATER]]);
  const w = {
    getBlock: (x, y, z) => cells.get(`${x},${y},${z}`) ?? BLOCK.AIR,
    setBlock: (x, y, z, id) => { cells.set(`${x},${y},${z}`, id); return true; },
  };
  const r = useBucket(w, BLOCK.BUCKET, 8, 80, 8, null);
  check('a bucket still fills from a full water block', r !== null && r.item === BLOCK.WATER_BUCKET);
}

// A pour flows out as slabs: the cells beside the poured block become flowing water, and the poured block itself
// stays full water that a bucket can take.
import { flowFrom } from '../src/water.js';
{
  const cells = new Map([['0,11,0', BLOCK.WATER]]);
  const w = {
    getBlock: (x, y, z) => {
      const k = `${x},${y},${z}`;
      if (cells.has(k)) return cells.get(k);
      if (y <= 10) return BLOCK.STONE;
      return BLOCK.AIR;
    },
    setBlock: (x, y, z, id) => { cells.set(`${x},${y},${z}`, id); return true; },
  };
  flowFrom(w, 0, 11, 0);
  check('the poured block stays full water', w.getBlock(0, 11, 0) === BLOCK.WATER);
  check('water flowing out of a pour is flowing water (slabs)', w.getBlock(1, 11, 0) === BLOCK.FLOWING_WATER);
  check('flowing water does not spread past its reach', w.getBlock(10, 11, 0) === BLOCK.AIR);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
