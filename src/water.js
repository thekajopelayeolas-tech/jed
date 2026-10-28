// Water flow for poured water. A poured source spreads out across the ground around it for a few blocks, and
// falls down any drop it reaches. Pure functions with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

// How far poured water spreads from where it lands, in blocks (counted across the ground, not the air).
export const WATER_REACH = 3;
// The deepest a poured drop can fall, in blocks. Limits how far a pour can dig down into the world.
export const WATER_FALL_LIMIT = 8;

// A cell water can flow into: air, or water that is already there, which does not count as new.
const passable = (id) => id === BLOCK.AIR;

// Spreads water out from a poured cell (x, y, z). The source is already water. Each step flows to a free
// neighbour on the same level, up to WATER_REACH across. A free cell with air below it is a drop: the water
// falls down it, and does not spread sideways from the top. Returns the cells that became water.
export function spreadWater(world, x, y, z) {
  const placed = [];
  const seen = new Set([`${x},${y},${z}`]);
  // Each queued entry is a cell and how far it is from the pour, across the ground.
  const queue = [{ x, y, z, dist: 0 }];
  while (queue.length > 0) {
    const cur = queue.shift();
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of neighbours) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      const key = `${nx},${cur.y},${nz}`;
      if (seen.has(key)) continue;
      const dist = cur.dist + 1;
      if (dist > WATER_REACH) continue;
      if (!passable(world.getBlock(nx, cur.y, nz))) continue;
      seen.add(key);
      // The water fills this cell. If the cell below is air, it falls down the drop, and keeps falling.
      let ny = cur.y;
      while (ny - 1 >= 1 && cur.y - (ny - 1) <= WATER_FALL_LIMIT && passable(world.getBlock(nx, ny - 1, nz))) ny -= 1;
      // World.setBlock returns false when the cell's chunk is not loaded. Such a cell is not water, so skip it.
      if (world.setBlock(nx, ny, nz, BLOCK.WATER) === false) continue;
      placed.push({ x: nx, y: ny, z: nz });
      // Only water that stayed on this level keeps spreading sideways; a fall stops where it lands.
      if (ny === cur.y) queue.push({ x: nx, y: ny, z: nz, dist });
    }
  }
  return placed;
}
