// Tests the furnace panel's slot-moving rules without a browser. Stacks are moved exactly as the UI does.
import { Inventory } from '../src/inventory.js';
import { BLOCK } from '../src/blocks.js';
import { Furnace } from '../src/smelting.js';
import { moveSlotToInventory } from '../src/furnace-ui.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Output moves to the inventory, leaving the furnace empty.
{
  const inv = new Inventory();
  const f = new Furnace();
  f.output = { id: BLOCK.COOKED_BEEF, count: 2 };
  moveSlotToInventory(inv, f.output);
  check('shift-moving output empties the output slot', f.output.id === BLOCK.AIR && f.output.count === 0);
  check('the cooked beef reaches the inventory', inv.countOf(BLOCK.COOKED_BEEF) === 2);
}

// Input and fuel move too.
{
  const inv = new Inventory();
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 3 };
  f.fuel = { id: BLOCK.COAL, count: 4 };
  moveSlotToInventory(inv, f.input);
  moveSlotToInventory(inv, f.fuel);
  check('shift-moving input moves raw beef to inventory', inv.countOf(BLOCK.BEEF) === 3 && f.input.id === BLOCK.AIR);
  check('shift-moving fuel moves coal to inventory', inv.countOf(BLOCK.COAL) === 4 && f.fuel.id === BLOCK.AIR);
}

// When the inventory is full, the leftover stays in the slot instead of being lost.
{
  const inv = new Inventory();
  for (const s of inv.slots) { s.id = BLOCK.STONE; s.count = 64; }
  const f = new Furnace();
  f.output = { id: BLOCK.COOKED_BEEF, count: 5 };
  moveSlotToInventory(inv, f.output);
  check('a full inventory keeps the items in the furnace slot', f.output.id === BLOCK.COOKED_BEEF && f.output.count === 5);
}

// Nothing is created: total items before and after moving are equal.
{
  const inv = new Inventory();
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 7 };
  f.output = { id: BLOCK.COOKED_BEEF, count: 9 };
  const before = 7 + 9;
  moveSlotToInventory(inv, f.input);
  moveSlotToInventory(inv, f.output);
  check('moving items never creates or loses any', inv.countOf(BLOCK.BEEF) + inv.countOf(BLOCK.COOKED_BEEF) + f.input.count + f.output.count === before);
}

// Closing keeps the furnace contents. Only F (takeAll) moves them out. The panel is built in a browser,
// so this is checked in the browser test. Here we check the rule that F uses: all three slots are moved.
{
  const inv = new Inventory();
  const f = new Furnace();
  f.input = { id: BLOCK.BEEF, count: 3 };
  f.fuel = { id: BLOCK.COAL, count: 4 };
  f.output = { id: BLOCK.COOKED_BEEF, count: 2 };
  for (const slot of [f.input, f.fuel, f.output]) moveSlotToInventory(inv, slot);
  check('F moves input, fuel and output into the inventory', inv.countOf(BLOCK.BEEF) === 3 && inv.countOf(BLOCK.COAL) === 4 && inv.countOf(BLOCK.COOKED_BEEF) === 2);
  check('after F the furnace is empty', f.input.count === 0 && f.fuel.count === 0 && f.output.count === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
