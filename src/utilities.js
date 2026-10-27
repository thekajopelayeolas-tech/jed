// Tools and utilities: buckets and fishing. Pure rules with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

export const CAST_WAIT = 4;
// The raw fish a cast brings in. A cast that is still waiting catches nothing.
export const CAUGHT_FISH = BLOCK.RAW_FISH;

// Using a bucket. An empty bucket fills from a water block, and a water bucket places water into a free cell
// and gives the empty bucket back. A bucket only ever holds water. Returns the result or null if nothing happens.
// `world` is read and written through getBlock/setBlock. The result is { item, placed } where `item` is the
// bucket the player holds afterwards, and `placed` is true if water was poured.
export function useBucket(world, heldId, x, y, z, placeAt) {
  if (heldId === BLOCK.BUCKET) {
    // Fill from a water cell. The cell becomes air, and the bucket is now a water bucket.
    if (world.getBlock(x, y, z) !== BLOCK.WATER) return null;
    world.setBlock(x, y, z, BLOCK.AIR);
    return { item: BLOCK.WATER_BUCKET, placed: false };
  }
  if (heldId === BLOCK.WATER_BUCKET) {
    // Pour water into the cell in front of the player, if that cell is free. The bucket goes back to empty.
    const { x: px, y: py, z: pz } = placeAt;
    const cur = world.getBlock(px, py, pz);
    if (cur !== BLOCK.AIR) return null;
    world.setBlock(px, py, pz, BLOCK.WATER);
    return { item: BLOCK.BUCKET, placed: true };
  }
  return null;
}

// Fishing: a cast sets a float on the water, and after CAST_WAIT seconds a fish bites. `cast` is the state
// { active, timer, cellKey }. Returns the next state and whether a fish was caught this step.
export function stepFishing(cast, dt) {
  if (!cast.active) return { cast, caught: false };
  const timer = cast.timer - dt;
  if (timer > 0) return { cast: { ...cast, timer }, caught: false };
  return { cast: { active: false, timer: 0, cellKey: null }, caught: true };
}

// Starts a cast into a water cell. Only water can take a line.
export function startCast(world, x, y, z) {
  if (world.getBlock(x, y, z) !== BLOCK.WATER) return null;
  return { active: true, timer: CAST_WAIT, cellKey: `${x},${y},${z}` };
}
