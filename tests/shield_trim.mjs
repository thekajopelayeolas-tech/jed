// The shield has a metal trim: a ring of iron around the wooden board, with the wood still showing inside it.
import { itemPixels, SPRITE_SIZE } from '../src/item-icons.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (ok, msg) => {
  console.log(ok ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!ok) failed++;
};

const px = itemPixels(BLOCK.SHIELD);
const at = (x, y) => {
  const i = (y * SPRITE_SIZE + x) * 4;
  return { r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] };
};
// Iron is grey, with no warm tint. The shaded side is darker than the lit side, so the brightness bar is low.
const isMetal = (c) => c.a > 0 && c.r > 80 && Math.abs(c.r - c.b) < 20 && Math.abs(c.g - c.r) < 20;
const isWood = (c) => c.a > 0 && c.r - c.b > 40;

// The rim is on all four sides of the board: top, left, right and bottom, inside the dark outline.
check(isMetal(at(8, 2)), 'the rim is iron along the top');
check(isMetal(at(2, 8)), 'the rim is iron along the left');
check(isMetal(at(13, 8)), 'the rim is iron along the right');
check(isMetal(at(8, 13)), 'the rim is iron along the bottom');
// Wood is brown, so the rim pixels above must not read as wood.
check(!isWood(at(13, 8)) && !isWood(at(8, 13)), 'the rim is not wood on the shaded sides');

// The wooden board is still wood inside the rim.
check(isWood(at(8, 5)), 'the board is still wood inside the rim');
check(isWood(at(5, 8)), 'the board is still wood on the left, inside the rim');

// The iron boss in the centre is drawn over the board.
check(isMetal(at(8, 8)), 'the iron boss is in the centre');

if (failed) process.exitCode = 1;
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
