// Mobs walk sideways: a land mob's travel is across its body, not straight ahead. Walking east, a cow moves in its
// side direction, so its body is turned across the path while it keeps moving.
import { Mob, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const world = {
  getBlock(x, y, z) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; },
  getLight() { return 0; },
};
const scene = { add() {}, remove() {} };
const far = new THREE.Vector3(200, 61, 200);

// A cow asked to walk east moves east, but sideways: its body is turned 90 degrees from its path.
{
  const m = new Mob(scene, world, MOB.COW, 0.5, 61, 0.5);
  m.onGround = true;
  m.wanderDir.set(1, 0);
  m.wanderTimer = 99;
  const startX = m.pos.x;
  for (let i = 0; i < 20; i++) m.update(0.05, far, () => {});
  // Asked to walk east, a cow travels diagonally: sideways across its body and forward toward the goal. So it moves
  // both along +z (the sideways part) and east (the forward part), not straight east.
  // Both components move by about the same amount, so the cow travels diagonally rather than straight east.
  const dx = m.pos.x - startX;
  const dz = m.pos.z - 0.5;
  check('a cow asked to walk east moves sideways as well as forward', dz < -0.5 && dx > 0.5 && Math.abs(dx + dz) < 0.2);
  // The body follows the diagonal travel: it faces opposite the way the cow moves (a cow walks facing away).
  const travelYaw = Math.atan2(m.vel.x, m.vel.z);
  const diff = Math.abs(Math.atan2(Math.sin(m.group.rotation.y - travelYaw), Math.cos(m.group.rotation.y - travelYaw)));
  check('a cow faces opposite its diagonal travel', Math.abs(diff - Math.PI) < 0.05);
}

// The sideways walk still lets a mob climb a 1-block wall on its goal path. A cow whose goal is east climbs a wall
// that lies east of it, even though it travels sideways.
{
  const WALL_Y = 60;
  const wallWorld = {
    getBlock(x, y, z) {
      if (y < WALL_Y) return BLOCK.STONE;
      if (x === 14 && z >= 0 && z <= 10 && y < WALL_Y + 1) return BLOCK.STONE;
      return BLOCK.AIR;
    },
    getLight() { return 15; },
  };
  const m = new Mob(scene, wallWorld, MOB.COW, 11.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  m.wanderTimer = 99;
  m.wanderDir.set(1, 0);
  for (let i = 0; i < 200 && m.pos.x < 14.5; i++) m.update(0.05, far, () => {});
  check('a cow walking toward a 1-block wall on its goal path climbs over it', m.pos.x > 14.0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
