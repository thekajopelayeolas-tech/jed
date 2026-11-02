import { Hunger, MAX_HUNGER, EXHAUSTION_PER_HUNGER, foodPoints, foodSaturation } from '../src/hunger.js';
import { BLOCK } from '../src/blocks.js';
import { Player } from '../src/player.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Vanilla starts at 20 hunger points with some saturation.
const h = new Hunger();
check('starts full at 20 with 5 saturation', h.value === MAX_HUNGER && h.value === 20 && h.saturation === 5);

// Activity exhaustion first consumes saturation, then hunger.
h.addExhaustion(EXHAUSTION_PER_HUNGER);
let lost = h.update();
check('exhaustion consumes saturation first', lost === false && h.value === 20 && h.saturation === 4);
const hungry = new Hunger(20, 0);
hungry.addExhaustion(EXHAUSTION_PER_HUNGER);
lost = hungry.update();
check('four exhaustion drains one hunger point when saturation is empty', lost === true && hungry.value === 19);

// Eating restores points and saturation without exceeding either cap.
const e = new Hunger(3);
const gained = e.eat(3, 2);
check('eating restores hunger and saturation', e.value === 6 && gained === 3 && e.saturation === 5);
const full = new Hunger(19, 19);
const capped = full.eat(8, 12);
check('eating clamps hunger and saturation to 20', full.value === MAX_HUNGER && capped === 1 && full.saturation === 20);

// Exhaustion cannot drain below zero, and saved values are clamped.
const z = new Hunger(0, 0);
z.addExhaustion(8);
check('exhaustion cannot push hunger below 0', z.update() === false && z.value === 0);
check('saved value 42 clamps to 20', new Hunger(42).value === 20);
check('saved value -4 clamps to 0', new Hunger(-4).value === 0);

// Food values follow the Minecraft hunger and saturation scale.
check('raw beef restores 3 points', foodPoints(BLOCK.BEEF) === 3);
check('cooked beef restores 8 points', foodPoints(BLOCK.COOKED_BEEF) === 8);
check('rotten flesh restores 4 points', foodPoints(BLOCK.ROTTEN_FLESH) === 4);
check('cooked beef grants more saturation than raw beef', foodSaturation(BLOCK.COOKED_BEEF) > foodSaturation(BLOCK.BEEF));
check('cooked beef is edible (not zero)', foodPoints(BLOCK.COOKED_BEEF) > 0);
check('a stick cannot be eaten', foodPoints(BLOCK.STICK) === 0);
const fromEmpty = new Hunger(0);
check('eating cooked beef from empty restores 8 points', fromEmpty.eat(foodPoints(BLOCK.COOKED_BEEF), foodSaturation(BLOCK.COOKED_BEEF)) === 8 && fromEmpty.value === 8);
const nearlyFull = new Hunger(19);
check('eating cooked beef at 19 clamps at 20', nearlyFull.eat(foodPoints(BLOCK.COOKED_BEEF)) === 1 && nearlyFull.value === 20);

// Player damage does not directly consume hunger.
const world = { getBlock: () => 0 };
const p = new Player(world, 0, 80, 0);
const before = p.hunger.value;
p.hurt(3);
const afterHit = p.hunger.value;
p.hurt(3);
check('damage does not directly change hunger', afterHit === before && p.hunger.value === afterHit);
p.respawn(0, 80, 0);
check('respawn restores full hunger and starter saturation', p.hunger.value === 20 && p.hunger.saturation === 5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
