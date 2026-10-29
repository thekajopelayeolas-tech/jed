// Land mobs walk straight toward their goal. Their body faces opposite the way they walk (most mobs), or along it
// (iron golems and zombies, which walk backwards). A mob walking into a 1-block wall still climbs it.
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

// Walk a mob east for a moment: return its position change and its body yaw.
function walkEast(type) {
  const m = new Mob(scene, world, type, 0.5, 61, 0.5);
  m.onGround = true;
  m.wanderDir.set(1, 0);
  m.wanderTimer = 99;
  const startX = m.pos.x;
  const startZ = m.pos.z;
  for (let i = 0; i < 20; i++) m.update(0.05, far, () => {});
  return { dx: m.pos.x - startX, dz: m.pos.z - startZ, yaw: m.group.rotation.y };
}

// Straight: walking east moves the mob east, and not sideways.
for (const [name, type] of [['cow', MOB.COW], ['villager', MOB.VILLAGER], ['chicken', MOB.CHICKEN], ['sheep', MOB.SHEEP]]) {
  const r = walkEast(type);
  check(`a ${name} walks straight east when asked to walk east`, r.dx > 0.5 && Math.abs(r.dz) < 0.05);
}

// Facing: most mobs face opposite the way they walk (west when walking east); golems and zombies face along it.
const opposite = Math.atan2(-1, 0);
for (const [name, type] of [['cow', MOB.COW], ['villager', MOB.VILLAGER], ['chicken', MOB.CHICKEN], ['sheep', MOB.SHEEP]]) {
  check(`a ${name} faces opposite its walk (east walk, body turned west)`, Math.abs(walkEast(type).yaw - opposite) < 1e-6);
}
const along = Math.atan2(1, 0);
for (const [name, type] of [['iron golem', MOB.IRON_GOLEM], ['zombie', MOB.ZOMBIE]]) {
  check(`a ${name} faces along its walk (east walk, body turned east)`, Math.abs(walkEast(type).yaw - along) < 1e-6);
}

// A 1-block wall on the path is climbed.
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
  check('a cow walking straight into a 1-block wall climbs over it', m.pos.x > 14.0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
