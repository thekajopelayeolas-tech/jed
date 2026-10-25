import { matchRecipe, RECIPES } from '../src/inventory.js';
import { BLOCK } from '../src/blocks.js';

// Lay out a 3x3 grid from rows of ids. Each row is padded to 3 columns and rows stack top to bottom.
const grid = (rows) => {
  const out = Array(9).fill(0);
  rows.forEach((row, r) => row.forEach((id, c) => { out[r * 3 + c] = id; }));
  return out;
};
const P = BLOCK.PLANKS, S = BLOCK.STICK, C = BLOCK.COBBLESTONE, W = BLOCK.WOOL, I = BLOCK.IRON_INGOT;

const cases = {
  'wooden pickaxe': [[P, P, P], [0, S, 0], [0, S, 0]],
  'wooden axe': [[P, P, 0], [P, S, 0], [0, S, 0]],
  'wooden sword': [[P], [P], [S]],
  'stone pickaxe': [[C, C, C], [0, S, 0], [0, S, 0]],
  'stone sword': [[C], [C], [S]],
  'iron pickaxe': [[I, I, I], [0, S, 0], [0, S, 0]],
  'iron sword': [[I], [I], [S]],
  'bed': [[W, W, W], [P, P, P]],
  'sticks': [[P], [P]],
};

let failed = 0;
for (const [name, rows] of Object.entries(cases)) {
  const r = matchRecipe(grid(rows), 3);
  const ok = !!r;
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? `-> result ${r.result} x${r.count}` : '');
}
console.log('recipes defined:', RECIPES.length, 'failed:', failed);
