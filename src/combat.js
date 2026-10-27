// Shields, bows, and arrows. Pure rules with no DOM or three.js, so tests run in Node.
// main.js does the drawing, the arrow's flight, and collisions. These functions decide the numbers.
import { BLOCK } from './blocks.js';

// Shield: while held up, it blocks all damage from the front. A hit from the side or back still hurts.
export const SHIELD_BLOCK = 1;

// Bow: the longer it is drawn, the stronger the arrow. A full draw takes this many seconds.
export const BOW_FULL_DRAW = 1.0;
// An arrow's damage at the least draw and at a full draw. A quick tap still shoots, but weakly.
export const ARROW_MIN_DAMAGE = 2;
export const ARROW_MAX_DAMAGE = 9;
// Arrow speed in blocks per second, and how many seconds it flies before it drops.
export const ARROW_SPEED = 40;
export const ARROW_LIFETIME = 4;

// How far the bow is drawn, from 0 (just pressed) to 1 (full draw).
export function drawAmount(seconds) {
  return Math.max(0, Math.min(1, seconds / BOW_FULL_DRAW));
}

// The damage an arrow does for a given draw amount (0..1).
export function arrowDamage(draw) {
  const d = Math.max(0, Math.min(1, draw));
  return ARROW_MIN_DAMAGE + (ARROW_MAX_DAMAGE - ARROW_MIN_DAMAGE) * d;
}

// The damage the player takes from one hit. `facingHit` is true when the attack comes from the front, so the
// raised shield is between the player and the attacker. A shield held up in front blocks the whole hit.
export function damageThroughShield(amount, shieldUp, facingHit) {
  if (shieldUp && facingHit) return amount * (1 - SHIELD_BLOCK);
  return amount;
}

// True for the three combat items, so a click on one of them is handled as combat, not as building.
export function isCombatItem(id) {
  return id === BLOCK.BOW || id === BLOCK.SHIELD || id === BLOCK.ARROW;
}
