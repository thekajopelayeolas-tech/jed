// Boats: placed on water, ridden by the player, and kept on the water. Pure logic with no DOM or three.js,
// so tests run in Node. The boat moves in the direction the rider looks, and it can only enter water.
import { BLOCK } from './blocks.js';

export const BOAT_ID = 85;
export const BOAT_SPEED = 3.2;
export const BOAT_TURN_RATE = 2.5;

// The boat sits on the water surface. It floats at the top of the water cell it is in.
export const BOAT_DRAFT = 0.5;

// Where a boat goes when placed from the cell (x, y, z) the player aimed at. A boat can be placed anywhere:
// on land, on a block, or on water. If the aim is in water, the boat sits on the surface above it.
// It needs a free cell with room above, and something under it to sit on (a block or water).
// Returns the cell { x, y, z } the boat occupies, or null if it cannot be placed there.
export function boatSpotAt(world, x, y, z) {
  let cy = y;
  // Aimed at water: climb to the first air cell above the surface.
  while (world.getBlock(x, cy, z) === BLOCK.WATER) cy++;
  if (world.getBlock(x, cy, z) !== BLOCK.AIR) return null;
  if (world.getBlock(x, cy + 1, z) !== BLOCK.AIR) return null;
  // Nothing under it means the boat would hang in the air.
  if (world.getBlock(x, cy - 1, z) === BLOCK.AIR) return null;
  return { x, y: cy, z };
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
