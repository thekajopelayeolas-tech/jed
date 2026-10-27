// Boats: placed on water, ridden by the player, and kept on the water. Pure logic with no DOM or three.js,
// so tests run in Node. The boat moves in the direction the rider looks, and it can only enter water.
import { BLOCK } from './blocks.js';

export const BOAT_ID = 85;
export const BOAT_SPEED = 3.2;
export const BOAT_TURN_RATE = 2.5;

// The boat sits on the water surface. It floats at the top of the water cell it is in.
export const BOAT_DRAFT = 0.5;

// True if a boat can sit at (x, y, z): the cell is water and the cell above is clear (so the boat is not inside a block).
export function canFloatAt(world, x, y, z) {
  return world.getBlock(x, y, z) === BLOCK.WATER && world.getBlock(x, y + 1, z) === BLOCK.AIR;
}

// The rider's next position along their facing, if that cell is water. Returns null when the move would leave
// the water, so the boat stays on the lake.
export function nextBoatPosition(world, pos, yaw, dt) {
  const dx = -Math.sin(yaw) * BOAT_SPEED * dt;
  const dz = -Math.cos(yaw) * BOAT_SPEED * dt;
  const nx = pos.x + dx;
  const nz = pos.z + dz;
  // The boat floats on the water cell beneath it, which is one block below its position (its y is the water's top).
  const waterY = Math.floor(pos.y) - 1;
  if (world.getBlock(Math.floor(nx), waterY, Math.floor(nz)) !== BLOCK.WATER) return null;
  return { x: nx, y: pos.y, z: nz };
}
