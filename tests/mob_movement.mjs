import { World } from '../src/world.js';
import { Mob, MobManager, MOB, WATER_MOBS, pickWaterMob, CLIMB_HEIGHT } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Seeded randomness, so spawning results are the same every run.
let seed = 4242;
const realRandom = Math.random;
Math.random = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const scene = { add() {}, remove() {} };
// A flat test world: solid stone below y = 60, dry air above, and a pond at x 0..7, z 0..7 with water to y = 60.
const WALL_Y = 60;
const makeWorld = (wallHeight = 0, pondBlocks = true) => ({
  getBlock(x, y, z) {
    if (y < WALL_Y) return BLOCK.STONE;
    if (y === WALL_Y) {
      if (pondBlocks && x >= 20 && x <= 27 && z >= 0 && z <= 7) return BLOCK.WATER;
      return BLOCK.STONE;
    }
    // A wall of extra blocks at x = 14 (for the jump tests), one or more blocks high.
    if (x === 14 && y > WALL_Y && y <= WALL_Y + wallHeight) return BLOCK.STONE;
    return BLOCK.AIR;
  },
  getLight() { return 0; },
});

// ---- Climbing: land mobs climb walls up to CLIMB_HEIGHT blocks, a taller wall is refused, water mobs never climb ----
{
  const w = makeWorld(1);
  const m = new Mob(scene, w, MOB.COW, 13.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  check('a cow climbs a single block in front', m.tryJump(1, 0) === true);
}
{
  const w = makeWorld(CLIMB_HEIGHT);
  const m = new Mob(scene, w, MOB.COW, 13.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  check(`a cow climbs a wall ${CLIMB_HEIGHT} blocks high`, m.tryJump(1, 0) === true);
}
{
  const w = makeWorld(CLIMB_HEIGHT + 1);
  const m = new Mob(scene, w, MOB.COW, 13.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  check(`a cow does not climb a wall ${CLIMB_HEIGHT + 1} blocks high`, m.tryJump(1, 0) === false);
}
{
  // Every land mob climbs, not just cows: zombies, villagers and chickens too.
  for (const type of [MOB.ZOMBIE, MOB.VILLAGER, MOB.CHICKEN, MOB.IRON_GOLEM]) {
    const w = makeWorld(2);
    const m = new Mob(scene, w, type, 13.5, WALL_Y + 1, 5.5);
    m.onGround = true;
    check(`a ${type} climbs a 2-block wall`, m.tryJump(1, 0) === true);
  }
}
{
  // Water mobs never climb, even a single block.
  const w = makeWorld(1);
  const m = new Mob(scene, w, MOB.DOLPHIN, 13.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  check('a dolphin (water mob) never climbs', m.tryJump(1, 0) === false);
}
{
  const w = makeWorld(1);
  const m = new Mob(scene, w, MOB.COW, 13.5, WALL_Y + 1, 5.5);
  m.onGround = false;
  check('a cow in mid-air cannot jump', m.tryJump(1, 0) === false);
}
{
  const w = makeWorld(0);
  const m = new Mob(scene, w, MOB.COW, 13.5, WALL_Y + 1, 5.5);
  m.onGround = true;
  check('a cow does not jump when there is nothing in front', m.tryJump(1, 0) === false);
}
{
  const w = makeWorld(1);
  const m = new Mob(scene, w, MOB.FISH, 13.5, WALL_Y + 1, 5.5);
  check('a fish never jumps', m.tryJump(1, 0) === false);
}

// ---- Land mobs stay out of water; water mobs stay in water ----
{
  // A cow walking east from land into the pond at x 20: it must turn back before entering the water.
  const w = makeWorld(0);
  const m = new Mob(scene, w, MOB.COW, 19.5, WALL_Y + 1, 3.5);
  m.onGround = true;
  m.wanderDir.set(1, 0);
  m.wanderTimer = 99;
  for (let i = 0; i < 200; i++) m.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
  check('a cow never walks into water', w.getBlock(Math.floor(m.pos.x), WALL_Y, Math.floor(m.pos.z)) !== BLOCK.WATER);
}
{
  // A fish in the pond, walking west toward the shore at x 20: it must stay over water.
  const w = makeWorld(0);
  const m = new Mob(scene, w, MOB.FISH, 21.5, WALL_Y + 1, 3.5);
  m.wanderDir.set(-1, 0);
  m.wanderTimer = 99;
  for (let i = 0; i < 300; i++) m.update(0.05, new THREE.Vector3(0, 0, 0), () => {});
  check('a fish stays over water', w.getBlock(Math.floor(m.pos.x), WALL_Y, Math.floor(m.pos.z)) === BLOCK.WATER);
}
for (const type of [MOB.SALMON, MOB.DOLPHIN, MOB.SQUID]) {
  check(`a ${type} is a water mob`, new Mob(scene, makeWorld(0), type, 0, 0, 0).def.water === true);
}

// ---- Spawning: water mobs only in water, land mobs never in water ----
{
  const w = makeWorld(0);
  const mm = new MobManager(scene, w);
  const near = new THREE.Vector3(22, WALL_Y + 1, 4);
  for (let i = 0; i < 800; i++) mm.trySpawn(near, 0.3);
  const water = mm.mobs.filter((m) => WATER_MOBS.includes(m.type));
  const land = mm.mobs.filter((m) => !WATER_MOBS.includes(m.type));
  check('water mobs do spawn in a pond', water.length > 0);
  check('every water mob spawns in water', water.every((m) => w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y), Math.floor(m.pos.z)) === BLOCK.WATER || w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y) - 1, Math.floor(m.pos.z)) === BLOCK.WATER));
  check('no land mob spawns in water', land.every((m) => w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y), Math.floor(m.pos.z)) !== BLOCK.WATER));
}
{
  // A dry world (no pond): no water mob should spawn at all.
  const w = makeWorld(0, false);
  const mm = new MobManager(scene, w);
  for (let i = 0; i < 400; i++) mm.trySpawn(new THREE.Vector3(22, WALL_Y + 1, 4), 0.3);
  check('no water mobs spawn when there is no water', mm.mobs.every((m) => !WATER_MOBS.includes(m.type)));
}
check('the water mob list is only fish, salmon, dolphin and squid',
  WATER_MOBS.length === 4 && [MOB.FISH, MOB.SALMON, MOB.DOLPHIN, MOB.SQUID].every((t) => WATER_MOBS.includes(t)));
check('pickWaterMob always returns a water mob', Array.from({ length: 100 }, () => pickWaterMob()).every((t) => WATER_MOBS.includes(t)));

Math.random = realRandom;
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
