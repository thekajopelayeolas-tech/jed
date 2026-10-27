import { World } from '../src/world.js';
import { MobManager, Mob, MOB, VILLAGERS_PER_VILLAGE, GOLEMS_PER_VILLAGE } from '../src/mobs.js';
import { villageCentre, REGION } from '../src/village.js';
import { surfaceHeight } from '../src/chunk.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const SEED = 1337;
const scene = { add() {}, remove() {} };

// Find a village that is dry (its centre is above water), so the world can be built around it.
let village = null;
for (let rx = -6; rx < 6 && !village; rx++) {
  for (let rz = -6; rz < 6 && !village; rz++) {
    const c = villageCentre(rx, rz, SEED);
    if (c && surfaceHeight(SEED, c.x, c.z) > 31) village = c;
  }
}
check('a dry village exists to test with', village !== null);

// Build the world around the village so its chunks are loaded and the ground is levelled.
const w = new World(scene, SEED, {}, {});
w.update(village.x, village.z, 3, 40);

// Spawn the village population. Each village is topped up to its limits.
const mm = new MobManager(scene, w, SEED);
for (let i = 0; i < 40; i++) mm.spawnVillagers([village]);
const villagers = mm.mobs.filter((m) => m.type === MOB.VILLAGER && m.home && m.home.x === village.x);
const golems = mm.mobs.filter((m) => m.type === MOB.IRON_GOLEM && m.home && m.home.x === village.x);
check(`a village gets up to ${VILLAGERS_PER_VILLAGE} villagers`, villagers.length > 0 && villagers.length <= VILLAGERS_PER_VILLAGE);
check(`a village gets exactly ${GOLEMS_PER_VILLAGE} iron golem`, golems.length === GOLEMS_PER_VILLAGE);
check('a village never gets more than its villager limit', villagers.length <= VILLAGERS_PER_VILLAGE);

// Villagers and golems stand on solid ground, never in the air or underground.
const grounded = [...villagers, ...golems].every((m) => {
  const below = w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y) - 1, Math.floor(m.pos.z));
  return below !== BLOCK.AIR && below !== BLOCK.WATER;
});
check('villagers and golems stand on solid ground', grounded);

// Villagers and golems are peaceful: they never attack the player.
check('a villager is not hostile', new Mob(scene, w, MOB.VILLAGER, 0, 60, 0).def.hostile === false);
check('an iron golem is not hostile', new Mob(scene, w, MOB.IRON_GOLEM, 0, 60, 0).def.hostile === false);

// A golem drops iron when killed, and a villager drops nothing.
check('an iron golem drops iron ingots', new Mob(scene, w, MOB.IRON_GOLEM, 0, 60, 0).def.drops[0] === BLOCK.IRON_INGOT);
check('a villager drops nothing', new Mob(scene, w, MOB.VILLAGER, 0, 60, 0).def.drops.length === 0);

// Villages are never placed underground: the spawn ground is above sea level.
check('the village ground is above the water line', surfaceHeight(SEED, village.x, village.z) > 30);

// A villager that dies is not replaced: the village is not topped up with villagers again.
{
  const mm2 = new MobManager(scene, w, SEED);
  const home = { x: village.x, z: village.z };
  // Fill the village to its full population, so a kill leaves it one short.
  for (let i = 0; i < 40; i++) mm2.spawnVillagers([village]);
  const alive = mm2.mobs.filter((m) => m.type === MOB.VILLAGER && m.home && m.home.x === home.x).length;
  const victim = mm2.mobs.find((m) => m.type === MOB.VILLAGER && m.home && m.home.x === home.x);
  check('a village starts with villagers to kill', alive > 0 && victim !== undefined);
  victim.takeHit(1000, 0, 0);
  mm2.update(0.05, village, () => {}, 'day');
  check('a dead villager is removed from the world', !mm2.mobs.includes(victim));
  for (let i = 0; i < 5; i++) mm2.spawnVillagers([village]);
  const after = mm2.mobs.filter((m) => m.type === MOB.VILLAGER && m.home && m.home.x === home.x).length;
  check('a village that lost a villager does not summon another', after === alive - 1);
  check('the village is recorded as having lost a villager', mm2.lostVillagers.has(`${home.x},${home.z}`));
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
