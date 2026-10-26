import { Hunger, MAX_HUNGER, HUNGER_INTERVAL, foodPoints } from '../src/hunger.js';
import { BLOCK } from '../src/blocks.js';
import { Player } from '../src/player.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Starts full: 9 points.
const h = new Hunger();
check('starts full at 9', h.value === MAX_HUNGER && h.value === 9);

// Drains by one point after each 30 second interval.
let lost = h.update(HUNGER_INTERVAL - 1);
check('no drop before 30 seconds', lost === false && h.value === 9);
lost = h.update(1.5);
check('one point lost after 30 seconds', lost === true && h.value === 8);

// Sprinting counts double toward the next drop.
const s = new Hunger();
s.update(HUNGER_INTERVAL / 2, true);
check('sprinting for 15 seconds drops one point', s.value === 8);

// Taking damage costs one point.
const d = new Hunger(5);
d.onDamage();
check('damage removes one point (5 -> 4)', d.value === 4);
d.onDamage();
d.onDamage();
d.onDamage();
d.onDamage();
check('damage cannot push hunger below 0', d.value === 0);

// Eating adds points and never goes above the maximum.
const e = new Hunger(3);
const gained = e.eat(3);
check('eating 3 points from 3 gives 6', e.value === 6 && gained === 3);
const full = new Hunger(8);
const capped = full.eat(5);
check('eating cannot exceed 9', full.value === MAX_HUNGER && capped === 1);

// At zero hunger the timer does not keep draining.
const z = new Hunger(0);
check('no drain at zero', z.update(HUNGER_INTERVAL * 3) === false && z.value === 0);

// Values from saves are clamped into 0..9.
check('saved value 42 clamps to 9', new Hunger(42).value === 9);
check('saved value -4 clamps to 0', new Hunger(-4).value === 0);

// Food values: each edible food restores a fixed amount, and cooked beef restores more than raw beef.
check('raw beef restores 3 points', foodPoints(BLOCK.BEEF) === 3);
check('cooked beef restores 5 points', foodPoints(BLOCK.COOKED_BEEF) === 5);
check('rotten flesh restores 2 points', foodPoints(BLOCK.ROTTEN_FLESH) === 2);
check('cooked beef is edible (not zero)', foodPoints(BLOCK.COOKED_BEEF) > 0);
check('a stick cannot be eaten', foodPoints(BLOCK.STICK) === 0);
const fromEmpty = new Hunger(0);
check('eating cooked beef from empty fills 5 of 9 points', fromEmpty.eat(foodPoints(BLOCK.COOKED_BEEF)) === 5 && fromEmpty.value === 5);
const nearlyFull = new Hunger(7);
check('eating cooked beef at 7 stops at 9 (gains only 2)', nearlyFull.eat(foodPoints(BLOCK.COOKED_BEEF)) === 2 && nearlyFull.value === 9);

// Player wiring: a landed hit costs one hunger point, and a blocked hit costs nothing.
const world = { getBlock: () => 0 };
const p = new Player(world, 0, 80, 0);
const before = p.hunger.value;
p.hurt(3);
const afterHit = p.hunger.value;
p.hurt(3);
check('landed hit costs one hunger point', afterHit === before - 1);
check('hit inside the cooldown costs no hunger', p.hunger.value === afterHit);
p.respawn(0, 80, 0);
check('respawn restores full hunger', p.hunger.value === 9);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
