// Item sprites have more detail: more distinct colours and more shading per sprite than the baseline, while staying
// 16x16 and recognisable (each sprite still covers a sensible area, and no two are the same).
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK_DEFS } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const n = SPRITE_SIZE;
const ids = Object.keys(BLOCK_DEFS).map(Number).filter((id) => !BLOCK_TILES[id] && itemPixels(id));

let contrast = 0;
let contrastCount = 0;
let colours = 0;
for (const id of ids) {
  const p = itemPixels(id);
  const lum = (x, y) => {
    const i = (y * n + x) * 4;
    return (p[i] + p[i + 1] + p[i + 2]) / 3 / 255;
  };
  const seen = new Set();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      if (p[i + 3] === 0) continue;
      seen.add(`${p[i]},${p[i + 1]},${p[i + 2]}`);
      if (x + 1 < n && p[(y * n + x + 1) * 4 + 3] !== 0) { contrast += Math.abs(lum(x, y) - lum(x + 1, y)); contrastCount++; }
      if (y + 1 < n && p[((y + 1) * n + x) * 4 + 3] !== 0) { contrast += Math.abs(lum(x, y) - lum(x, y + 1)); contrastCount++; }
    }
  }
  colours += seen.size;
}
const meanContrast = contrast / contrastCount;
const meanColours = colours / ids.length;

// The baseline before this change was 0.178 contrast and 48 colours. The new sprites must be more detailed.
check('item sprites have more shading contrast than before', meanContrast > 0.2);
check('item sprites use more distinct colours than before', meanColours > 55);

// They are still recognisable items: every sprite covers a sensible area, and none is identical to another.
const bad = ids.filter((id) => {
  const p = itemPixels(id);
  let opaque = 0;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] !== 0) opaque++;
  return opaque < 30 || opaque > 220;
});
check(`every item sprite covers a sensible area (outliers: ${bad.length})`, bad.length === 0);
const keys = new Set(ids.map((id) => Buffer.from(itemPixels(id)).toString('base64')));
check('no two item sprites are identical', keys.size === ids.length);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
