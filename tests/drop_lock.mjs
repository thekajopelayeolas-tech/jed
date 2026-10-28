// A Q-dropped item goes through DropManager, so the lock must hold on the same path the game uses.
import * as THREE from 'three';
import { DropManager } from '../src/drops.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const world = { getBlock: () => BLOCK.AIR };
const mgr = new DropManager(scene, world, {});
const inv = { items: [], add(id) { this.items.push(id); return 0; } };

// A block broken in the world is not locked: it is collected once the player is close and the drop has aged.
const broken = mgr.spawn(BLOCK.STONE, 0, 60, 0);
broken.age = 1;
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a broken block drop is collected when the player is close', inv.items.length === 1);

// A Q-dropped item stays put while the player is still beside it.
const dropped = mgr.spawn(BLOCK.STONE, 0, 60, 0).markDropped();
check('markDropped returns the drop it locked', dropped.locked === true);
dropped.age = 1;
inv.items = [];
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a Q-dropped item is not collected while the player stands beside it', inv.items.length === 0);

// Once the player has walked away, the lock lifts and the item can be collected again.
mgr.update(0.05, new THREE.Vector3(10, 60.5, 10), inv);
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a Q-dropped item is collected after the player walks away and back', inv.items.length === 1);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
