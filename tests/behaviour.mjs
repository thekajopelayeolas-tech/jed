// Torch shape, mob targets, villager night rules, and the model look. Exits non-zero on failure.
import { World } from '../src/world.js';
import { Mob, MobManager, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import { boxesFor, isFullCube, DOOR } from '../src/building.js';
import { HOUSES } from '../src/village.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const SEED = 1337;
const w = new World(scene, SEED, {}, {});

// A torch is a thin post, not a full cube, so it no longer fills its cell.
check('a torch is not a full cube', !isFullCube(BLOCK.TORCH));
check('a torch is a thin post in the middle of its cell', boxesFor(BLOCK.TORCH).every(([x0, , z0, x1, , z1]) => x1 - x0 < 0.5 && z1 - z0 < 0.5));

// Zombies go for villagers and the player; golems go for zombies. The strike lands on the target mob.
const zombie = new Mob(scene, w, MOB.ZOMBIE, 10, 60, 10);
const villager = new Mob(scene, w, MOB.VILLAGER, 11, 60, 10);
const golem = new Mob(scene, w, MOB.IRON_GOLEM, 12, 60, 10);
const player = new THREE.Vector3(60, 60, 60);
check('a zombie targets a nearby villager over the player', zombie.chooseTarget(player, [villager])?.mob === villager);
check('a zombie with no villager near targets the player', zombie.chooseTarget(new THREE.Vector3(14, 60, 10), [])?.mob === null);
const farZombie = new Mob(scene, w, MOB.ZOMBIE, 40, 60, 40);
check('a zombie does not target a villager far away', farZombie.chooseTarget(player, [villager])?.mob !== villager);
check('a golem attacks a zombie nearby', golem.chooseTarget(player, [zombie])?.mob === zombie);
check('a calm golem ignores the player', golem.chooseTarget(player, []) === null);

// An angry golem is a target for the player too.
golem.angry = true;
check('an angry golem targets the player', golem.chooseTarget(new THREE.Vector3(13, 60, 10), [])?.mob === null);

// A zombie striking a villager damages it.
const hurt = new Mob(scene, w, MOB.VILLAGER, 11, 60, 10);
const z2 = new Mob(scene, w, MOB.ZOMBIE, 10, 60, 10);
z2.update(0.1, new THREE.Vector3(60, 60, 60), () => {}, [hurt], false);
check('a zombie next to a villager hits it', hurt.health < 20);

// A villager at night heads for a house door; by day it does not.
const v = new Mob(scene, w, MOB.VILLAGER, 0, 60, 0);
v.home = { x: 100, z: 100 };
check('a villager heads indoors at night', v.indoorTarget(true) !== null);
check('a villager stays out by day', v.indoorTarget(false) === null);
const target = v.indoorTarget(true);
check('the night target is a house doorway', HOUSES.some((h) => Math.abs(target.x - (100 + h.x + Math.floor(h.w / 2) + 0.5)) < 0.01 && Math.abs(target.z - (100 + h.z + h.doorZ + 0.5)) < 0.01));

// A villager standing at a closed door opens it. The door becomes open in both halves.
{
  const world = new World(scene, SEED, {}, {});
  world.update(8, 8, 2, 25);
  const door = { x: 20, y: 60, z: 20 };
  world.setBlock(door.x, door.y, door.z, DOOR.DOOR);
  world.setBlock(door.x, door.y + 1, door.z, DOOR.DOOR);
  check('a villager opens a closed door', world.openDoorAt(door.x, door.y, door.z) === true);
  check('both halves of the door are open', world.getBlock(door.x, door.y, door.z) === DOOR.OPEN_DOOR && world.getBlock(door.x, door.y + 1, door.z) === DOOR.OPEN_DOOR);
}

// Zombies spawn at night on dry ground: at night a land spawn is allowed without darkness.
{
  const world = new World(scene, SEED, {}, {});
  world.update(8, 8, 2, 25);
  const mm = new MobManager(scene, world, SEED);
  let spawned = 0;
  for (let i = 0; i < 200; i++) {
    const before = mm.mobs.length;
    mm.trySpawnOnLand({ x: 8, z: 8 }, MOB.ZOMBIE, true);
    if (mm.mobs.length > before) spawned++;
  }
  check('zombies can spawn on dry ground at night', spawned > 0);
}

// Models: a cow has patches, a dolphin has a fin, and an iron golem has vine patches.
check('a cow model has white patches', new Mob(scene, w, MOB.COW, 0, 60, 0).model.materials.length > 4);
check('a dolphin model has a dorsal fin', new Mob(scene, w, MOB.DOLPHIN, 0, 60, 0).model.group.children.length >= 5);
check('an iron golem model has vine patches', new Mob(scene, w, MOB.IRON_GOLEM, 0, 60, 0).model.group.children.length > 8);

// Every mob model colours every part. A missing palette colour makes THREE warn and draw black.
{
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  const kinds = [MOB.ZOMBIE, MOB.COW, MOB.SHEEP, MOB.PIG, MOB.RABBIT, MOB.CHICKEN, MOB.VILLAGER, MOB.IRON_GOLEM, MOB.FISH, MOB.DOLPHIN, MOB.SALMON, MOB.SQUID];
  for (const type of kinds) new Mob(scene, w, type, 0, 60, 0);
  console.warn = originalWarn;
  check('every mob model has all its colours (no THREE warnings)', warnings.length === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
