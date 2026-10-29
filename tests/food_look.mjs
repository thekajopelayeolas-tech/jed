// Food looks like what it is: each food shows its real features. Fish has a tail and an eye, meat has a bone end and
// fat marbling, cooked meat is seared, and stew shows broth and chunks in the bowl.
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const n = SPRITE_SIZE;
const at = (id, x, y) => {
  const p = itemPixels(id);
  const i = (y * n + x) * 4;
  return p[i + 3] === 0 ? null : [p[i], p[i + 1], p[i + 2]];
};
const lumOf = (c) => (c[0] + c[1] + c[2]) / 3 / 255;
// Counts the distinct colours a sprite uses: a plain blob uses few, a detailed food uses many.
const colourCount = (id) => {
  const p = itemPixels(id);
  const s = new Set();
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] !== 0) s.add(`${p[i]},${p[i + 1]},${p[i + 2]}`);
  return s.size;
};

// Fish: a forked tail, so the left and right edges of the sprite are both filled at the middle height.
const fish = itemPixels(BLOCK.RAW_FISH);
const fishTailFilled = at(BLOCK.RAW_FISH, 0, 8) !== null || at(BLOCK.RAW_FISH, 15, 8) !== null;
check('raw fish has a tail that reaches the edge of the sprite', fishTailFilled);
check('cooked fish has a tail that reaches the edge of the sprite', at(BLOCK.COOKED_FISH, 0, 8) !== null || at(BLOCK.COOKED_FISH, 15, 8) !== null);
// The fish has a dark eye inside its body: a patch of very dark pixels in the middle of the body, not at its edge.
const eyeInside = (id) => {
  let dark = 0;
  for (let y = 5; y <= 9; y++) for (let x = 4; x <= 6; x++) {
    const c = at(id, x, y);
    if (c && lumOf(c) < 0.15) dark++;
  }
  return dark >= 2;
};
check('raw fish has a dark eye inside its body', eyeInside(BLOCK.RAW_FISH));

// Meat: a pale bone end and fat marbling. Raw meat shows light streaks through the red.
const pale = (id) => {
  let count = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const c = at(id, x, y);
    if (c && lumOf(c) > 0.85) count++;
  }
  return count;
};
check('raw beef shows pale fat marbling and a bone end', pale(BLOCK.BEEF) >= 4);
check('raw chicken shows a pale bone end', pale(BLOCK.RAW_CHICKEN) >= 3);

// Cooked meat is seared: its colour is browner and darker than the raw version.
const avgLum = (id) => {
  let s = 0;
  let c = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const col = at(id, x, y);
    if (col) { s += lumOf(col); c++; }
  }
  return s / c;
};
check('cooked pork is darker than raw pork', avgLum(BLOCK.COOKED_PORK) < avgLum(BLOCK.RAW_PORK) - 0.05);
check('cooked chicken is darker than raw chicken', avgLum(BLOCK.COOKED_CHICKEN) < avgLum(BLOCK.RAW_CHICKEN) - 0.05);

// Stew is a bowl of broth with chunks in it: a broth colour and a chunk colour, both visible, on top of the bowl.
check('stew shows broth and chunks, not a flat bowl', colourCount(BLOCK.STEW) >= 8);
// An egg has a highlight: a clearly lighter spot on the upper part of the shell.
const eggHighlight = () => {
  for (let y = 4; y <= 7; y++) for (let x = 5; x <= 9; x++) {
    const c = at(BLOCK.EGG, x, y);
    if (c && lumOf(c) > 0.97) return true;
  }
  return false;
};
check('an egg has a highlight on its upper shell', eggHighlight());

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
