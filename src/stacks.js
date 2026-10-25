import { BLOCK } from './blocks.js';

export const STACK_MAX = 64;

// Pure stack rules used by the inventory screen. A stack is {id, count}. `cursor` is the held stack.

// Left click on a slot: pick up, place, merge, or swap. Mutates `slot` and `cursor`.
export function placeStack(slot, cursor) {
  if (cursor.id === BLOCK.AIR) {
    if (slot.id === BLOCK.AIR) return;
    cursor.id = slot.id;
    cursor.count = slot.count;
    slot.id = BLOCK.AIR;
    slot.count = 0;
    return;
  }
  if (slot.id === BLOCK.AIR) {
    slot.id = cursor.id;
    slot.count = cursor.count;
    cursor.id = BLOCK.AIR;
    cursor.count = 0;
    return;
  }
  if (slot.id === cursor.id && slot.count < STACK_MAX) {
    const take = Math.min(STACK_MAX - slot.count, cursor.count);
    slot.count += take;
    cursor.count -= take;
    if (cursor.count === 0) cursor.id = BLOCK.AIR;
    return;
  }
  // Different items: swap the held stack with the slot.
  [slot.id, cursor.id] = [cursor.id, slot.id];
  [slot.count, cursor.count] = [cursor.count, slot.count];
}

// Right click on a slot: with an empty cursor, take half. With a held stack, put down one item.
export function splitStack(slot, cursor) {
  if (cursor.id === BLOCK.AIR) {
    if (slot.id === BLOCK.AIR || slot.count < 2) return;
    const half = Math.ceil(slot.count / 2);
    cursor.id = slot.id;
    cursor.count = half;
    slot.count -= half;
    return;
  }
  if (slot.id === BLOCK.AIR) {
    slot.id = cursor.id;
    slot.count = 1;
  } else if (slot.id === cursor.id && slot.count < STACK_MAX) {
    slot.count += 1;
  } else {
    return;
  }
  cursor.count -= 1;
  if (cursor.count === 0) cursor.id = BLOCK.AIR;
}

// Shift click: move a whole stack from slots[i] into slots[targetFrom..targetTo).
// Fills matching stacks first, then empty slots. Returns the number of items moved.
export function moveStack(slots, i, targetFrom, targetTo) {
  const slot = slots[i];
  if (slot.id === BLOCK.AIR) return 0;
  let remaining = slot.count;
  for (let j = targetFrom; j < targetTo && remaining > 0; j++) {
    const t = slots[j];
    if (t.id === slot.id && t.count < STACK_MAX) {
      const take = Math.min(STACK_MAX - t.count, remaining);
      t.count += take;
      remaining -= take;
    }
  }
  for (let j = targetFrom; j < targetTo && remaining > 0; j++) {
    const t = slots[j];
    if (t.id === BLOCK.AIR) {
      const take = Math.min(STACK_MAX, remaining);
      t.id = slot.id;
      t.count = take;
      remaining -= take;
    }
  }
  const moved = slot.count - remaining;
  slot.count = remaining;
  if (remaining === 0) slot.id = BLOCK.AIR;
  return moved;
}
