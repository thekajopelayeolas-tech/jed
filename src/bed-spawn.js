// Where a player stands when they respawn beside their bed. Pure logic with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

// Finds a standing spot beside a bed: a cell next to the bed's head with solid ground below and two air cells above.
// `getBlock(x, y, z)` reads the world. Returns { x, y, z } for the feet, or null if no spot is free.
export function spotBesideBed(bed, getBlock) {
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of offsets) {
    const x = bed.x + dx;
    const z = bed.z + dz;
    for (let y = bed.y + 2; y > bed.y - 3; y--) {
      const below = getBlock(x, y - 1, z);
      if (below === BLOCK.AIR || below === BLOCK.WATER) continue;
      if (getBlock(x, y, z) === BLOCK.AIR && getBlock(x, y + 1, z) === BLOCK.AIR) return { x, y, z };
      break;
    }
  }
  return null;
}
