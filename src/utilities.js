// Tools and utilities: buckets. Pure rules with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

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

