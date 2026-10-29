// A hunter must shoot when it is run through the mob manager, the path the game uses. The manager has to pass the
// fire callback on to each mob, or a hunter never shoots.
import * as THREE from 'three';
import { MobManager, Mob } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const world = {
  getBlock(x, y, z) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; },
  getLight() { return 15; },
};
const scene = { add() {}, remove() {} };

const mgr = new MobManager(scene, world, 1337);
const hunter = new Mob(scene, world, 'hunter', 0.5, 61, 0.5);
hunter.onGround = true;
mgr.mobs.push(hunter);

const player = new THREE.Vector3(10.5, 61, 0.5);
const shots = [];
const fire = (from, dir, damage) => shots.push({ from, dir, damage });

// Run the manager for a few seconds, the way the game's frame loop does. The last two arguments are the look
// direction and the fire callback, as main.js passes them.
for (let i = 0; i < 120; i++) {
  mgr.update(0.05, player, 0.2, () => {}, [], false, null, fire);
}
check('a hunter shoots when run through the mob manager', shots.length > 0);
check('the hunter shot does its archery damage', shots[0]?.damage === 2);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
