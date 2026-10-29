// Mobs cannot strike the player while the player is directly above or below them.
// Exits non-zero on failure.
import * as H from '../src/hostile.js';
import { Mob, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The stacking rule: close sideways, with no body height in common.
check('a player above a mob is stacked', H.verticallyStacked(0.2, 60, 1.9, 62, 1.8));
check('a player below a mob is stacked', H.verticallyStacked(0.2, 60, 1.9, 57, 1.8));
check('a player beside a mob at the same height is not stacked', !H.verticallyStacked(0.2, 60, 1.9, 60, 1.8));
check('a player on a one-block step is not stacked', !H.verticallyStacked(0.2, 60, 1.9, 61, 1.8));
check('a player far away sideways is not stacked', !H.verticallyStacked(3, 60, 1.9, 64, 1.8));

const scene = { add() {}, remove() {} };
const flat = { getBlock(x, y, z) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; }, getLight() { return 0; } };

// A zombie with the player right above it cannot strike.
{
  const zombie = new Mob(scene, flat, MOB.ZOMBIE, 10, 60, 0);
  let hits = 0;
  for (let i = 0; i < 40; i++) {
    zombie.update(0.05, new THREE.Vector3(10.1, 64, 0), () => { hits++; });
  }
  check('a zombie does not strike a player standing above it', hits === 0);
}

// A zombie with the player beside it at the same height still strikes.
{
  const zombie = new Mob(scene, flat, MOB.ZOMBIE, 10, 60, 0);
  let hits = 0;
  for (let i = 0; i < 40; i++) {
    zombie.update(0.05, new THREE.Vector3(10.5, 60, 0), () => { hits++; });
  }
  check('a zombie still strikes a player beside it', hits > 0);
}

// A spider with the player right above it cannot bite.
{
  const spider = new Mob(scene, flat, MOB.SPIDER, 10, 60, 0);
  let bit = 0;
  for (let i = 0; i < 40; i++) {
    spider.update(0.05, new THREE.Vector3(10.1, 64, 0), (m, dmg) => { bit += dmg; });
  }
  check('a spider does not bite a player standing above it', bit === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
