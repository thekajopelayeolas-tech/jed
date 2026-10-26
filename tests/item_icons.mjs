import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';

let failed = 0;
const check = (ok, msg) => {
  console.log(ok ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!ok) failed++;
};

// Items with no block texture are drawn from a sprite, so each one needs a sprite or its slot is blank.
const spriteIds = Object.keys(BLOCK_DEFS).map(Number).filter((id) => !BLOCK_TILES[id]);
const missing = spriteIds.filter((id) => !itemPixels(id));
check(missing.length === 0, `every item has a sprite (missing: ${missing.map((id) => BLOCK_DEFS[id].name).join(', ') || 'none'})`);

// Each sprite is 16x16 RGBA and has a visible shape with an outline.
const size = SPRITE_SIZE * SPRITE_SIZE * 4;
const stats = (px) => {
  let opaque = 0;
  let lum = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    opaque++;
    lum += (px[i] + px[i + 1] + px[i + 2]) / 3;
  }
  return { opaque, mean: opaque ? lum / opaque / 255 : 0 };
};
const sized = spriteIds.filter((id) => itemPixels(id)).every((id) => itemPixels(id).length === size);
check(sized, 'every sprite is 16x16 RGBA');

const shapes = spriteIds.filter((id) => itemPixels(id)).map((id) => ({ id, ...stats(itemPixels(id)) }));
const bad = shapes.filter((s) => s.opaque < 30 || s.opaque > 220);
check(bad.length === 0, `every sprite covers 30-220 pixels (outliers: ${bad.map((s) => BLOCK_DEFS[s.id].name).join(', ') || 'none'})`);

// Different items must not share the same picture.
const keys = new Set(spriteIds.filter((id) => itemPixels(id)).map((id) => Buffer.from(itemPixels(id)).toString('base64')));
check(keys.size === spriteIds.filter((id) => itemPixels(id)).length, 'no two item sprites are identical');

// Coal is dark and iron ingots are light, so the ingot should be clearly brighter than the coal.
const coal = stats(itemPixels(BLOCK.COAL));
const ingot = stats(itemPixels(BLOCK.IRON_INGOT));
check(ingot.mean > coal.mean + 0.2, `iron ingot is brighter than coal (ingot ${ingot.mean.toFixed(2)}, coal ${coal.mean.toFixed(2)})`);

if (failed) process.exitCode = 1;
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
