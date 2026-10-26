// Swimming rules. Pure functions with no DOM or three.js, so tests run in Node.
// A player swims while any part of their body overlaps a water block.
import { BLOCK } from './blocks.js';

export const SWIM_SPEED_MULT = 0.5;
// Gravity while in water is this fraction of normal gravity, so you sink slowly.
export const WATER_GRAVITY_MULT = 0.25;
// Swimming upward when Space is held. Units are blocks per second.
export const SWIM_UP_SPEED = 3.5;
// Fastest you can sink in water, in blocks per second.
export const WATER_SINK_CAP = 2.5;

// True if the player's body (feet to head, width of the box) overlaps any water cell.
export function bodyInWater(world, pos, halfWidth, height) {
  const minX = Math.floor(pos.x - halfWidth);
  const maxX = Math.floor(pos.x + halfWidth - 1e-6);
  const minY = Math.floor(pos.y);
  const maxY = Math.floor(pos.y + height - 1e-6);
  const minZ = Math.floor(pos.z - halfWidth);
  const maxZ = Math.floor(pos.z + halfWidth - 1e-6);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (world.getBlock(x, y, z) === BLOCK.WATER) return true;
      }
    }
  }
  return false;
}

// Vertical velocity while swimming. Space rises; otherwise you sink slowly, capped at WATER_SINK_CAP.
// `gravity` is the normal gravity and `dt` is the frame time in seconds.
export function swimVelocityY(vy, dt, gravity, rising) {
  if (rising) return Math.min(SWIM_UP_SPEED, vy + gravity * dt * 2);
  const next = vy - gravity * WATER_GRAVITY_MULT * dt;
  return Math.max(-WATER_SINK_CAP, next);
}
