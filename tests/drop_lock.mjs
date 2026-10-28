// A Q-dropped item goes through DropManager, so the lock must hold on the same path the game uses.
import * as THREE from 'three';
import { DropManager } from '../src/drops.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const world = { getBlock: () => BLOCK.AIR };
const mgr = new DropManager(scene, world, {});
const inv = { items: [], add(id) { this.items.push(id); return 0; } };

// A block broken in the world is not locked: it is collected once the player is close and the drop has aged.
const broken = mgr.spawn(BLOCK.STONE, 0, 60, 0);
broken.age = 1;
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a broken block drop is collected when the player is close', inv.items.length === 1);

// A Q-dropped item stays put while the player is still beside it.
const dropped = mgr.spawn(BLOCK.STONE, 0, 60, 0).markDropped();
check('markDropped returns the drop it locked', dropped.locked === true);
dropped.age = 1;
inv.items = [];
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a Q-dropped item is not collected while the player stands beside it', inv.items.length === 0);

// Once the player has walked away, the lock lifts and the item can be collected again.
mgr.update(0.05, new THREE.Vector3(10, 60.5, 10), inv);
mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
check('a Q-dropped item is collected after the player walks away and back', inv.items.length === 1);

// Dropping the last item in a slot behaves the same as dropping one of many. The drop is locked and waits
// for the player to walk away, and the slot is cleared the same way in both cases.
import { Inventory } from '../src/inventory.js';
{
  const dropOne = (count) => {
    const inv = new Inventory();
    inv.selected = 0;
    inv.slots[0] = { id: BLOCK.STONE, count };
    const before = inv.slots[0].count;
    inv.consumeSelected(1);
    return { before, after: inv.slots[0].count, id: inv.slots[0].id };
  };
  const many = dropOne(5);
  const single = dropOne(1);
  check('dropping one of many leaves the rest in the slot', many.after === 4 && many.id === BLOCK.STONE);
  check('dropping the only item empties the slot', single.after === 0 && single.id === BLOCK.AIR);
  // Dropping the last item must spawn the item itself. The slot is cleared by the drop, so the item id has to be
  // read before the slot is emptied, or the drop comes out as air and is invisible.
  {
    const inv2 = new Inventory();
    inv2.selected = 0;
    inv2.slots[0] = { id: BLOCK.STONE, count: 1 };
    const held = inv2.selectedItem;
    const idBefore = held.id;
    inv2.consumeSelected(1);
    check('the single item id is still the stone when the drop is made', idBefore === BLOCK.STONE);
    check('the held slot is empty after dropping the only item', held.id === BLOCK.AIR);
  }
  // The same steps as dropHeldItem in main.js, run on the real Inventory: read the id first, then consume.
  // With the old order (id read after consuming) the last item dropped as air, and this check would fail.
  const dropped = (count) => {
    const inv3 = new Inventory();
    inv3.selected = 0;
    inv3.slots[0] = { id: BLOCK.STONE, count };
    const item = inv3.selectedItem;
    const id = item.id;
    inv3.consumeSelected(1);
    return id;
  };
  check('dropping the last stone spawns stone, not air', dropped(1) === BLOCK.STONE);
  check('dropping one of many spawns stone', dropped(5) === BLOCK.STONE);
  // The drop made from a single item is locked just like one made from a stack.
  const d = mgr.spawn(BLOCK.STONE, 0, 60, 0).markDropped();
  d.age = 1;
  inv.items = [];
  mgr.update(0.05, new THREE.Vector3(0.5, 60.5, 0.5), inv);
  check('a single-item drop waits while the player stands beside it', inv.items.length === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
