// Water rules. A poured water block is a single ramp: it does not spread into new water blocks. When three or more
// water pieces touch on one level, they merge into a full water block. Pure functions with no DOM or three.js.
import { BLOCK } from './blocks.js';

// The ramp a single water cell is drawn as: a box covering the lower part of the cell, sloping down toward +x.
// It is lower than a full block, so a single poured block reads as a sloped surface rather than a cube.
export const WATER_RAMP_BOXES = [[0, 0, 0, 1, 0.5, 1]];

// Three or more connected water pieces make one full water block.
export const WATER_MERGE_COUNT = 3;

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Starting from (x, y, z), finds every water cell connected to it on the same level (across the four sides).
function connectedWater(world, x, y, z) {
  const group = [];
  const seen = new Set([`${x},${y},${z}`]);
  const stack = [{ x, z }];
  while (stack.length > 0) {
    const cur = stack.pop();
    group.push(cur);
    for (const [dx, dz] of NEIGHBOURS) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      const key = `${nx},${y},${nz}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (world.getBlock(nx, y, nz) === BLOCK.WATER) stack.push({ x: nx, z: nz });
    }
  }
  return group;
}

// Called after water is placed at (x, y, z). If that water is connected to at least WATER_MERGE_COUNT pieces on the
// same level, every piece in the group becomes a full water block. Returns true when the group merged.
export function waterMerge(world, x, y, z) {
  if (world.getBlock(x, y, z) !== BLOCK.WATER) return false;
  const group = connectedWater(world, x, y, z);
  if (group.length < WATER_MERGE_COUNT) return false;
  for (const cell of group) world.setBlock(cell.x, y, cell.z, BLOCK.WATER);
  return true;
}
