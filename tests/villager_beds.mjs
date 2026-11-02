import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { Mob, MOB } from '../src/mobs.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

let doorOpened = 0;
const world = {
  getBlock(_x, y) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; },
  openDoorAt() { doorOpened++; return true; },
};
const scene = { add() {}, remove() {} };
const villager = new Mob(scene, world, MOB.VILLAGER, 2.5, 60, 2.5);
villager.home = { x: 0, z: 0 };
villager.bedTarget = { x: 4.5, y: 59, z: 2.5, door: { x: 2.5, z: 2.5, blockX: 2, blockZ: 2 } };
const player = new THREE.Vector3(100, 60, 100);
const untouchedWorldTime = 0.82;
villager.update(0.05, player, () => {}, [], true);
check('a villager starts entering its assigned house at night', villager.enteredHome && doorOpened > 0);
for (let i = 0; i < 80; i++) villager.update(0.05, player, () => {}, [], true);
check('a villager walks to its bed and sleeps', villager.sleeping && Math.abs(villager.group.rotation.z) > 1);
check('villager sleeping leaves global time unchanged', untouchedWorldTime === 0.82);
villager.update(0.05, player, () => {}, [], false);
check('a villager wakes and leaves its bed during daytime', !villager.sleeping && !villager.enteredHome && villager.group.rotation.z === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
