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
  p.hunger.value = 9;
  return p;
};

// Full hunger, half health (10 of 20). Four seconds gives nothing; five seconds gives 3 hearts (6 HP).
const a = fresh(10);
a.tickHealth(4.9);
check('no regen before 5 seconds', a.health === 10);
a.tickHealth(0.2);
check('5 seconds of full hunger restores 3 hearts (10 -> 16)', a.health === 16);

// The next 5 seconds restore another 3 hearts, capped at 20.
a.tickHealth(5);
check('another 5 seconds caps at 20 health', a.health === 20);

// Regen never goes above max.
const b = fresh(19);
b.tickHealth(5);
check('regen is capped at max health (19 -> 20)', b.health === 20);

// Hunger that is not full does not regenerate, and the timer is reset.
const c = fresh(10);
c.hunger.value = 8;
c.tickHealth(30);
check('no regen while hunger is below full', c.health === 10);
c.hunger.value = 9;
c.tickHealth(4);
check('timer restarts after hunger returns to full (4s is not enough)', c.health === 10);

// Losing a hunger point while regenerating restarts the 5 second timer.
const d = fresh(10);
d.tickHealth(4);
d.hunger.value = 8;
d.tickHealth(1);
d.hunger.value = 9;
d.tickHealth(4.5);
check('losing hunger mid-count resets the timer', d.health === 10);

// Damage restarts the timer, so the 5 seconds must be uninterrupted.
const e = fresh(10);
e.tickHealth(4);
e.hurtCooldown = 0;
e.hurt(1);
check('a hit costs one hunger point (9 -> 8)', e.hunger.value === 8);
e.hunger.value = 9;
e.tickHealth(4.9);
check('damage restarts the regen timer', e.health === 9);

// Dead players do not regenerate.
const f = fresh(0);
f.tickHealth(10);
check('dead player does not regenerate', f.health === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
