import { World } from '../src/world.js';
import { DropManager } from '../src/drops.js';
import { Inventory } from '../src/inventory.js';
import { Mob, MOB, pickPassiveMob } from '../src/mobs.js';
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
check('a sheep drops wool', sheep.def.drop === BLOCK.WOOL);
check('wool is a block with a texture, so it can be placed and dropped', !!BLOCK_TILES[BLOCK.WOOL]);

// Killing the sheep spawns wool, the same way the game does when a mob dies.
{
  const drops = new DropManager(scene, w, {});
  const inv = new Inventory();
  const died = sheep.takeHit(100, 0, 0);
  check('lethal damage kills the sheep', died === true && sheep.dead === true);
  drops.spawn(sheep.def.drop, sheep.pos.x, sheep.pos.y, sheep.pos.z);
  check('the kill spawns one wool drop', drops.items.length === 1 && drops.items[0].id === BLOCK.WOOL);
  const at = new THREE.Vector3(drops.items[0].pos.x, drops.items[0].pos.y, drops.items[0].pos.z);
  for (let t = 0; t < 4; t += 1 / 60) drops.update(1 / 60, at, inv);
  check('the wool is picked up into the inventory', inv.countOf(BLOCK.WOOL) === 1);
}

// A cow still drops beef, so the sheep change does not affect cows.
{
  const cow = new Mob(scene, w, MOB.COW, 8.5, 60, 8.5);
  cow.takeHit(100, 0, 0);
  check('a cow still drops beef', cow.def.drop === BLOCK.BEEF);
}

// Passive spawns include sheep, and both kinds appear.
{
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(pickPassiveMob());
  check('passive spawns include sheep', seen.has(MOB.SHEEP));
  check('passive spawns include cows', seen.has(MOB.COW));
  check('passive spawns are only cows or sheep', [...seen].every((t) => t === MOB.COW || t === MOB.SHEEP));
}

// Wool is a placeable block, not an item, so it still behaves as the world's block.
check('wool is not treated as an item', !isItem(BLOCK.WOOL));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
