// Poured water spreads out over the ground around where it lands, a few blocks, then stops at walls and at the
// edge of its reach. Water falls down a drop instead of spreading sideways.
import { BLOCK } from '../src/blocks.js';
import { spreadWater, WATER_REACH, WATER_FALL_LIMIT } from '../src/water.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A flat floor of stone at y = 10, air above, and a wall of stone at x = 6.
const flat = (cells = new Map()) => ({
  getBlock(x, y, z) {
    const k = `${x},${y},${z}`;
    if (cells.has(k)) return cells.get(k);
    if (y <= 10) return BLOCK.STONE;
    if (x === 6 && y === 11) return BLOCK.STONE;
    return BLOCK.AIR;
  },
  setBlock(x, y, z, id) {
    cells.set(`${x},${y},${z}`, id);
  },
});

// Pouring at (0, 11, 0) on flat ground spreads water outward across the floor.
{
  const w = flat();
  w.setBlock(0, 11, 0, BLOCK.WATER);
  const placed = spreadWater(w, 0, 11, 0);
  check('poured water spreads to neighbouring ground cells', placed.length > 4);
  check('spread stays within the reach', placed.every((p) => Math.abs(p.x) <= WATER_REACH && Math.abs(p.z) <= WATER_REACH));
  check('spread stops at a wall', placed.every((p) => p.x < 6));
  check('the poured cell itself stays water', w.getBlock(0, 11, 0) === BLOCK.WATER);
}

// Water falls down a drop rather than spreading across the top of it.
{
  const cells = new Map();
  // A hole: the floor is missing at x = 2 and below, so water poured at x = 1 drops into it.
  const w = {
    getBlock(x, y, z) {
      const k = `${x},${y},${z}`;
      if (cells.has(k)) return cells.get(k);
      if (y <= 10 && !(x >= 2 && x <= 3)) return BLOCK.STONE;
      if (y <= 10) return BLOCK.AIR;
      return BLOCK.AIR;
    },
    setBlock(x, y, z, id) { cells.set(`${x},${y},${z}`, id); },
  };
  w.setBlock(1, 11, 0, BLOCK.WATER);
  const placed = spreadWater(w, 1, 11, 0);
  check('water falls into a drop below the pour', placed.some((p) => p.y < 11));
}

// A fall is limited, so a pour does not drop water down an endless shaft to the bottom of the world.
{
  const cells = new Map();
  const w = {
    getBlock(x, y, z) {
      const k = `${x},${y},${z}`;
      if (cells.has(k)) return cells.get(k);
      if (y === 10 && x === 1 && z === 0) return BLOCK.AIR;
      if (y <= 9) return BLOCK.STONE;
      if (y === 10) return BLOCK.STONE;
      return BLOCK.AIR;
    },
    setBlock(x, y, z, id) { cells.set(`${x},${y},${z}`, id); },
  };
  // A pour above a long air shaft at x=1, z=0 (floor at y=9 is stone, and the shaft goes down to it).
  w.setBlock(1, 30, 0, BLOCK.WATER);
  const placed = spreadWater(w, 1, 30, 0);
  const lowest = Math.min(...placed.map((p) => p.y));
  check('water does not fall more than the fall limit', lowest >= 30 - WATER_FALL_LIMIT);
}

// Water only counts a cell it actually wrote. A cell in an unloaded chunk (setBlock returns false) is skipped.
{
  const w = flat();
  w.setBlock = (x, y, z, id) => {
    // Pretend the chunk at x >= 2 is not loaded, so writes there fail.
    if (x >= 2) return false;
    w.cells = w.cells ?? new Map();
    w.cells.set(`${x},${y},${z}`, id);
    return true;
  };
  w.getBlock = (x, y, z) => {
    const k = `${x},${y},${z}`;
    if (w.cells?.has(k)) return w.cells.get(k);
    if (y <= 10) return BLOCK.STONE;
    return BLOCK.AIR;
  };
  w.cells = new Map([[`0,11,0`, BLOCK.WATER]]);
  const placed = spreadWater(w, 0, 11, 0);
  check('no spread cell is reported in an unloaded chunk', placed.every((p) => p.x < 2));
}

// Water never spreads into a cell that is not air: stone and other solids stay as they are.
{
  const w = flat();
  w.setBlock(0, 11, 0, BLOCK.WATER);
  spreadWater(w, 0, 11, 0);
  check('spread leaves solid ground alone', w.getBlock(6, 11, 0) === BLOCK.STONE);
}

// The pour lands where the bucket is aimed. Aimed at ground with air above, the water goes in the air cell
// above the ground, and spreads from there.
{
  const cells = new Map();
  const floor = {
    getBlock(x, y, z) {
      const k = `${x},${y},${z}`;
      if (cells.has(k)) return cells.get(k);
      if (y <= 10) return BLOCK.STONE;
      return BLOCK.AIR;
    },
    setBlock(x, y, z, id) { cells.set(`${x},${y},${z}`, id); return true; },
  };
  const placed = spreadWater(floor, 0, 11, 0);
  check('a pour onto open ground spreads from the air cell above the ground', placed.length > 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
