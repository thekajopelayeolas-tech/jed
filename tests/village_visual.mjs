import { tileImageData, TILE } from '../src/textures.js';
import { buildMobModel } from '../src/mob-model.js';
import { MOB } from '../src/mobs.js';

let failed = 0;
const check = (ok, msg) => {
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', msg);
};

// The door tile has a frame and a handle, so it is not one flat colour.
const door = tileImageData('door');
const pixel = (x, y) => [door[(y * TILE + x) * 4], door[(y * TILE + x) * 4 + 1], door[(y * TILE + x) * 4 + 2]];
check(pixel(0, 0).join() !== pixel(10, 7).join(), 'the door frame and handle differ in colour');

// Villagers and iron golems are humanoid, with two legs and two arms that swing.
const villager = buildMobModel(MOB.VILLAGER);
check(villager.legs.length === 2 && villager.arms.length === 2, 'a villager has two legs and two arms');
const golem = buildMobModel(MOB.IRON_GOLEM);
check(golem.legs.length === 2 && golem.arms.length === 2, 'an iron golem has two legs and two arms');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
