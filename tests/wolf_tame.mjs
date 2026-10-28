// Taming a wolf with a bone: a wild wolf tames once, a tamed wolf follows the player, and other mobs cannot be tamed.
import * as THREE from 'three';
import { World } from '../src/world.js';
import { Mob, MOB, MobManager } from '../src/mobs.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
let ground = 0;
for (let y = 94; y > 0; y--) if (w.getBlock(8, y, 8) !== 0) { ground = y; break; }

const wolf = new Mob(scene, w, 'wolf', 8.5, ground + 1, 8.5);
check('a wild wolf is not tamed', wolf.tamed === false);
check('a wolf can be tamed', wolf.tame() === true && wolf.tamed === true);
check('a tamed wolf cannot be tamed again', wolf.tame() === false);

// A cow cannot be tamed.
const cow = new Mob(scene, w, MOB.COW, 8.5, ground + 1, 8.5);
check('a cow cannot be tamed', cow.tame() === false && cow.tamed === false);

// A tamed wolf walks toward a player who is far away, and stays put when close.
const far = new THREE.Vector3(18.5, ground + 1, 8.5);
const tamed = new Mob(scene, w, 'wolf', 8.5, ground + 1, 8.5);
tamed.tame();
const startX = tamed.pos.x;
for (let i = 0; i < 40; i++) tamed.update(0.05, far, () => {}, [], false, null, null);
check('a tamed wolf follows a far player', tamed.pos.x > startX);

const near = new THREE.Vector3(9.5, ground + 1, 8.5);
const idle = new Mob(scene, w, 'wolf', 8.5, ground + 1, 8.5);
idle.tame();
idle.wanderDir.set(0, 0);
const before = idle.pos.clone();
for (let i = 0; i < 40; i++) idle.update(0.05, near, () => {}, [], false, null, null);
check('a tamed wolf waits beside a near player', idle.pos.distanceTo(before) < 0.5);

// A tamed wolf far from the player teleports to them and is never removed for distance.
// A wild wolf that is far away is still removed. Chunks around 60 blocks out are loaded first, so the ground is real.
for (let i = 0; i < 20; i++) w.update(8, 8, 4, 50);
const farGround = (x) => {
  for (let y = 94; y > 0; y--) if (w.getBlock(x, y, 8) !== 0) return y;
  return 0;
};
const manager = new MobManager(scene, w, 1337);
const playerAt = new THREE.Vector3(8.5, ground + 1, 8.5);
const farTamed = new Mob(scene, w, 'wolf', 68.5, farGround(68) + 1, 8.5);
farTamed.tame();
const farWild = new Mob(scene, w, 'wolf', 68.5, farGround(68) + 1, 12.5);
manager.mobs.push(farTamed, farWild);
manager.update(0.05, playerAt, 0.2, () => {});
check('a far tamed wolf is kept, not despawned', manager.mobs.includes(farTamed));
check('a far tamed wolf teleports close to the player', farTamed.pos.distanceTo(playerAt) < 6);
check('a far wild wolf is still despawned', !manager.mobs.includes(farWild));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
