// Diamond gear is better than iron gear: each diamond tool mines faster and hits harder, and each piece blocks more.
import { BLOCK, TOOL_ITEMS } from '../src/blocks.js';
import { armourInfo } from '../src/armour.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// There is no iron axe in the game, so the axe is compared with the stone axe, the tier below diamond.
const pairs = [
  ['pickaxe', BLOCK.IRON_PICKAXE, BLOCK.DIAMOND_PICKAXE],
  ['axe', BLOCK.STONE_AXE, BLOCK.DIAMOND_AXE],
  ['sword', BLOCK.IRON_SWORD, BLOCK.DIAMOND_SWORD],
];
for (const [name, iron, diamond] of pairs) {
  const i = TOOL_ITEMS[iron];
  const d = TOOL_ITEMS[diamond];
  check(`a diamond ${name} mines faster than an iron one`, d.speed > i.speed);
  check(`a diamond ${name} hits harder than an iron one`, d.damage > i.damage);
}

const parts = [
  ['helmet', BLOCK.IRON_HELMET, BLOCK.DIAMOND_HELMET],
  ['chest', BLOCK.IRON_CHEST, BLOCK.DIAMOND_CHEST],
  ['legs', BLOCK.IRON_LEGS, BLOCK.DIAMOND_LEGS],
  ['boots', BLOCK.IRON_BOOTS, BLOCK.DIAMOND_BOOTS],
];
for (const [part, iron, diamond] of parts) {
  check(`a diamond ${part} blocks more than an iron one`, armourInfo(diamond).defence > armourInfo(iron).defence);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
