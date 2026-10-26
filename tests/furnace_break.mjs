import { DropManager } from '../src/drops.js';
import { BLOCK } from '../src/blocks.js';
import { Furnace, emptyFurnaceInto } from '../src/smelting.js';
import { Inventory } from '../src/inventory.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Minimal scene and world: drops need only add/remove and a block lookup.
const added = new Set();
const scene = { add: (o) => added.add(o), remove: (o) => added.delete(o) };
const world = { getBlock: () => BLOCK.AIR };
const atlas = {};

// Spawns the drops a broken furnace gives, using the same function the game uses.
function dropContents(manager, f, x, y, z) {
  emptyFurnaceInto(f, (id, dx, dy, dz) => manager.spawn(id, dx, dy, dz), x, y, z);
}

// A furnace holding items in all three slots gives every item back as a drop.
{
  const drops = new DropManager(scene, world, atlas);
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 3 };
  f.fuel = { id: BLOCK.COAL, count: 4 };
  f.output = { id: BLOCK.COOKED_BEEF, count: 2 };
  dropContents(drops, f, 5, 70, 5);
  const byId = {};
  for (const d of drops.items) byId[d.id] = (byId[d.id] || 0) + 1;
  check('raw beef drops (3)', byId[BLOCK.BEEF] === 3);
  check('coal drops (4)', byId[BLOCK.COAL] === 4);
  check('cooked beef drops (2)', byId[BLOCK.COOKED_BEEF] === 2);
  check('the furnace slots are empty afterwards', f.input.count === 0 && f.fuel.count === 0 && f.output.count === 0);
}

// Drops land at the furnace's block, so they start where the furnace was.
{
  const drops = new DropManager(scene, world, atlas);
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 1 };
  dropContents(drops, f, 5, 70, 5);
  const p = drops.items[0].pos;
  check('the drop starts at the furnace position', Math.abs(p.x - 5.5) < 1 && Math.abs(p.z - 5.5) < 1);
}

// Every dropped item can be picked up into the inventory, so none is lost.
{
  const drops = new DropManager(scene, world, atlas);
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 2 };
  f.fuel = { id: BLOCK.COAL, count: 2 };
  dropContents(drops, f, 5, 70, 5);
  const inv = new Inventory();
  const playerPos = new THREE.Vector3(5.5, 70, 5.5);
  for (let t = 0; t < 5; t += 1 / 60) drops.update(1 / 60, playerPos, inv);
  check('all dropped beef is picked up', inv.countOf(BLOCK.BEEF) === 2);
  check('all dropped coal is picked up', inv.countOf(BLOCK.COAL) === 2);
}

// Cost check: a full 64-item stack in each slot gives 192 drops. Each drop is one mesh, so the world
// holds that many. This test documents the count rather than asserting a limit.
{
  const drops = new DropManager(scene, world, atlas);
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 64 };
  f.fuel = { id: BLOCK.COAL, count: 64 };
  f.output = { id: BLOCK.COOKED_BEEF, count: 64 };
  dropContents(drops, f, 5, 70, 5);
  check('a full furnace gives 192 drops (one per item)', drops.items.length === 192);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
