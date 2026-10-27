import { World } from '../src/world.js';
import { DropManager } from '../src/drops.js';
import { Inventory } from '../src/inventory.js';
import { Mob, MOB, pickPassiveMob } from '../src/mobs.js';
import { EXTRA_MOBS } from '../src/mob-catalogue.js';
import { BLOCK, isItem } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

// A sheep is a passive mob with wool as its drop.
const sheep = new Mob(scene, w, MOB.SHEEP, 8.5, 60, 8.5);
check('a sheep is passive (not hostile)', sheep.def.hostile === false);
check('a sheep drops wool', sheep.def.drops.includes(BLOCK.WOOL));
check('a sheep drops raw mutton (meat)', sheep.def.drops.includes(BLOCK.RAW_MUTTON));
check('wool is a block with a texture, so it can be placed and dropped', !!BLOCK_TILES[BLOCK.WOOL]);

// Killing the sheep spawns wool, the same way the game does when a mob dies.
{
  const drops = new DropManager(scene, w, {});
  const inv = new Inventory();
  const died = sheep.takeHit(100, 0, 0);
  check('lethal damage kills the sheep', died === true && sheep.dead === true);
  for (const id of sheep.def.drops) drops.spawn(id, sheep.pos.x, sheep.pos.y, sheep.pos.z);
  check('the kill spawns one wool and one mutton drop', drops.items.length === 2 && drops.items.some((d) => d.id === BLOCK.WOOL) && drops.items.some((d) => d.id === BLOCK.RAW_MUTTON));
  const at = new THREE.Vector3(drops.items[0].pos.x, drops.items[0].pos.y, drops.items[0].pos.z);
  for (let t = 0; t < 4; t += 1 / 60) drops.update(1 / 60, at, inv);
  check('the wool is picked up into the inventory', inv.countOf(BLOCK.WOOL) === 1);
  check('the mutton is picked up into the inventory', inv.countOf(BLOCK.RAW_MUTTON) === 1);
}

// A cow still drops beef, so the sheep change does not affect cows.
{
  const cow = new Mob(scene, w, MOB.COW, 8.5, 60, 8.5);
  cow.takeHit(100, 0, 0);
  check('a cow still drops beef', cow.def.drops.length === 1 && cow.def.drops[0] === BLOCK.BEEF);
}

// Passive spawns include sheep, and both kinds appear.
{
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(pickPassiveMob());
  check('passive spawns include sheep', seen.has(MOB.SHEEP));
  check('passive spawns include cows', seen.has(MOB.COW));
  check('passive spawns include pigs', seen.has(MOB.PIG));
  check('passive spawns include rabbits', seen.has(MOB.RABBIT));
  // Land passive spawns are peaceful land mobs: the original five, or a peaceful kind from the catalogue.
  const peacefulLand = [MOB.COW, MOB.SHEEP, MOB.PIG, MOB.RABBIT, MOB.CHICKEN, ...EXTRA_MOBS.filter((r) => !r[2] && !r[3]).map((r) => r[0])];
  check('land passive spawns are peaceful land mobs', [...seen].every((t) => peacefulLand.includes(t)));
check('passive spawns include chickens', seen.has(MOB.CHICKEN));
}

// Wool is a placeable block, not an item, so it still behaves as the world's block.
check('wool is not treated as an item', !isItem(BLOCK.WOOL));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
