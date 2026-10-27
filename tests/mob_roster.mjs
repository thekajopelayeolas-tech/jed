// The 80-mob roster in the game: every kind builds a model, the hostile and peaceful kinds behave as catalogued, and
// night spawns are hostile. Exits non-zero on failure.
import { World } from '../src/world.js';
import { Mob, MobManager, MOB, WATER_MOBS, HOSTILE_LAND } from '../src/mobs.js';
import { EXTRA_MOBS } from '../src/mob-catalogue.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

const row = (k) => EXTRA_MOBS.find((r) => r[0] === k);
const allKinds = EXTRA_MOBS.map((r) => r[0]);

// Every catalogue kind is a registered mob type, and builds a model with parts.
check('every catalogue kind is a mob type', allKinds.every((k) => Object.values(MOB).includes(k)));
const built = allKinds.map((k) => new Mob(scene, w, k, 0, 60, 0));
check('every catalogue kind builds a model', built.every((m) => m.model && m.model.group.children.length > 0));
check('every catalogue kind has a health and speed', built.every((m) => m.health > 0 && m.def.speed > 0));

// Hostile kinds attack; peaceful kinds do not.
check('the hostile catalogue kinds are hostile', allKinds.filter((k) => row(k)[2]).every((k) => new Mob(scene, w, k, 0, 60, 0).def.hostile === true));
check('the peaceful catalogue kinds are not hostile', allKinds.filter((k) => !row(k)[2]).every((k) => new Mob(scene, w, k, 0, 60, 0).def.hostile === false));

// Water kinds are the water ones, and only they are in the water list.
check('the water kinds are in the water list', EXTRA_MOBS.filter((r) => r[3]).every((r) => WATER_MOBS.includes(r[0])));
check('land kinds are not in the water list', EXTRA_MOBS.filter((r) => !r[3]).every((r) => !WATER_MOBS.includes(r[0])));

// Night land spawns are hostile: the zombie or a hostile catalogue kind.
{
  const mm = new MobManager(scene, w, 1337);
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const before = mm.mobs.length;
    mm.trySpawnOnLand({ x: 8, z: 8 }, MOB.ZOMBIE, true);
    if (mm.mobs.length > before) seen.add(mm.mobs[mm.mobs.length - 1].type);
  }
  check('night land spawns are hostile', [...seen].every((t) => t === MOB.ZOMBIE || HOSTILE_LAND.includes(t)));
}

// A catalogue mob dies from enough damage.
{
  const dead = new Mob(scene, w, allKinds[0], 8.5, 60, 8.5);
  dead.takeHit(1000, 0, 0);
  check('a catalogue mob dies from enough damage', dead.dead === true);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
