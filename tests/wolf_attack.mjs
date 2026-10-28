// A tamed wolf attacks whatever the player hits, and keeps biting it until it dies.
import * as THREE from 'three';
import { World } from '../src/world.js';
import { Mob, MOB } from '../src/mobs.js';

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
wolf.tame();
const cow = new Mob(scene, w, MOB.COW, 9.5, ground + 1, 8.5);
// The player hit the cow: the wolf takes the cow as its target.
wolf.wolfTarget = cow;
const player = new THREE.Vector3(30.5, ground + 1, 8.5);

// The wolf is beside the cow and bites it: the cow's health must fall from the wolf's own bites.
const startHealth = cow.health;
const others = [cow];
for (let i = 0; i < 400 && !cow.dead; i++) {
  wolf.update(0.05, player, () => {}, others, false, null, null);
}
check('the wolf bites the mob the player attacked', cow.health < startHealth);
check('the wolf keeps biting until the mob dies', cow.dead === true);

// Once the target is dead the wolf drops it and goes back to following the player.
const chase = wolf.chooseTarget(player, others);
check('the wolf stops attacking once the target is dead', chase === null || chase.mob !== cow);

// Only a tamed wolf picks up the player's target: a wild wolf does not.
const wild = new Mob(scene, w, 'wolf', 8.5, ground + 1, 8.5);
wild.wolfTarget = cow;
check('a wild wolf ignores the player target', wild.chooseTarget(player, others) === null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
