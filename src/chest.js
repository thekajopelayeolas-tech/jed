// Chest storage: 27 slots, like a single chest in the usual game. Pure data with no DOM or three.js,
// so tests run in Node. Each chest is kept per block position in main.js, like furnaces.
import { BLOCK } from './blocks.js';

export const CHEST_SIZE = 27;
const STACK_LIMIT = 64;

export class Chest {
  constructor() {
    this.slots = Array.from({ length: CHEST_SIZE }, () => ({ id: BLOCK.AIR, count: 0 }));
  }

  // Adds items, stacking up to 64. Returns the number that did not fit.
  add(id, count = 1) {
    if (id === BLOCK.AIR) return 0;
    let remaining = count;
    for (const s of this.slots) {
      if (s.id === id && s.count < STACK_LIMIT) {
        const take = Math.min(STACK_LIMIT - s.count, remaining);
        s.count += take;
        remaining -= take;
        if (remaining === 0) return 0;
      }
    }
    for (const s of this.slots) {
      if (s.id === BLOCK.AIR) {
        const take = Math.min(STACK_LIMIT, remaining);
        s.id = id;
        s.count = take;
        remaining -= take;
        if (remaining === 0) return 0;
      }
    }
    return remaining;
  }

  // Serialises the chest for saving. Empty slots are kept so the layout stays the same after loading.
  toJSON() {
    return this.slots.map((s) => ({ id: s.id, count: s.count }));
  }

  static fromJSON(data) {
    const c = new Chest();
    if (!Array.isArray(data)) return c;
    data.slice(0, CHEST_SIZE).forEach((s, i) => {
      c.slots[i] = { id: s?.id ?? BLOCK.AIR, count: s?.count ?? 0 };
    });
    return c;
  }
}

// Empties a chest into the world: calls spawn(id, x, y, z) once per item held. Used when a chest is broken,
// so its contents are never lost.
export function emptyChestInto(c, spawn, x, y, z) {
  for (const slot of c.slots) {
    for (let i = 0; i < slot.count; i++) spawn(slot.id, x, y, z);
    slot.id = BLOCK.AIR;
    slot.count = 0;
  }
}
