import { BLOCK } from './blocks.js';
import { CHUNK_SIZE } from './constants.js';

export const CROP_STAGE_IDS = [BLOCK.WHEAT_CROP_0, BLOCK.WHEAT_CROP_1, BLOCK.WHEAT_CROP_2, BLOCK.WHEAT_CROP_3];
const STAGE_BY_ID = new Map(CROP_STAGE_IDS.map((id, stage) => [id, stage]));

export function tillSoil(world, x, y, z) {
  const soil = world.getBlock(x, y, z);
  if (soil !== BLOCK.GRASS && soil !== BLOCK.DIRT) return false;
  if (world.getBlock(x, y + 1, z) !== BLOCK.AIR) return false;
  return world.setBlock(x, y, z, BLOCK.FARMLAND);
}

export function plantWheatSeed(world, x, y, z) {
  if (world.getBlock(x, y, z) !== BLOCK.FARMLAND || world.getBlock(x, y + 1, z) !== BLOCK.AIR) return false;
  return world.setBlock(x, y + 1, z, BLOCK.WHEAT_CROP_0);
}

export function farmlandHydrated(world, x, y, z) {
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      if (Math.abs(dx) === 4 && Math.abs(dz) === 4) continue;
      for (let dy = -1; dy <= 1; dy++) {
        if (world.getBlock(x + dx, y + dy, z + dz) === BLOCK.WATER) return true;
      }
    }
  }
  return false;
}

export function growCropAt(world, x, y, z, roll = Math.random()) {
  const stage = STAGE_BY_ID.get(world.getBlock(x, y, z));
  if (stage === undefined || stage >= CROP_STAGE_IDS.length - 1) return false;
  if (world.getBlock(x, y - 1, z) !== BLOCK.FARMLAND || world.getBlock(x, y + 1, z) !== BLOCK.AIR) return false;
  const light = world.getLight?.(x, y + 1, z, 0) ?? 15;
  if (light <= 0) return false;
  const hydrated = farmlandHydrated(world, x, y - 1, z);
  const chance = hydrated ? 0.34 : 0.06;
  if (roll >= chance) return false;
  return world.setBlock(x, y, z, CROP_STAGE_IDS[stage + 1]);
}

// Called infrequently by the game loop; stages are stored as block IDs and therefore survive save/load.
export function tickCropGrowth(world, random = Math.random) {
  let grown = 0;
  for (const chunk of world.chunks.values()) {
    for (const index of chunk.cropIndices ?? []) {
      const x = index % CHUNK_SIZE;
      const q = Math.floor(index / CHUNK_SIZE);
      const z = q % CHUNK_SIZE;
      const y = Math.floor(q / CHUNK_SIZE);
      if (growCropAt(world, chunk.cx * CHUNK_SIZE + x, y, chunk.cz * CHUNK_SIZE + z, random())) grown++;
    }
  }
  return grown;
}

export function cropDrops(blockId, roll = Math.random()) {
  const stage = STAGE_BY_ID.get(blockId);
  if (stage === undefined) return null;
  if (stage < CROP_STAGE_IDS.length - 1) return [{ id: BLOCK.WHEAT_SEEDS, count: 1 }];
  return [
    { id: BLOCK.WHEAT, count: 1 + Math.floor(roll * 3) },
    { id: BLOCK.WHEAT_SEEDS, count: 1 + Math.floor((1 - roll) * 2) },
  ];
}

export function grassSeedDrop(roll = Math.random()) {
  return roll < 0.3 ? BLOCK.WHEAT_SEEDS : 0;
}
