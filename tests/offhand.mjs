// The off-hand: a separate slot that carries the shield in the left hand. Exits non-zero on failure.
import { Inventory } from '../src/inventory.js';
import { BLOCK } from '../src/blocks.js';
import { saveGame, loadGame } from '../src/save.js';
import { World } from '../src/world.js';
import { Player } from '../src/player.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A new inventory has an empty off-hand.
const inv = new Inventory();
check('the off-hand starts empty', inv.offhand.id === BLOCK.AIR && !inv.hasOffhandShield());

// A shield in a hotbar slot moves to the off-hand, and frees that slot.
inv.slots[3] = { id: BLOCK.SHIELD, count: 1 };
check('a shield in the hotbar moves to the off-hand', inv.equipOffhand(3) === true);
check('the off-hand holds the shield', inv.hasOffhandShield());
check('the hotbar slot it came from is now empty', inv.slots[3].id === BLOCK.AIR && inv.slots[3].count === 0);

// Only one shield fits in the off-hand: a second one stays in the hotbar.
inv.slots[5] = { id: BLOCK.SHIELD, count: 1 };
check('a second shield does not go into the full off-hand', inv.equipOffhand(5) === false);
check('the second shield stays in its hotbar slot', inv.slots[5].id === BLOCK.SHIELD);

// The off-hand is not part of the inventory count: with the shield in the off-hand, the hotbar shield is the only one counted.
check('countOf sees only the hotbar shield, not the off-hand one', inv.countOf(BLOCK.SHIELD) === 1);

// Taking the shield back out puts it in the inventory and empties the off-hand.
// Each slot is its own object here: fill() would share one object across every slot.
inv.slots = inv.slots.map(() => ({ id: BLOCK.AIR, count: 0 }));
check('the shield returns to the inventory', inv.unequipOffhand() === true);
check('the off-hand is empty after it returns', !inv.hasOffhandShield());
check('the returned shield is in the inventory', inv.countOf(BLOCK.SHIELD) === 1);

// Only a shield can go in the off-hand.
inv.slots[0] = { id: BLOCK.STONE, count: 4 };
check('a stone cannot go in the off-hand', inv.equipOffhand(0) === false);

// The off-hand survives a save and reload.
const storage = new Map();
globalThis.localStorage = { setItem: (k, v) => storage.set(k, v), getItem: (k) => storage.get(k) ?? null, removeItem: (k) => storage.delete(k) };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
const scene = { add() {}, remove() {} };
const world = new World(scene, 1337, {}, {});
const player = new Player(world, 5, 10, 5);
inv.offhand = { id: BLOCK.SHIELD, count: 1 };
saveGame(world, player, inv, 0.25, new Map(), new Map(), null);
const loaded = loadGame();
check('the off-hand shield is saved', loaded?.offhand?.id === BLOCK.SHIELD && loaded.offhand.count === 1);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
