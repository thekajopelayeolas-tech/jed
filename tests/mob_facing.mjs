import { Mob, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A flat open world: stone floor, air above, so the mobs can walk freely.
const world = {
  getBlock(x, y, z) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; },
  getLight() { return 0; },
};
const scene = { add() {}, remove() {} };

// Walk a mob east (+x) for a moment, then read which way its body faces.
function facingWhenWalkingEast(type) {
  const m = new Mob(scene, world, type, 0.5, 61, 0.5);
  m.onGround = true;
  m.wanderDir.set(1, 0);
  m.wanderTimer = 99;
  for (let i = 0; i < 10; i++) m.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
  return m.group.rotation.y;
}

// Every mob faces the way it walks: the same angle for a cow, a villager, and an iron golem.
const expected = Math.atan2(-1, 0);
for (const [name, type] of [['cow', MOB.COW], ['villager', MOB.VILLAGER], ['iron golem', MOB.IRON_GOLEM]]) {
  check(`a ${name} faces the way it walks (east)`, Math.abs(facingWhenWalkingEast(type) - expected) < 1e-6);
}

// Villagers and iron golems still walk forward (east), not backwards.
const v = new Mob(scene, world, MOB.VILLAGER, 0.5, 61, 0.5);
v.onGround = true;
v.wanderDir.set(1, 0);
v.wanderTimer = 99;
const startX = v.pos.x;
for (let i = 0; i < 20; i++) v.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
check('a villager walks forward (east)', v.pos.x > startX + 0.5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
