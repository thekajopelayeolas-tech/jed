import { placeStack, splitStack, moveStack } from '../src/stacks.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};
const st = (id = BLOCK.AIR, count = 0) => ({ id, count });

// Pick up a stack, then place it into an empty slot.
{
  const slot = st(BLOCK.STONE, 10);
  const cur = st();
  placeStack(slot, cur);
  check('pick up empties slot', slot.id === BLOCK.AIR && cur.count === 10);
  const empty = st();
  placeStack(empty, cur);
  check('place into empty slot', empty.id === BLOCK.STONE && empty.count === 10 && cur.id === BLOCK.AIR);
}

// Merging respects the 64 cap and leaves the remainder held.
{
  const slot = st(BLOCK.DIRT, 60);
  const cur = st(BLOCK.DIRT, 10);
  placeStack(slot, cur);
  check('merge caps at 64', slot.count === 64 && cur.count === 6 && cur.id === BLOCK.DIRT);
}

// Different items swap.
{
  const slot = st(BLOCK.STONE, 5);
  const cur = st(BLOCK.WOOD, 3);
  placeStack(slot, cur);
  check('swap different items', slot.id === BLOCK.WOOD && slot.count === 3 && cur.id === BLOCK.STONE && cur.count === 5);
}

// Right click takes half, rounding up.
{
  const slot = st(BLOCK.STONE, 7);
  const cur = st();
  splitStack(slot, cur);
  check('split takes ceil half', cur.count === 4 && slot.count === 3);
}

// Right click with a held stack puts down one item.
{
  const slot = st();
  const cur = st(BLOCK.STONE, 2);
  splitStack(slot, cur);
  check('put down one item', slot.id === BLOCK.STONE && slot.count === 1 && cur.count === 1);
}

// Shift click fills the partial stack first. 20 + 40 = 60, which fits, so nothing goes to an empty slot.
{
  const slots = [st(BLOCK.STONE, 40), st(), st(BLOCK.STONE, 20), st(), st()];
  const moved = moveStack(slots, 0, 1, 5);
  check('shift move fills partial stack to 60', slots[2].count === 60 && slots[1].id === BLOCK.AIR);
  check('shift move reports moved items', moved === 40);
  check('source cleared when fully moved', slots[0].id === BLOCK.AIR && slots[0].count === 0);
}

// Shift click that overflows keeps the remainder in the source slot.
{
  const slots = [st(BLOCK.STONE, 150), st(), st(), st()];
  const moved = moveStack(slots, 0, 1, 4);
  check('overflow moves 3 full stacks (192)', moved === 150 && slots[1].count === 64 && slots[2].count === 64 && slots[3].count === 22);
  check('overflow leaves nothing in source when it fits', slots[0].count === 0);
}

// Overflow that does not fit at all leaves the source stack intact.
{
  const slots = [st(BLOCK.STONE, 100), st(BLOCK.DIRT, 64)];
  const moved = moveStack(slots, 0, 1, 2);
  check('no room leaves source untouched', moved === 0 && slots[0].count === 100);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
