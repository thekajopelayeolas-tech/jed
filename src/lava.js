// Lava rules. Pure functions with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

// Health lost each time lava hurts, and the seconds between hits while standing in it.
export const LAVA_DAMAGE = 2;
export const LAVA_INTERVAL = 0.5;

// True if any cell the body overlaps is lava. The body is a box, so every cell it touches is checked.
export function bodyInLava(world, pos, halfWidth, height) {
  const minX = Math.floor(pos.x - halfWidth);
  const maxX = Math.floor(pos.x + halfWidth - 1e-6);
  const minY = Math.floor(pos.y);
  const maxY = Math.floor(pos.y + height - 1e-6);
  const minZ = Math.floor(pos.z - halfWidth);
  const maxZ = Math.floor(pos.z + halfWidth - 1e-6);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (world.getBlock(x, y, z) === BLOCK.LAVA) return true;
      }
    }
  }
  return false;
}

// Advances the lava timer for one frame and returns the damage to apply this frame (0 or LAVA_DAMAGE).
// The timer is shared state the caller keeps: `state.timer` counts down while the player is in lava and
// resets to zero when they leave, so the first touch hurts at once and then hurts again each interval.
export function lavaStep(state, inLava, dt) {
  if (!inLava) {
    state.timer = 0;
    return 0;
  }
  state.timer -= dt;
  if (state.timer <= 0) {
    state.timer = LAVA_INTERVAL;
    return LAVA_DAMAGE;
  }
  return 0;
}
