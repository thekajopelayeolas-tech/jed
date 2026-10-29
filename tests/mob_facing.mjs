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

// Mobs walk sideways now: asked to walk east, a mob travels across its body and faces that way. A cow, villager,
// chicken and sheep all face north when asked to walk east (their travel turns a quarter turn to the left).
// Asked to walk east, the travel is diagonal (a -90 degree turn blended with the goal, toward +x and -z). Most mobs
// face opposite their travel, so the body points toward +x and +z. Expected yaw: atan2(-vx, -vz) with vx = vz = -1.
const travelX = 1;
const travelZ = -1;
const sideways = Math.atan2(-travelX, -travelZ);
for (const [name, type] of [['cow', MOB.COW], ['villager', MOB.VILLAGER], ['chicken', MOB.CHICKEN], ['sheep', MOB.SHEEP]]) {
  check(`a ${name} faces opposite its diagonal travel when walking east`, Math.abs(facingWhenWalkingEast(type) - sideways) < 1e-6);
}

// Iron golems and zombies walk the same diagonal, but face along it (walksBackwards), not opposite it.
const along = Math.atan2(travelX, travelZ);
for (const [name, type] of [['iron golem', MOB.IRON_GOLEM], ['zombie', MOB.ZOMBIE]]) {
  check(`a ${name} faces along its diagonal travel when walking east`, Math.abs(facingWhenWalkingEast(type) - along) < 1e-6);
}

// Walking still moves the mob: a villager asked to walk east travels sideways, along +z, not backwards.
const v = new Mob(scene, world, MOB.VILLAGER, 0.5, 61, 0.5);
v.onGround = true;
v.wanderDir.set(1, 0);
v.wanderTimer = 99;
const startZ = v.pos.z;
for (let i = 0; i < 20; i++) v.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
check('a villager asked to walk east travels sideways (along -z)', v.pos.z < startZ - 0.5);
check('a villager asked to walk east also moves east', v.pos.x > 0.5 + 0.5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
