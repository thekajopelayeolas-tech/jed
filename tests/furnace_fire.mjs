import { Furnace, SMELT_TIME } from '../src/smelting.js';
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';
import { FURNACE_STATE } from '../src/building.js';
import { BLOCK_TILES } from '../src/textures.js';
import { blockInfo } from '../src/mining.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The fire shows only while the furnace is actually smelting.
const idle = new Furnace();
idle.fuel = { id: BLOCK.COAL, count: 1 };
check('fuel with nothing to smelt does not show a fire', idle.isSmelting() === false);

const cooking = new Furnace();
cooking.input = { id: BLOCK.BEEF, count: 2 };
cooking.fuel = { id: BLOCK.COAL, count: 1 };
check('no fire before the fuel starts burning', cooking.isSmelting() === false);
cooking.update(0.1);
check('a fire shows once fuel is burning and an item is cooking', cooking.isSmelting() === true);

// When the input runs out, the fire goes out.
cooking.input = { id: BLOCK.AIR, count: 0 };
check('the fire goes out when nothing is left to smelt', cooking.isSmelting() === false);

// A full output stops smelting, so the fire goes out too.
const full = new Furnace();
full.input = { id: BLOCK.BEEF, count: 3 };
full.fuel = { id: BLOCK.COAL, count: 1 };
full.output = { id: BLOCK.COOKED_BEEF, count: 64 };
full.update(0.1);
check('a full output stops the fire', full.isSmelting() === false);

// The lit furnace is a placeable block with its own texture and definition, and mined as a furnace.
check('the lit furnace has a texture', !!BLOCK_TILES[FURNACE_STATE.LIT]);
check('the lit furnace is a solid block', BLOCK_DEFS[FURNACE_STATE.LIT].solid === true);
check('the lit furnace is mined like a furnace', blockInfo(FURNACE_STATE.LIT).tier === blockInfo(BLOCK.FURNACE).tier);
check('the lit furnace id is free of the others', FURNACE_STATE.LIT !== BLOCK.FURNACE);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
