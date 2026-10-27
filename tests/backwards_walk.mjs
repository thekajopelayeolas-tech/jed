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

const cowFacing = facingWhenWalkingEast(MOB.COW);
const villagerFacing = facingWhenWalkingEast(MOB.VILLAGER);
const golemFacing = facingWhenWalkingEast(MOB.IRON_GOLEM);

// Facing directions differ by half a turn (PI), so the villager and golem face the opposite way to the cow.
const opposite = (a, b) => Math.abs(Math.abs(a - b) - Math.PI) < 1e-6 || Math.abs(Math.abs(a - b) - 3 * Math.PI) < 1e-6;
// A cow walking east keeps its normal facing, the angle the game used before this change.
check('a cow faces the way it walks (east)', Math.abs(cowFacing - Math.atan2(-1, 0)) < 1e-6);
check('a villager walks backwards: it faces opposite to a cow walking the same way', opposite(villagerFacing, cowFacing));
check('an iron golem walks backwards: it faces opposite to a cow walking the same way', opposite(golemFacing, cowFacing));
check('a villager and an iron golem face the same way when walking the same way', Math.abs(villagerFacing - golemFacing) < 1e-6);
check('villagers and golems have the backwards flag', new Mob(scene, world, MOB.VILLAGER, 0, 61, 0).def.walksBackwards === true && new Mob(scene, world, MOB.IRON_GOLEM, 0, 61, 0).def.walksBackwards === true);
check('a cow does not walk backwards', !new Mob(scene, world, MOB.COW, 0, 61, 0).def.walksBackwards);

// Movement itself is unchanged: a villager still covers ground at its normal speed in the walk direction.
const v = new Mob(scene, world, MOB.VILLAGER, 0.5, 61, 0.5);
v.onGround = true;
v.wanderDir.set(1, 0);
v.wanderTimer = 99;
const startX = v.pos.x;
for (let i = 0; i < 20; i++) v.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
check('a villager still walks forward (east) while facing backwards', v.pos.x > startX + 0.5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
