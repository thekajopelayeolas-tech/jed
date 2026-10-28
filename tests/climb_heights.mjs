// Land mobs walk up walls in the real update loop, not just through tryJump. Each wall is one or more blocks high
// and sits directly in front of the mob. Exits non-zero if a mob cannot get over a wall within CLIMB_HEIGHT.
import { Mob, MOB, CLIMB_HEIGHT } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const WALL_Y = 60;
const scene = { add() {}, remove() {} };
const far = new THREE.Vector3(200, 60, 200);

// A flat floor, and a wall of `h` blocks across the mob's path at x = 14.
const worldWithWall = (h) => ({
  getBlock(x, y, z) {
    if (y < WALL_Y) return BLOCK.STONE;
    if (x === 14 && z >= 0 && z <= 10 && y < WALL_Y + h) return BLOCK.STONE;
    return BLOCK.AIR;
  },
  getLight() { return 0; },
});

for (const type of [MOB.COW, MOB.ZOMBIE, MOB.IRON_GOLEM]) {
  for (let h = 1; h <= CLIMB_HEIGHT; h++) {
    const m = new Mob(scene, worldWithWall(h), type, 11.5, WALL_Y + 1, 5.5);
    m.onGround = true;
    m.wanderTimer = 99;
    m.wanderDir.set(1, 0);
    for (let i = 0; i < 200 && m.pos.x < 15.5; i++) m.update(0.05, far, () => {});
    check(`a ${type} gets over a ${h}-block wall`, m.pos.x > 14.5);
  }
}

// A 2-block wall is too tall: in the real update loop the mob never gets over it.
for (const type of [MOB.COW, MOB.ZOMBIE, MOB.IRON_GOLEM]) {
  const m = new Mob(scene, worldWithWall(CLIMB_HEIGHT + 1), type, 11.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  m.wanderTimer = 99;
  m.wanderDir.set(1, 0);
  for (let i = 0; i < 200; i++) m.update(0.05, far, () => {});
  check(`a ${type} does not get over a ${CLIMB_HEIGHT + 1}-block wall`, m.pos.x < 14);
}

// The jump starts when the block is directly in front: the mob is rising before it is pressed against the wall.
{
  const m = new Mob(scene, worldWithWall(1), MOB.COW, 13.0, WALL_Y + 1, 5.5);
  m.onGround = true;
  m.wanderTimer = 99;
  m.wanderDir.set(1, 0);
  let rose = false;
  for (let i = 0; i < 40 && m.pos.x < 13.6; i++) {
    m.update(0.05, far, () => {});
    if (m.vel.y > 0 || m.pos.y > WALL_Y + 1.05) rose = true;
  }
  check('a mob jumps when a block is directly in front of it, before touching it', rose);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
