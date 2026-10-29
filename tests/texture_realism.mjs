// Block textures look like real material: stone has real variation in tone and at least some fine pits, not a
// flat grey, and a texture stays the right size and shape.
import { tileImageData, TILE } from '../src/textures.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Measure a tile: the spread of its brightness, and how often a pixel differs sharply from its neighbour (pits and
// cracks give sharp local changes that a flat or simply blurred texture does not).
function measure(name) {
  const d = tileImageData(name);
  const lum = (x, y) => {
    const i = (y * TILE + x) * 4;
    return (d[i] + d[i + 1] + d[i + 2]) / 3 / 255;
  };
  let sum = 0;
  let sumSq = 0;
  let sharp = 0;
  let n = 0;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = lum(x, y);
      sum += v;
      sumSq += v * v;
      n++;
      if (x + 1 < TILE && Math.abs(v - lum(x + 1, y)) > 0.08) sharp++;
    }
  }
  const mean = sum / n;
  const std = Math.sqrt(sumSq / n - mean * mean);
  return { std, sharp: sharp / n };
}

// Ground surfaces have natural variation too: grass is not one green, and sand has individual grains.
// Baselines before this step: grass top 0.039, sand 0.035 (tonal spread), and sand 0.000 sharp detail.
const grass = measure('grassTop');
check('grass top varies in tone like real turf', grass.std > 0.06);
const sand = measure('sand');
check('sand has tonal variation between grains', sand.std > 0.05);
check('sand has sharp grain detail', sand.sharp > 0.05);

const stone = measure('stone');
// The baseline stone is at 0.051. Real stone shows clearly more tonal variation than that, so the bar is 0.07.
check('stone has real tonal variation, not flat grey', stone.std > 0.07);
check('stone has fine sharp detail (pits and cracks)', stone.sharp > 0.08);
check('the stone tile is 16 by 16', tileImageData('stone').length === TILE * TILE * 4);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
