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
  // The player is far away, so a zombie wanders instead of chasing; otherwise it would walk toward the player.
  const far = new THREE.Vector3(200, 61, 200);
  for (let i = 0; i < 10; i++) m.update(0.05, far, () => {});
  return m.group.rotation.y;
}

// Most mobs walk forward: they face the way they walk. A cow, a villager, and a chicken all face east when walking east.
const forward = Math.atan2(-1, 0);
for (const [name, type] of [['cow', MOB.COW], ['villager', MOB.VILLAGER], ['chicken', MOB.CHICKEN], ['sheep', MOB.SHEEP]]) {
  check(`a ${name} walks forward (faces east when walking east)`, Math.abs(facingWhenWalkingEast(type) - forward) < 1e-6);
}

// Iron golems and zombies walk backwards: they face away from the way they walk (west when walking east).
const backward = Math.atan2(1, 0);
for (const [name, type] of [['iron golem', MOB.IRON_GOLEM], ['zombie', MOB.ZOMBIE]]) {
  check(`a ${name} walks backwards (faces west when walking east)`, Math.abs(facingWhenWalkingEast(type) - backward) < 1e-6);
}

// Walking still moves the mob the right way: a villager walks east, not backwards.
const v = new Mob(scene, world, MOB.VILLAGER, 0.5, 61, 0.5);
v.onGround = true;
v.wanderDir.set(1, 0);
v.wanderTimer = 99;
const startX = v.pos.x;
for (let i = 0; i < 20; i++) v.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
check('a villager walks east', v.pos.x > startX + 0.5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
