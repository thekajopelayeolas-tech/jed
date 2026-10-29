// The helmet icon is a knight's great helm: a squared, flat-topped helm with straight sides, not a rounded cap. It
// has a dark visor slit across the face.
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const n = SPRITE_SIZE;
const p = itemPixels(BLOCK.IRON_HELMET);
const solid = (x, y) => {
  if (x < 0 || y < 0 || x >= n || y >= n) return false;
  return p[(y * n + x) * 4 + 3] !== 0;
};
const dark = (x, y) => {
  if (!solid(x, y)) return false;
  const i = (y * n + x) * 4;
  return p[i] < 60 && p[i + 1] < 60 && p[i + 2] < 60;
};

// The helm's top is flat: the top row of solid pixels spans a wide run, not a narrow peak.
const topRow = [...Array(n).keys()].find((y) => [...Array(n).keys()].some((x) => solid(x, y)));
const topRun = [...Array(n).keys()].filter((x) => solid(x, topRow)).length;
check('the helm has a flat, wide top', topRun >= 8);

// The sides are straight: the left and right edges stay at the same column for several rows.
const leftEdge = (y) => [...Array(n).keys()].find((x) => solid(x, y));
const straightRows = [4, 5, 6, 7, 8].filter((y) => leftEdge(y) === leftEdge(5)).length;
check('the helm has straight sides', straightRows >= 4);

// The visor slit: a dark band across the face, inside the helm (not the dark outline at its edge). Count the dark
// pixels in the face area only, columns 4 to 11 and rows 4 to 11, which is inside the metal.
let slitInside = 0;
for (let y = 4; y <= 11; y++) for (let x = 4; x <= 11; x++) if (dark(x, y)) slitInside++;
check('the helm has a dark visor slit across the face, inside the metal', slitInside >= 16);

// The helm is not a round dome: its bottom corners are square, so the bottom row is wide.
const bottomRow = [...Array(n).keys()].reverse().find((y) => [...Array(n).keys()].some((x) => solid(x, y)));
const bottomRun = [...Array(n).keys()].filter((x) => solid(x, bottomRow)).length;
check('the helm has square bottom corners, not a rounded cap', bottomRun >= 9);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
