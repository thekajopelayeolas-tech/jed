// A gun bullet flies far, breaks the blocks it passes through, and loses speed each time it breaks one, so a
// bullet can only break a few blocks before it stops.
import { BLOCK } from '../src/blocks.js';
import { BULLET_RANGE, BULLET_SPEED, bulletBreaks, bulletAfterBreak } from '../src/combat.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// It reaches a mob about 100 blocks away.
check('a bullet reaches 100 blocks', BULLET_RANGE >= 100);
// It is much faster than an arrow.
check('a bullet is faster than an arrow', BULLET_SPEED > 40);

// It breaks an ordinary block while it has speed left, and it does not break air.
check('a bullet breaks a stone block at full speed', bulletBreaks(BLOCK.STONE, BULLET_SPEED) === true);
check('a bullet does not break air', bulletBreaks(BLOCK.AIR, BULLET_SPEED) === false);
check('a bullet does not break bedrock', bulletBreaks(BLOCK.BEDROCK, BULLET_SPEED) === false);

// Each block it breaks slows it, and once it is too slow it stops.
const s1 = bulletAfterBreak(BULLET_SPEED);
const s2 = bulletAfterBreak(s1);
check('breaking a block slows the bullet', s1 < BULLET_SPEED);
check('the bullet keeps getting slower with each block', s2 < s1);
check('a bullet at low speed stops breaking blocks', bulletBreaks(BLOCK.STONE, 1) === false);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
