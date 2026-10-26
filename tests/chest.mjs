import { Chest, CHEST_SIZE, emptyChestInto } from '../src/chest.js';
import { BLOCK } from '../src/blocks.js';
import { STORAGE } from '../src/building.js';
import { BLOCK_DEFS } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import { RECIPES } from '../src/inventory.js';
import { breakTime, canHarvest } from '../src/mining.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A chest has 27 slots, all empty to start.
const c = new Chest();
check('a chest has 27 slots', c.slots.length === CHEST_SIZE && CHEST_SIZE === 27);
check('a new chest is empty', c.slots.every((s) => s.id === BLOCK.AIR && s.count === 0));

// Items stack up to 64 and fill empty slots.
check('adding stone fits', c.add(BLOCK.STONE, 64) === 0);
check('a full stack takes one slot', c.slots.filter((s) => s.id === BLOCK.STONE).length === 1);
check('a second stack goes to a new slot', c.add(BLOCK.STONE, 10) === 0 && c.slots.filter((s) => s.id === BLOCK.STONE).length === 2);

// A full chest returns what does not fit, and keeps what it had.
const full = new Chest();
for (let i = 0; i < CHEST_SIZE; i++) full.add(BLOCK.DIRT, 64);
check('a full chest returns the remainder', full.add(BLOCK.COAL, 5) === 5);

// Save and load keep the layout and contents.
const saved = c.toJSON();
const loaded = Chest.fromJSON(JSON.parse(JSON.stringify(saved)));
check('save keeps all 27 slots', saved.length === CHEST_SIZE);
check('load restores the stone count', loaded.slots.filter((s) => s.id === BLOCK.STONE).reduce((a, s) => a + s.count, 0) === 74);
check('an empty save loads as an empty chest', Chest.fromJSON(null).slots.every((s) => s.id === BLOCK.AIR));

// Breaking a chest gives back every stored item, so nothing is lost.
const dropped = [];
emptyChestInto(c, (id) => dropped.push(id), 0, 0, 0);
check('breaking a chest drops all 74 stone', dropped.filter((id) => id === BLOCK.STONE).length === 74);
check('a broken chest is empty afterwards', c.slots.every((s) => s.id === BLOCK.AIR));

// The chest is a placeable block with a texture, a recipe, and a mining time.
check('the chest is a placeable block', BLOCK_DEFS[STORAGE.CHEST].solid === true);
check('the chest has a texture', !!BLOCK_TILES[STORAGE.CHEST]);
check('the chest has a crafting recipe', RECIPES.some((r) => r.result === STORAGE.CHEST));
check('the chest is harvested with bare hands', canHarvest(STORAGE.CHEST, 0) === true);
check('an axe breaks a chest faster than bare hands', breakTime(STORAGE.CHEST, BLOCK.WOODEN_AXE) < breakTime(STORAGE.CHEST, 0));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
