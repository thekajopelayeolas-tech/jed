import { shouldBurn, burnStep, BURN_TICK, BURN_DAMAGE } from '../src/burning.js';
import { BLOCK } from '../src/blocks.js';
import { LIGHT, MAX_LIGHT } from '../src/lighting.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A small fake world: sky light and block id per cell, with a default of open sky.
function fakeWorld({ block = BLOCK.AIR, sky = MAX_LIGHT } = {}) {
  return {
    getBlock: () => block,
    getLight: (x, y, z, ch) => (ch === LIGHT.SKY ? sky : 0),
  };
}
const zombie = { def: { burnsInSun: true }, pos: { x: 0.5, y: 60, z: 0.5 }, height: 1.9 };
const cow = { def: {}, pos: { x: 0.5, y: 60, z: 0.5 }, height: 0.9 };

check('zombie burns in daylight under open sky', shouldBurn(zombie, fakeWorld(), 0.25) === true);
check('zombie does not burn at night', shouldBurn(zombie, fakeWorld(), 0.75) === false);
check('zombie does not burn when shaded', shouldBurn(zombie, fakeWorld({ sky: 3 }), 0.25) === false);
check('zombie does not burn under water', shouldBurn(zombie, fakeWorld({ block: BLOCK.WATER }), 0.25) === false);
check('cow never burns', shouldBurn(cow, fakeWorld(), 0.25) === false);

// Burn ticks: one damage per second while burning, and the timer resets when it stops.
{
  const m = { burnTimer: 0 };
  let total = 0;
  for (let i = 0; i < 10; i++) total += burnStep(m, 0.5, true);
  check('5 seconds of burning deals 5 damage', total === 5 * BURN_DAMAGE && BURN_TICK === 1);
  burnStep(m, 0.5, false);
  check('stopping burning resets the timer', m.burnTimer === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
