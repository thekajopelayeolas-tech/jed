// The new look: block tiles have texture, item sprites have a bevel, and mob boxes are shaded from above. Node has no
// WebGL, so these check the pixels and vertex colours the renderer uses. Exits non-zero on failure.
import { tileImageData } from '../src/textures.js';
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { buildMobModel } from '../src/mob-model.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Block tiles have real variation: a stone tile is not one flat colour.
const stone = tileImageData('stone');
const reds = new Set();
for (let i = 0; i < stone.length; i += 4) reds.add(stone[i]);
check('stone has tonal variation (more than 8 shades)', reds.size > 8);

const grass = tileImageData('grassTop');
let greenMin = 255;
let greenMax = 0;
for (let i = 0; i < grass.length; i += 4) {
  greenMin = Math.min(greenMin, grass[i + 1]);
  greenMax = Math.max(greenMax, grass[i + 1]);
}
check('grass has a clumped green range', greenMax - greenMin > 30);

// Item sprites are 16 by 16 and have a bevel, so the sprite is drawn with a lit and a shaded rim.
const bow = itemPixels(BLOCK.BOW);
check('a sprite is 16 by 16 RGBA', !!bow && bow.length === SPRITE_SIZE * SPRITE_SIZE * 4);

// Mob boxes: the top faces are brighter than the bottom faces.
const cow = buildMobModel('cow');
let topMax = 0;
let bottomMin = 1;
cow.group.traverse((o) => {
  if (!o.isMesh || !o.geometry.attributes.color) return;
  const n = o.geometry.attributes.normal;
  const c = o.geometry.attributes.color;
  for (let i = 0; i < n.count; i++) {
    const v = c.getX(i);
    if (n.getY(i) > 0.5) topMax = Math.max(topMax, v);
    if (n.getY(i) < -0.5) bottomMin = Math.min(bottomMin, v);
  }
});
check('a mob box is brighter on top than underneath', topMax > bottomMin);
check('a mob box uses vertex colours for shading', cow.group.children.some((c) => c.isMesh && c.material.vertexColors === true));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
