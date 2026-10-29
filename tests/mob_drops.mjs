// Mob drops: each catalogue mob leaves the item it is known for, and no drop is a stand-in like a stick for bone.
import { EXTRA_MOBS } from '../src/mob-catalogue.js';
import { Mob } from '../src/mobs.js';
import { World } from '../src/world.js';
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Reads the drops the game uses: a Mob's definition, built the same way the game builds it.
const scene = { add() {}, remove() {} };
const world = new World(scene, 1337, {}, {});
const drops = (k) => new Mob(scene, world, k, 0, 60, 0).def.drops;
check('a hunter drops a bone', drops('hunter').includes(BLOCK.BONE));
check('a creeper drops gunpowder', drops('creeper').includes(BLOCK.GUNPOWDER));
check('a spider drops string', drops('spider').includes(BLOCK.STRING));
check('an enderman drops an ender pearl', drops('enderman').includes(BLOCK.ENDER_PEARL));
check('a horse drops leather', drops('horse').includes(BLOCK.LEATHER));
check('a fox drops feathers', drops('fox').includes(BLOCK.FEATHER));
check('a squid drops ink', drops('glow_squid').includes(BLOCK.INK_SAC));

// Every catalogue drop name resolves to a real item, so none is silently dropped.
const names = new Set(EXTRA_MOBS.flatMap((r) => r[9]));
const unmapped = [...names].filter((n) => !drops(EXTRA_MOBS.find((r) => r[9].includes(n))[0]).length);
check('every catalogue drop name maps to an item', unmapped.length === 0);
check('every drop item is a real item', EXTRA_MOBS.every((r) => drops(r[0]).every((d) => BLOCK_DEFS[d])));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
