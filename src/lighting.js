import { BLOCK, BLOCK_DEFS, isSolid } from './blocks.js';
import { CHUNK_HEIGHT, CHUNK_SIZE } from './constants.js';

// Two light channels per block: sky light (from open air) and block light (from torches).
export const LIGHT = { SKY: 0, BLOCK: 1 };
export const MAX_LIGHT = 15;

// Face directions. Index d and d ^ 1 are opposites. Index 3 is down.
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const DOWN = 3;

// A torch gives the brightest block light the game allows, so the glow reaches as far as it can.
const EMISSION = { [BLOCK.TORCH]: MAX_LIGHT };

function isOpaque(id) {
  return isSolid(id) && !BLOCK_DEFS[id].transparent;
}

// Light lost when moving from a cell of `level` in direction d.
// Sky light falling straight down does not decay, so sunlight reaches deep columns.
function stepCost(ch, level, d) {
  return ch === LIGHT.SKY && d === DOWN && level === MAX_LIGHT ? 0 : 1;
}

// Converts a light level into a brightness multiplier for vertex colors.
export function lightFactor(level) {
  // A gentler curve than before (0.8 per level), so light near a torch stays bright and falls off more slowly.
  return Math.max(0.1, Math.pow(0.88, MAX_LIGHT - level));
}

// Spreads light outward from the given seeds ({x, y, z, level}) with a BFS.
export function addLights(world, seeds, ch) {
  const queue = seeds.slice();
  for (let head = 0; head < queue.length; head++) {
    const { x, y, z, level } = queue[head];
    if (level <= 0) continue;
    for (let d = 0; d < 6; d++) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      const nz = z + DIRS[d][2];
      const cur = world.getLight(nx, ny, nz, ch);
      if (cur < 0 || isOpaque(world.getBlock(nx, ny, nz))) continue;
      const nl = level - stepCost(ch, level, d);
      if (nl > cur) {
        world.setLight(nx, ny, nz, ch, nl);
        queue.push({ x: nx, y: ny, z: nz, level: nl });
      }
    }
  }
}

// Clears light that came from a source at (x, y, z) with the given old level,
// then re-lights the cleared area from cells that still have light.
export function removeLight(world, x, y, z, ch, oldLevel) {
  world.setLight(x, y, z, ch, 0);
  const clearQueue = [{ x, y, z, level: oldLevel }];
  const relight = [];
  for (let head = 0; head < clearQueue.length; head++) {
    const c = clearQueue[head];
    for (let d = 0; d < 6; d++) {
      const nx = c.x + DIRS[d][0];
      const ny = c.y + DIRS[d][1];
      const nz = c.z + DIRS[d][2];
      const l = world.getLight(nx, ny, nz, ch);
      if (l <= 0) continue;
      // Full-strength sky light below a removed cell came straight down from it, so it must be cleared too.
      const fromAbove = ch === LIGHT.SKY && d === DOWN && c.level === MAX_LIGHT && l === MAX_LIGHT;
      if (l < c.level || fromAbove) {
        world.setLight(nx, ny, nz, ch, 0);
        clearQueue.push({ x: nx, y: ny, z: nz, level: l });
      } else {
        relight.push({ x: nx, y: ny, z: nz, level: l });
      }
    }
  }
  addLights(world, relight, ch);
}

// Light a cell would get from its own emission and from its neighbours.
function levelFromNeighbours(world, x, y, z, ch) {
  let level = ch === LIGHT.BLOCK ? (EMISSION[world.getBlock(x, y, z)] ?? 0) : 0;
  // Open sky above the world's top layer is always fully lit.
  if (ch === LIGHT.SKY && y === CHUNK_HEIGHT - 1) level = MAX_LIGHT;
  for (let d = 0; d < 6; d++) {
    const nx = x + DIRS[d][0];
    const ny = y + DIRS[d][1];
    const nz = z + DIRS[d][2];
    const nl = world.getLight(nx, ny, nz, ch);
    if (nl <= 0) continue;
    // Light moves from the neighbour into this cell, which is the opposite direction.
    const cand = nl - stepCost(ch, nl, d ^ 1);
    if (cand > level) level = cand;
  }
  return level;
}

// Recomputes light at one cell after a change and spreads it if it became brighter.
export function refreshLight(world, x, y, z, ch) {
  if (world.getLight(x, y, z, ch) < 0) return;
  if (isOpaque(world.getBlock(x, y, z))) return;
  const level = levelFromNeighbours(world, x, y, z, ch);
  if (level > world.getLight(x, y, z, ch)) {
    world.setLight(x, y, z, ch, level);
    addLights(world, [{ x, y, z, level }], ch);
  }
}

// Updates both light channels after the block at (x, y, z) changed.
export function updateLightAt(world, x, y, z) {
  for (const ch of [LIGHT.SKY, LIGHT.BLOCK]) {
    const old = world.getLight(x, y, z, ch);
    if (old > 0) removeLight(world, x, y, z, ch, old);
    refreshLight(world, x, y, z, ch);
  }
}

// Computes initial light for a freshly generated chunk, using light already in its neighbours.
export function lightChunk(world, chunk, ox, oz) {
  for (const ch of [LIGHT.SKY, LIGHT.BLOCK]) {
    const seeds = [];
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const wx = ox + x;
          const wz = oz + z;
          if (isOpaque(chunk.get(x, y, z))) continue;
          const level = levelFromNeighbours(world, wx, y, wz, ch);
          if (level > 0) {
            world.setLight(wx, y, wz, ch, level);
            seeds.push({ x: wx, y, z: wz, level });
          }
        }
      }
    }
    addLights(world, seeds, ch);
  }
}
