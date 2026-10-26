import { Furnace, SMELT_TIME, smeltResult, fuelSeconds } from '../src/smelting.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// What smelts into what.
check('raw beef cooks into cooked beef', smeltResult(BLOCK.BEEF) === BLOCK.COOKED_BEEF);
check('iron ore smelts into an iron ingot', smeltResult(BLOCK.IRON_ORE) === BLOCK.IRON_INGOT);
check('stone does not smelt', smeltResult(BLOCK.STONE) === null);

// Fuel: coal and wood burn, other things do not.
check('coal is fuel', fuelSeconds(BLOCK.COAL) > 0);
check('wood is fuel', fuelSeconds(BLOCK.WOOD) > 0);
check('dirt is not fuel', fuelSeconds(BLOCK.DIRT) === 0);

// Cooking raw beef with coal: 10 seconds per item, coal lasts 15 seconds.
const f = new Furnace();
f.input = { id: BLOCK.BEEF, count: 2 };
f.fuel = { id: BLOCK.COAL, count: 1 };
f.update(SMELT_TIME + 0.01);
check('one beef cooks in 10 seconds', f.output.id === BLOCK.COOKED_BEEF && f.output.count === 1);
check('one beef left in the input', f.input.count === 1);
check('fuel is used up when burning starts', f.fuel.count === 0);

// Coal is consumed once per burn. The second beef needs fuel, which runs out, so it stops.
f.update(20);
check('no fuel left, so the second beef stops', f.output.count === 1 && f.input.count === 1);

// Wood fuel: one wood burns 10 seconds and smelts exactly one item.
// Step in small frames, as the game does, then give the last smelt a little time to finish.
const w = new Furnace();
w.input = { id: BLOCK.IRON_ORE, count: 3 };
w.fuel = { id: BLOCK.WOOD, count: 2 };
for (let i = 0; i < 25 * 10; i++) w.update(0.1);
check('wood smelts iron ore (2 ingots from 2 wood)', w.output.id === BLOCK.IRON_INGOT && w.output.count === 2);
check('both wood are used up', w.fuel.count === 0);

// Without fuel, nothing cooks.
const n = new Furnace();
n.input = { id: BLOCK.BEEF, count: 1 };
n.update(100);
check('no fuel means no cooking', n.output.id === BLOCK.AIR && n.input.count === 1);

// Without an input, fuel is not wasted.
const e = new Furnace();
e.fuel = { id: BLOCK.COAL, count: 1 };
e.update(10);
check('no input means fuel is kept', e.fuel.count === 1);

// Output stack cannot exceed 64 items.
const full = new Furnace();
full.input = { id: BLOCK.BEEF, count: 5 };
full.fuel = { id: BLOCK.COAL, count: 5 };
full.output = { id: BLOCK.COOKED_BEEF, count: 64 };
full.update(SMELT_TIME * 3);
check('output stops at a full stack of 64', full.output.count === 64 && full.input.count === 5);

// Progress resets when input runs out.
const r = new Furnace();
r.input = { id: BLOCK.BEEF, count: 1 };
r.fuel = { id: BLOCK.COAL, count: 1 };
r.update(5);
r.input = { id: BLOCK.AIR, count: 0 };
r.update(1);
check('progress resets when input is removed', r.progress === 0);

// Save and load round-trip keeps the furnace contents.
const s = new Furnace();
s.input = { id: BLOCK.IRON_ORE, count: 4 };
s.fuel = { id: BLOCK.COAL, count: 3 };
s.output = { id: BLOCK.IRON_INGOT, count: 2 };
s.update(4);
const restored = Furnace.fromJSON(JSON.parse(JSON.stringify(s)));
check('furnace round-trips through save data',
  restored.input.id === s.input.id && restored.input.count === s.input.count &&
  restored.fuel.count === s.fuel.count && restored.output.count === s.output.count &&
  Math.abs(restored.progress - s.progress) < 1e-9);
check('loading an empty save gives an empty furnace', Furnace.fromJSON(null).input.count === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
