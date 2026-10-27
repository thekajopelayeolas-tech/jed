// Furnace logic: smelting, fuel, and progress. Pure data and functions with no DOM or three.js.
import { BLOCK } from './blocks.js';

export const STACK_LIMIT = 64;
// Seconds to smelt one item.
export const SMELT_TIME = 10;

// What each input smelts into.
export const SMELT = {
  [BLOCK.BEEF]: BLOCK.COOKED_BEEF,
  [BLOCK.RAW_MUTTON]: BLOCK.COOKED_MUTTON,
  [BLOCK.RAW_PORK]: BLOCK.COOKED_PORK,
  [BLOCK.RAW_RABBIT]: BLOCK.COOKED_RABBIT,
  [BLOCK.RAW_FISH]: BLOCK.COOKED_FISH,
  [BLOCK.RAW_CHICKEN]: BLOCK.COOKED_CHICKEN,
  [BLOCK.IRON_ORE]: BLOCK.IRON_INGOT,
};

// Seconds of smelting that one fuel item pays for. Coal burns longest, then wood, then planks.
export const FUEL_SECONDS = {
  [BLOCK.COAL]: 15,
  [BLOCK.WOOD]: 10,
  [BLOCK.PLANKS]: 7,
};

export function smeltResult(id) {
  return SMELT[id] ?? null;
}

export function fuelSeconds(id) {
  return FUEL_SECONDS[id] ?? 0;
}

// Empties a furnace into the world: calls spawn(id, x, y, z) once per item held in the input, fuel,
// and output. Used when a furnace is broken, so its contents are never lost.
export function emptyFurnaceInto(f, spawn, x, y, z) {
  for (const slot of [f.input, f.fuel, f.output]) {
    for (let i = 0; i < slot.count; i++) spawn(slot.id, x, y, z);
    slot.id = BLOCK.AIR;
    slot.count = 0;
  }
}

export class Furnace {
  constructor() {
    this.input = { id: BLOCK.AIR, count: 0 };
    this.fuel = { id: BLOCK.AIR, count: 0 };
    this.output = { id: BLOCK.AIR, count: 0 };
    this.burnLeft = 0;
    this.burnTotal = 0;
    this.progress = 0;
  }

  // The output can take another item if it is empty, or holds the same item with room left.
  hasRoomFor(target) {
    return this.output.id === BLOCK.AIR || (this.output.id === target && this.output.count < STACK_LIMIT);
  }

  // Advances smelting by dt seconds. Fuel is only used while there is something to smelt and room for it.
  // Returns true if the output changed.
  update(dt) {
    const target = smeltResult(this.input.id);
    const canSmelt = target !== null && this.input.count > 0 && this.hasRoomFor(target);
    if (!canSmelt) {
      this.progress = 0;
      return false;
    }
    if (this.burnLeft <= 0) {
      const secs = fuelSeconds(this.fuel.id);
      if (this.fuel.count <= 0 || secs <= 0) return false;
      this.burnTotal = secs;
      this.burnLeft = secs;
      this.fuel.count -= 1;
      if (this.fuel.count === 0) this.fuel.id = BLOCK.AIR;
    }
    const step = Math.min(dt, this.burnLeft);
    this.burnLeft -= step;
    this.progress += step;
    if (this.progress < SMELT_TIME) return false;
    this.progress -= SMELT_TIME;
    this.input.count -= 1;
    if (this.input.count === 0) this.input.id = BLOCK.AIR;
    if (this.output.id === BLOCK.AIR) {
      this.output.id = target;
      this.output.count = 1;
    } else {
      this.output.count += 1;
    }
    return true;
  }

  // True while the furnace is actually smelting: fuel is burning and an item is being cooked.
  // The fire shows only then, so an idle furnace with fuel in it stays dark.
  isSmelting() {
    return this.burnLeft > 0 && smeltResult(this.input.id) !== null && this.input.count > 0 && this.hasRoomFor(smeltResult(this.input.id));
  }

  // Serialises the furnace for saving.
  toJSON() {
    return {
      input: { ...this.input },
      fuel: { ...this.fuel },
      output: { ...this.output },
      burnLeft: this.burnLeft,
      burnTotal: this.burnTotal,
      progress: this.progress,
    };
  }

  static fromJSON(data) {
    const f = new Furnace();
    if (!data) return f;
    f.input = { id: data.input?.id ?? BLOCK.AIR, count: data.input?.count ?? 0 };
    f.fuel = { id: data.fuel?.id ?? BLOCK.AIR, count: data.fuel?.count ?? 0 };
    f.output = { id: data.output?.id ?? BLOCK.AIR, count: data.output?.count ?? 0 };
    f.burnLeft = Math.max(0, data.burnLeft ?? 0);
    f.burnTotal = Math.max(0, data.burnTotal ?? 0);
    f.progress = Math.max(0, data.progress ?? 0);
    return f;
  }
}
