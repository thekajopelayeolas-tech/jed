import { Player } from '../src/player.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A player with nothing solid around, so physics does not interfere.
const world = { getBlock: () => 0 };
const fresh = (health) => {
  const p = new Player(world, 0, 80, 0);
  p.health = health;
  p.hunger.value = 20;
  p.hunger.saturation = 0;
  return p;
};

// At 18+ hunger, four seconds restores one health point and costs exhaustion.
const a = fresh(10);
a.tickHealth(3.9);
check('no regen before four seconds', a.health === 10);
a.tickHealth(0.2);
check('four seconds of high hunger restores one health and adds exhaustion', a.health === 11 && a.hunger.value === 19 && a.hunger.exhaustion === 2);

const saturated = fresh(10);
saturated.hunger.saturation = 5;
saturated.tickHealth(0.5);
check('saturation enables fast half-second regen and is consumed', saturated.health === 11 && saturated.hunger.saturation === 4 && saturated.hunger.exhaustion === 2);

// Regeneration is capped at maximum health.
a.health = 19;
a.tickHealth(4);
check('regen is capped at max health (19 -> 20)', a.health === 20);

// Below 18 hunger, natural regeneration stops.
const c = fresh(10);
c.hunger.value = 17;
c.tickHealth(30);
check('no regen while hunger is below 18', c.health === 10);
c.hunger.value = 18;
c.tickHealth(3);
check('regen timer starts when hunger reaches 18', c.health === 10);

// Damage resets the regeneration timer but does not reduce hunger.
const e = fresh(10);
e.tickHealth(3);
e.hurtCooldown = 0;
e.hurt(1);
check('a hit does not cost hunger', e.hunger.value === 20);
e.tickHealth(3.9);
check('damage restarts the four-second regen timer', e.health === 9);
e.tickHealth(0.2);
check('regen resumes after a full post-hit interval', e.health === 10);

// Normal-difficulty starvation stops at half a heart.
const starving = fresh(2);
starving.hunger.value = 0;
starving.tickHealth(12);
check('starvation deals periodic damage but cannot kill', starving.health === 1);

// Dead players do not regenerate.
const f = fresh(0);
f.tickHealth(10);
check('dead player does not regenerate', f.health === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
