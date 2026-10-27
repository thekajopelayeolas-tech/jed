import { MobManager, Mob, MOB } from '../src/mobs.js';
import { buildMobModel } from '../src/mob-model.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

// Spawning picks random spots, so use a fixed seed here. Then the test gives the same result every run.
let seed = 12345;
Math.random = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };

// A small fake world: solid stone below WATER_Y, one layer of water at WATER_Y, and open air above.
// Fish only need getBlock, so this keeps the test independent of terrain generation.
const WATER_Y = 50;
const pondWorld = {
  getBlock(x, y, z) {
    if (y < WATER_Y) return BLOCK.STONE;
    if (y === WATER_Y) return BLOCK.WATER;
    return BLOCK.AIR;
  },
  getLight() { return 0; },
};
const dryWorld = {
  getBlock(x, y, z) {
    if (y < WATER_Y) return BLOCK.STONE;
    return BLOCK.AIR;
  },
  getLight() { return 0; },
};

// A fish is a passive water mob that drops raw fish.
const fish = new Mob(scene, pondWorld, MOB.FISH, 8.5, WATER_Y + 0.2, 8.5);
check('a fish is passive (not hostile)', fish.def.hostile === false);
check('a fish drops raw fish', fish.def.drops.length === 1 && fish.def.drops[0] === BLOCK.RAW_FISH);
check('a fish is marked as a water mob', fish.def.water === true);

// Fish spawn at the surface of water, so every spawned fish sits in the pond.
const pond = new MobManager(scene, pondWorld);
const near = new THREE.Vector3(8, WATER_Y, 8);
for (let i = 0; i < 600; i++) pond.trySpawn(near, 0.3);
const pondFish = pond.mobs.filter((m) => m.type === MOB.FISH);
check('fish spawn in a pond', pondFish.length > 0);
check('every fish spawns at the water surface', pondFish.every((m) => Math.floor(m.pos.y) === WATER_Y));

// With no water, no fish spawn at all.
const dry = new MobManager(scene, dryWorld);
for (let i = 0; i < 600; i++) dry.trySpawn(near, 0.3);
check('no fish spawn on dry land', dry.mobs.every((m) => m.type !== MOB.FISH));

// A fish that wanders stays in the pond: its position remains over water.
// Check every step, not just the end: a fish must never be over dry land at any point of its wander.
let leftWater = false;
for (let i = 0; i < 300; i++) {
  fish.update(0.1, new THREE.Vector3(8, WATER_Y, 8), () => {});
  const cell = pondWorld.getBlock(Math.floor(fish.pos.x), Math.floor(fish.pos.y) - 1, Math.floor(fish.pos.z));
  if (cell !== BLOCK.WATER && pondWorld.getBlock(Math.floor(fish.pos.x), Math.floor(fish.pos.y), Math.floor(fish.pos.z)) !== BLOCK.WATER) leftWater = true;
}
check('a fish stays over water while wandering', !leftWater);

// A fish's model has no legs or arms, so there is nothing to swing.
const model = buildMobModel(MOB.FISH);
check('a fish model has no legs', model.legs.length === 0);
check('a fish model has no arms', model.arms.length === 0);

// Pigs and rabbits have legs, so they walk like cows.
check('a pig model has four legs', buildMobModel(MOB.PIG).legs.length === 4);
check('a rabbit model has two legs', buildMobModel(MOB.RABBIT).legs.length === 2);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
