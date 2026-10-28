// Torch spawning for hostile mobs. A hostile spawn lands on dry ground near a torch the player is close to.
// Pure functions with no DOM or three.js, so tests run in Node.
import { BLOCK } from './blocks.js';

// How far from the player a torch counts for a spawn, and how far from the torch a spawn cell may be.
export const TORCH_REACH = 24;
export const TORCH_SPAWN_RANGE = 6;

// True if a cell is open ground a land mob can stand on: a solid block with two open cells above it.
function standable(world, x, y, z) {
  const below = world.getBlock(x, y - 1, z);
  if (below === BLOCK.AIR || below === BLOCK.WATER || below === BLOCK.TORCH) return false;
  return world.getBlock(x, y, z) === BLOCK.AIR && world.getBlock(x, y + 1, z) === BLOCK.AIR;
}

// Finds the torches within TORCH_REACH of the player by scanning the loaded world around them. Torches are
// blocks in the world, so this also finds torches from a saved game. The scan is bounded, so it stays cheap.
export function findTorches(world, playerPos) {
  const r = TORCH_REACH;
  const found = [];
  const x0 = Math.floor(playerPos.x - r);
  const x1 = Math.floor(playerPos.x + r);
  const z0 = Math.floor(playerPos.z - r);
  const z1 = Math.floor(playerPos.z + r);
  const y0 = Math.max(1, Math.floor(playerPos.y) - 6);
  const y1 = Math.floor(playerPos.y) + 6;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        if (world.getBlock(x, y, z) === BLOCK.TORCH) found.push({ x, y, z });
      }
    }
  }
  return found;
}

// Picks a spawn cell near one of the torches in reach of the player, or null if none has room. `torches` is a
// list of { x, y, z }. A torch is only used when the player is within TORCH_REACH of it, so spawning stays close
// to the player. The spawn cell is standable ground within TORCH_SPAWN_RANGE of the torch.
export function torchSpawnCell(world, playerPos, torches, rand = Math.random) {
  const reachable = torches.filter((t) => Math.hypot(t.x - playerPos.x, t.z - playerPos.z) <= TORCH_REACH);
  if (reachable.length === 0) return null;
  const t = reachable[Math.floor(rand() * reachable.length)];
  // Try a few random cells around the torch, and keep the first one that is standable ground.
  for (let tries = 0; tries < 12; tries++) {
    const angle = rand() * Math.PI * 2;
    const dist = 2 + rand() * (TORCH_SPAWN_RANGE - 2);
    const x = Math.floor(t.x + Math.cos(angle) * dist);
    const z = Math.floor(t.z + Math.sin(angle) * dist);
    // Walk down from above the torch to find the ground at this column.
    for (let y = t.y + 4; y > 0; y--) {
      if (world.getBlock(x, y, z) === BLOCK.AIR) continue;
      if (standable(world, x, y + 1, z)) return { x, y: y + 1, z };
      break;
    }
  }
  return null;
}
