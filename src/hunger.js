// Vanilla-style hunger, saturation, and exhaustion. Pure logic so tests run in Node.
import { BLOCK } from './blocks.js';

export const MAX_HUNGER = 20;
export const MAX_SATURATION = 20;
export const EXHAUSTION_PER_HUNGER = 4;
export const MAX_EXHAUSTION = 40;

function clamp(v) {
  return Math.max(0, Math.min(MAX_HUNGER, Math.floor(v)));
}

// Food points and vanilla saturation modifiers. Eating restores points * modifier * 2 saturation.
export const FOOD = {
  [BLOCK.BEEF]: [3, 0.3], [BLOCK.COOKED_BEEF]: [8, 0.8],
  [BLOCK.ROTTEN_FLESH]: [4, 0.1],
  [BLOCK.RAW_MUTTON]: [2, 0.3], [BLOCK.COOKED_MUTTON]: [6, 0.8],
  [BLOCK.RAW_PORK]: [3, 0.3], [BLOCK.COOKED_PORK]: [8, 0.8],
  [BLOCK.RAW_RABBIT]: [3, 0.3], [BLOCK.COOKED_RABBIT]: [5, 0.6],
  [BLOCK.RAW_FISH]: [2, 0.1], [BLOCK.COOKED_FISH]: [5, 0.6],
  [BLOCK.BREAD]: [5, 0.6], [BLOCK.CAKE]: [2, 0.4], [BLOCK.COOKIES]: [2, 0.1],
  [BLOCK.STEW]: [6, 0.6], [BLOCK.RAW_CHICKEN]: [2, 0.3], [BLOCK.COOKED_CHICKEN]: [6, 0.6],
};
// Kept as a points-only lookup for callers that only need to check whether food is edible.
export const FOOD_POINTS = Object.fromEntries(Object.entries(FOOD).map(([id, [points]]) => [id, points]));

export function foodPoints(id) {
  return FOOD[id]?.[0] ?? 0;
}

export function foodSaturation(id) {
  const [points, modifier] = FOOD[id] ?? [0, 0];
  return points * modifier * 2;
}

export class Hunger {
  constructor(value = MAX_HUNGER, saturation = 5, exhaustion = 0) {
    this.value = clamp(value);
    this.saturation = Math.max(0, Math.min(this.value, saturation));
    this.exhaustion = Math.max(0, Math.min(MAX_EXHAUSTION, exhaustion));
  }

  // Activity accumulates exhaustion; each four points consume saturation before hunger.
  addExhaustion(amount) {
    if (Number.isFinite(amount) && amount > 0) this.exhaustion = Math.min(MAX_EXHAUSTION, this.exhaustion + amount);
  }

  update() {
    let lostHunger = false;
    while (this.exhaustion >= EXHAUSTION_PER_HUNGER) {
      this.exhaustion -= EXHAUSTION_PER_HUNGER;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else if (this.value > 0) {
        this.value--;
        lostHunger = true;
      }
    }
    return lostHunger;
  }

  // Eating restores hunger and saturation. Returns the hunger points actually restored.
  eat(points, saturation = 0) {
    const before = this.value;
    this.value = clamp(this.value + points);
    this.saturation = Math.min(this.value, MAX_SATURATION, this.saturation + Math.max(0, saturation));
    return this.value - before;
  }

  get max() {
    return MAX_HUNGER;
  }

  // Vanilla natural regeneration is available above 18 hunger points.
  get full() {
    return this.value >= MAX_HUNGER;
  }
}
