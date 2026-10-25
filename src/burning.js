import { BLOCK } from './blocks.js';
import { LIGHT, MAX_LIGHT } from './lighting.js';

// Zombies catch fire in daylight when they can see the sky. Each burn tick deals 1 damage.
export const BURN_TICK = 1; // seconds between burn ticks
export const BURN_DAMAGE = 1;
const DAYLIGHT_SKY = MAX_LIGHT; // full sky light means exposed to the sun

// A mob burns when it is a hostile type, it is day, and the cell over its head has full sky light.
// Water above the head also puts the fire out.
export function shouldBurn(mob, world, timeOfDay) {
  if (!mob.def.burnsInSun) return false;
  const day = timeOfDay < 0.5;
  if (!day) return false;
  const hx = Math.floor(mob.pos.x);
  const hz = Math.floor(mob.pos.z);
  const hy = Math.floor(mob.pos.y + mob.height);
  if (world.getBlock(hx, hy, hz) === BLOCK.WATER) return false;
  return world.getLight(hx, hy, hz, LIGHT.SKY) >= DAYLIGHT_SKY;
}

// Accumulates burn time for a mob. Returns the damage to apply this frame (0 if none).
export function burnStep(mob, dt, burning) {
  if (!burning) {
    mob.burnTimer = 0;
    return 0;
  }
  mob.burnTimer = (mob.burnTimer ?? 0) + dt;
  if (mob.burnTimer >= BURN_TICK) {
    mob.burnTimer -= BURN_TICK;
    return BURN_DAMAGE;
  }
  return 0;
}
