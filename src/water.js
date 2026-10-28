// Water rules. A pour places one full water source block, which a bucket can take. The water that flows out of a
// source is flowing water, drawn as slabs, which a bucket cannot take. Taking a source also takes the flow it fed.
// Three or more connected full water pieces merge into one full block. Pure functions with no DOM or three.js.
import { BLOCK } from './blocks.js';

// Three or more connected water pieces make one full water block.
export const WATER_MERGE_COUNT = 3;

// How far flowing water spreads from a source, in blocks across the ground.
export const FLOW_REACH = 3;

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Starting from (x, y, z), finds every full water cell connected to it on the same level (across the four sides).
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

// Called after water is placed at (x, y, z). If that water is connected to at least WATER_MERGE_COUNT full water
// pieces on the same level, every piece in the group becomes a full water block. Returns true when it merged.
export function waterMerge(world, x, y, z) {
  if (world.getBlock(x, y, z) !== BLOCK.WATER) return false;
  const group = connectedWater(world, x, y, z);
  if (group.length < WATER_MERGE_COUNT) return false;
  for (const cell of group) world.setBlock(cell.x, y, cell.z, BLOCK.WATER);
  return true;
}

// Water flowing out of a source: the free cells around it, within FLOW_REACH across the ground, become flowing
// water (slabs). The source itself is left as full water. Returns the flowing cells it made, so they can be
// cleared again later with removeSourceFlow.
export function flowFrom(world, x, y, z) {
  const made = [];
  const seen = new Set([`${x},${y},${z}`]);
  let frontier = [{ x, z, dist: 0 }];
  while (frontier.length > 0) {
    const next = [];
    for (const cur of frontier) {
      if (cur.dist >= FLOW_REACH) continue;
      for (const [dx, dz] of NEIGHBOURS) {
        const nx = cur.x + dx;
        const nz = cur.z + dz;
        const key = `${nx},${nz}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (world.getBlock(nx, y, nz) !== BLOCK.AIR) continue;
        if (world.setBlock(nx, y, nz, BLOCK.FLOWING_WATER) === false) continue;
        made.push({ x: nx, y, z: nz });
        next.push({ x: nx, z: nz, dist: cur.dist + 1 });
      }
    }
    frontier = next;
  }
  return made;
}

// Clears the flowing water one source made. Only the cells in `made` (the list flowFrom returned for that source)
// are touched, so the flow from any other source is left alone. A cell that is no longer flowing water is skipped.
export function removeSourceFlow(world, made) {
  for (const cell of made) {
    if (world.getBlock(cell.x, cell.y, cell.z) === BLOCK.FLOWING_WATER) {
      world.setBlock(cell.x, cell.y, cell.z, BLOCK.AIR);
    }
  }
}
