// The gun reads as a gun: a long barrel across the top, a stock at the back, a grip hanging under the body, and a
// trigger guard. Checked from the sprite's silhouette.
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const n = SPRITE_SIZE;
const p = itemPixels(BLOCK.GUN);
const solid = (x, y) => {
  if (x < 0 || y < 0 || x >= n || y >= n) return false;
  return p[(y * n + x) * 4 + 3] !== 0;
};
const lum = (x, y) => {
  const i = (y * n + x) * 4;
  return (p[i] + p[i + 1] + p[i + 2]) / 3 / 255;
};

// The barrel: a long run of solid pixels in one row, about two thirds of the width.
const longestRun = (y) => {
  let best = 0;
  let run = 0;
  for (let x = 0; x < n; x++) {
    run = solid(x, y) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};
const barrelRow = Math.max(...[2, 3, 4, 5, 6].map((y) => longestRun(y)));
check('the gun has a long barrel (at least 11 pixels in one row)', barrelRow >= 11);

// The grip: solid pixels below the body on the right side, the way a pistol grip hangs.
let gripBelow = 0;
for (let y = 8; y <= 13; y++) for (let x = 8; x <= 12; x++) if (solid(x, y)) gripBelow++;
check('the gun has a grip hanging below the body', gripBelow >= 6);

// The trigger guard: an empty hole inside the gun, under the barrel. The outline is drawn around every gap next to
// the gun, so a hole shows as transparent pixels with the gun on every side. Check that some transparent pixel in
// the guard's box has solid gun in all four directions (a ray hits the gun up, down, left and right).
const hitsGun = (x, y, dx, dy) => {
  for (let k = 1; k < n; k++) if (solid(x + dx * k, y + dy * k)) return true;
  return false;
};
let guardGap = false;
for (let y = 9; y <= 11; y++) for (let x = 7; x <= 11; x++) {
  if (solid(x, y)) continue;
  if (hitsGun(x, y, -1, 0) && hitsGun(x, y, 1, 0) && hitsGun(x, y, 0, -1) && hitsGun(x, y, 0, 1)) guardGap = true;
}
check('the gun has a trigger guard: an empty gap enclosed by the gun', guardGap);

// The stock: the back end of the gun is taller than the barrel, so the body is not a single flat bar.
// The barrel is measured only above the trigger guard (rows 0 to 7), so the guard and grip are not counted as barrel.
const colSpan = (x, fromRow, toRow) => {
  let top = -1;
  let bottom = -1;
  for (let y = fromRow; y <= toRow; y++) if (solid(x, y)) { if (top < 0) top = y; bottom = y; }
  return top < 0 ? 0 : bottom - top + 1;
};
check('the gun body is not one flat bar: its back end is taller than its barrel', colSpan(2, 0, 9) >= colSpan(13, 0, 7) + 4);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
