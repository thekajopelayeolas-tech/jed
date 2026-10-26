// Hunger model: 9 points, shown as 9 icons. Pure logic with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

export const MAX_HUNGER = 9;
// Seconds between natural hunger drops while standing or walking.
export const HUNGER_INTERVAL = 30;
// Sprinting uses hunger faster: time counts double toward the next drop.
export const SPRINT_HUNGER_MULT = 2;

function clamp(v) {
  return Math.max(0, Math.min(MAX_HUNGER, Math.floor(v)));
}

// Hunger points restored by each edible item id. Ids not listed here cannot be eaten.
// Raw beef gives 3 points. Cooked beef is better, giving 5. Rotten flesh is safe but poor (2 points).
export const FOOD_POINTS = {
  [BLOCK.BEEF]: 3,
  [BLOCK.COOKED_BEEF]: 5,
  [BLOCK.ROTTEN_FLESH]: 2,
  [BLOCK.RAW_MUTTON]: 2,
  [BLOCK.COOKED_MUTTON]: 4,
  [BLOCK.RAW_PORK]: 3,
  [BLOCK.COOKED_PORK]: 5,
  [BLOCK.RAW_RABBIT]: 2,
  [BLOCK.COOKED_RABBIT]: 4,
  [BLOCK.RAW_FISH]: 2,
  [BLOCK.COOKED_FISH]: 4,
};

export function foodPoints(id) {
  return FOOD_POINTS[id] ?? 0;
}

export class Hunger {
  constructor(value = MAX_HUNGER) {
    this.value = clamp(value);
    this.timer = 0;
  }

  // Drains hunger over time, faster while sprinting. Returns true if a point was lost this step.
  update(dt, sprinting = false) {
    if (this.value <= 0) return false;
    this.timer += dt * (sprinting ? SPRINT_HUNGER_MULT : 1);
    if (this.timer < HUNGER_INTERVAL) return false;
    this.timer -= HUNGER_INTERVAL;
    this.value = Math.max(0, this.value - 1);
    return true;
  }

  // Taking damage costs one hunger point.
  onDamage() {
    this.value = Math.max(0, this.value - 1);
  }

  // Eating adds the food's points, capped at the maximum. Returns the points actually restored.
  eat(points) {
    const before = this.value;
    this.value = clamp(this.value + points);
    return this.value - before;
  }

  get max() {
    return MAX_HUNGER;
  }

  // True when every point is filled. Health only regenerates while this is true.
  get full() {
    return this.value >= MAX_HUNGER;
  }
}
