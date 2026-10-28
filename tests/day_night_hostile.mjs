// Hostile mobs: none spawn by day, and every hostile land mob burns in daylight. Peaceful mobs do not burn.
import { World } from '../src/world.js';
import { Mob, MobManager, MOB, HOSTILE_LAND } from '../src/mobs.js';
import { shouldBurn } from '../src/burning.js';
import { LIGHT, MAX_LIGHT } from '../src/lighting.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

// By day, a land spawn is never hostile: a long run of attempts at day gives no hostile mob.
{
  const mm = new MobManager(scene, w, 1337);
  for (let i = 0; i < 800; i++) mm.trySpawn({ x: 8, z: 8 }, 0.25);
  const hostile = mm.mobs.filter((m) => m.def.hostile);
  check('no hostile mob spawns by day', hostile.length === 0);
}

// Every hostile land mob burns in daylight; the peaceful ones do not.
const hostileKinds = [MOB.ZOMBIE, ...HOSTILE_LAND];
check('every hostile land mob is set to burn in daylight', hostileKinds.every((k) => new Mob(scene, w, k, 0, 60, 0).def.burnsInSun === true));
{
  const cow = new Mob(scene, w, MOB.COW, 8.5, 73, 8.5);
  const sky = { getBlock: () => 0, getLight: (x, y, z, ch) => (ch === LIGHT.SKY ? MAX_LIGHT : 0) };
  check('a peaceful mob does not burn in daylight', shouldBurn(cow, sky, 0.25) === false);
}

// A hostile mob in full daylight (sky light at the maximum, day time) catches fire.
{
  const m = new Mob(scene, w, MOB.HUNTER, 8.5, 73, 8.5);
  const sky = { getBlock: () => 0, getLight: (x, y, z, ch) => (ch === LIGHT.SKY ? MAX_LIGHT : 0) };
  check('a hostile mob burns at day under open sky', shouldBurn(m, sky, 0.25) === true);
  check('a hostile mob does not burn at night', shouldBurn(m, sky, 0.75) === false);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
