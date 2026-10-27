// A hunter's shot: it fires at the player in range, the bullet reaches the player's chest, and the hit does damage.
import * as THREE from 'three';
import { World } from '../src/world.js';
import { Mob, MOB } from '../src/mobs.js';
import { Player } from '../src/player.js';

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

// The hunter stands 12 blocks from the player, on the ground, and fires.
const hunter = new Mob(scene, w, MOB.HUNTER, 8.5, ground + 1, 8.5);
const player = new THREE.Vector3(20.5, ground + 1, 8.5);
const shots = [];
for (let i = 0; i < 60; i++) hunter.update(0.05, player, () => {}, [], false, null, (from, dir, dmg) => shots.push({ from, dir, dmg }));
check('a hunter fires at the player in range', shots.length > 0);

// Fly the first shot the way the game does (18 blocks per second, one step per frame), and find where it passes the chest.
const s = shots[0];
const vel = new THREE.Vector3(s.dir.x, s.dir.y, s.dir.z).multiplyScalar(18);
const pos = new THREE.Vector3(s.from.x, s.from.y, s.from.z);
const chest = new THREE.Vector3(player.x, player.y + 1.0, player.z);
let closest = Infinity;
for (let f = 0; f < 120; f++) {
  pos.add(vel.clone().multiplyScalar(1 / 60));
  closest = Math.min(closest, pos.distanceTo(chest));
}
check('the bullet passes within the hit radius of the chest', closest < 0.8);

// A hit does damage. The player starts at full health.
const p = new Player(w, 20.5, ground + 1, 8.5);
const before = p.health;
p.hurt(s.dmg);
check('a hunter hit takes health from the player', p.health < before);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
