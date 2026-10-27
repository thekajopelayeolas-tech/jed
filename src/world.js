import { BLOCK } from './blocks.js';
import { partOffsets, BED_FOOT, DOOR } from './building.js';

const DOOR_CLOSED = DOOR.DOOR;
const DOOR_OPEN = DOOR.OPEN_DOOR;

// The bed's head id, repeated from blocks.js (BLOCK.BED) because blocks.js imports building.js.
const BED_ID = 21;
import { Chunk } from './chunk.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { buildChunkGeometry, createChunkMeshes } from './mesher.js';
import { updateLightAt, lightChunk, LIGHT, MAX_LIGHT } from './lighting.js';
import { biomeAt } from './biomes.js';
import { BLOCK_TILES } from './textures.js';

export class World {
  constructor(scene, seed, opaqueMat, transMat) {
    this.scene = scene;
    this.seed = seed;
    this.opaqueMat = opaqueMat;
    this.transMat = transMat;
    this.chunks = new Map();
    // Block data for edited chunks that have been unloaded. Key is "cx,cz", value is a Uint8Array.
    this.edits = new Map();
    // Facing for edited chunks, kept beside `edits` with the same keys. Blocks are stored by id, so this stays separate.
    this.facingEdits = new Map();
    this.pendingMeshes = [];
  }

  static key(cx, cz) {
    return `${cx},${cz}`;
  }

  chunkAt(cx, cz) {
    return this.chunks.get(World.key(cx, cz));
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunkAt(cx, cz);
    if (!chunk) return BLOCK.AIR;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    return chunk.get(lx, wy, lz);
  }

  // Places a two-part block (a door or a bed) across its two cells. Both cells must be free, or nothing is placed.
  // Returns true if the block was placed. Single-cell blocks behave as setBlock does.
  placeWhole(wx, wy, wz, id, facing = 0) {
    const parts = partOffsets(id, facing);
    for (const p of parts) {
      const cur = this.getBlock(wx + p.dx, wy + p.dy, wz + p.dz);
      if (cur !== BLOCK.AIR && cur !== BLOCK.WATER) return false;
    }
    // A bed's head is the bed block, and its other half is the foot, which has its own red texture.
    const headId = id;
    const otherId = id === BED_ID ? BED_FOOT : id;
    if (!this.setBlock(wx, wy, wz, headId, facing)) return false;
    for (const p of parts) this.setBlock(wx + p.dx, wy + p.dy, wz + p.dz, otherId, facing);
    return true;
  }

  // Removes a two-part block from either of its cells. Both cells are cleared, so no half is left behind.
  // Returns the list of cells that were cleared, so the caller can drop items for each.
  breakWhole(wx, wy, wz) {
    const id = this.getBlock(wx, wy, wz);
    const cells = [{ x: wx, y: wy, z: wz }];
    // The other half of a two-part block is one of the cells next to it. Keep the neighbours whose own offsets
    // point back at this cell, so they are the same block's other half and not a neighbouring block.
    // A door's other half is directly above or below it. A bed's other half is along its facing, in either
    // direction (the same facing is stored on both halves, so the bed's first half is the one behind).
    const facing = this.facingAt(wx, wy, wz);
    const isBed = id === BED_ID || id === BED_FOOT;
    const bedIds = [BED_ID, BED_FOOT];
    const [sx, sz] = [[0, 1], [-1, 0], [0, -1], [1, 0]][facing & 3];
    // Each shape has its own neighbours. A door's other half is the cell above or below. A bed's other half is
    // the cell along its facing, in either direction, and it may be either bed id (head or foot).
    const candidates = isBed
      ? [[sx, 0, sz], [-sx, 0, -sz]]
      : [[0, -1, 0], [0, 1, 0]];
    for (const [dx, dy, dz] of candidates) {
      const ox = wx + dx;
      const oy = wy + dy;
      const oz = wz + dz;
      const other = this.getBlock(ox, oy, oz);
      const sameBlock = isBed ? bedIds.includes(other) : other === id;
      if (sameBlock) cells.push({ x: ox, y: oy, z: oz });
    }
    const cleared = [];
    for (const c of cells) {
      if (this.setBlock(c.x, c.y, c.z, BLOCK.AIR)) cleared.push(c);
    }
    return cleared;
  }

  // Opens a closed door at a cell, so a mob can walk through it. Both halves change together. Does nothing otherwise.
  openDoorAt(wx, wy, wz) {
    const id = this.getBlock(wx, wy, wz);
    if (id !== DOOR_CLOSED) return false;
    const facing = this.facingAt(wx, wy, wz);
    const lowerY = this.getBlock(wx, wy - 1, wz) === DOOR_CLOSED ? wy - 1 : wy;
    this.setBlock(wx, lowerY, wz, DOOR_OPEN, facing);
    this.setBlock(wx, lowerY + 1, wz, DOOR_OPEN, facing);
    return true;
  }

  // `facing` is which way the block's front points (0..3, see facing.js). It defaults to south.
  setBlock(wx, wy, wz, id, facing = 0) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunkAt(cx, cz);
    if (!chunk) return false;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    if (chunk.get(lx, wy, lz) === BLOCK.BEDROCK) return false;
    // Only ids with a block texture can exist in the world. Items and unknown ids are refused.
    if (!BLOCK_TILES[id] && id !== BLOCK.AIR) return false;
    chunk.set(lx, wy, lz, id, facing);
    chunk.modified = true;
    updateLightAt(this, wx, wy, wz);
    // Edge blocks affect the neighbouring chunk's face culling.
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
    return true;
  }

  // Which way the block at a world cell faces. Air and unloaded cells report south (0).
  facingAt(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunkAt(cx, cz);
    if (!chunk) return 0;
    return chunk.getFacing(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE);
  }

  // Light level for a channel at a world cell. Returns -1 if the cell's chunk is not loaded.
  getLight(wx, wy, wz, ch) {
    if (wy < 0) return -1;
    if (wy >= CHUNK_HEIGHT) return ch === LIGHT.SKY ? MAX_LIGHT : 0;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunkAt(cx, cz);
    if (!chunk) return -1;
    return chunk.getLight(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE, ch);
  }

  setLight(wx, wy, wz, ch, level) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunkAt(cx, cz);
    if (!chunk) return;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    chunk.setLight(lx, wy, lz, ch, level);
    // Light on a chunk edge is baked into the neighbour's faces, so that neighbour needs a remesh.
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
  }

  markDirty(cx, cz) {
    const c = this.chunkAt(cx, cz);
    if (c) c.dirty = true;
  }

  // Load chunks in a square around the player and unload the ones that are out of range.
  update(playerX, playerZ, radius, budget = 2) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    const wanted = new Set();
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dz * dz > radius * radius) continue;
        wanted.add(World.key(pcx + dx, pcz + dz));
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        if (chunk.modified) {
          this.edits.set(key, chunk.blocks.slice());
          this.facingEdits.set(key, chunk.facing.slice());
        }
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
          chunk.mesh.traverse((o) => o.geometry && o.geometry.dispose());
        }
        this.chunks.delete(key);
      }
    }

    // Generate missing chunks, nearest first, limited per frame.
    const toLoad = [];
    for (const key of wanted) {
      if (this.chunks.has(key)) continue;
      const [cx, cz] = key.split(',').map(Number);
      toLoad.push({ cx, cz, d: (cx - pcx) ** 2 + (cz - pcz) ** 2 });
    }
    toLoad.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(budget, toLoad.length); i++) {
      const { cx, cz } = toLoad[i];
      const chunk = new Chunk(cx, cz);
      const saved = this.edits.get(World.key(cx, cz));
      if (saved) {
        chunk.blocks.set(saved);
        // Facing is restored when it was saved. Older saves have none, so blocks keep the default south.
        const savedFacing = this.facingEdits.get(World.key(cx, cz));
        if (savedFacing) chunk.facing.set(savedFacing);
        chunk.modified = true;
        // Biomes are not stored with the edits, so recompute them from the seed.
        for (let x = 0; x < CHUNK_SIZE; x++) {
          for (let z = 0; z < CHUNK_SIZE; z++) {
            chunk.biomes[x + CHUNK_SIZE * z] = biomeAt(cx * CHUNK_SIZE + x, cz * CHUNK_SIZE + z, this.seed);
          }
        }
      } else {
        chunk.generate(this.seed);
      }
      this.chunks.set(World.key(cx, cz), chunk);
      lightChunk(this, chunk, cx * CHUNK_SIZE, cz * CHUNK_SIZE);
      this.markDirty(cx - 1, cz);
      this.markDirty(cx + 1, cz);
      this.markDirty(cx, cz - 1);
      this.markDirty(cx, cz + 1);
    }

    // Rebuild meshes for dirty chunks, limited per frame.
    let rebuilt = 0;
    for (const chunk of this.chunks.values()) {
      if (!chunk.dirty || rebuilt >= budget * 2) continue;
      this.rebuildMesh(chunk);
      rebuilt++;
    }
  }

  rebuildMesh(chunk) {
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.traverse((o) => o.geometry && o.geometry.dispose());
      chunk.mesh = null;
    }
    const geo = buildChunkGeometry(chunk, this);
    const group = createChunkMeshes(geo, this.opaqueMat, this.transMat);
    group.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    this.scene.add(group);
    chunk.mesh = group;
    chunk.dirty = false;
  }

  // Returns the first solid block along a ray (for picking). Uses a DDA voxel walk.
  raycast(origin, dir, maxDist) {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);
    const stepX = dir.x > 0 ? 1 : -1;
    const stepY = dir.y > 0 ? 1 : -1;
    const stepZ = dir.z > 0 ? 1 : -1;
    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
    const fx = origin.x - Math.floor(origin.x);
    const fy = origin.y - Math.floor(origin.y);
    const fz = origin.z - Math.floor(origin.z);
    // A zero direction component never crosses that axis, so its tMax must be Infinity (not NaN).
    let tMaxX = dir.x === 0 ? Infinity : dir.x > 0 ? (1 - fx) * tDeltaX : fx * tDeltaX;
    let tMaxY = dir.y === 0 ? Infinity : dir.y > 0 ? (1 - fy) * tDeltaY : fy * tDeltaY;
    let tMaxZ = dir.z === 0 ? Infinity : dir.z > 0 ? (1 - fz) * tDeltaZ : fz * tDeltaZ;
    let prev = { x, y, z };
    let t = 0;

    while (t <= maxDist) {
      const id = this.getBlock(x, y, z);
      if (id !== BLOCK.AIR && id !== BLOCK.WATER) {
        return { block: { x, y, z }, place: prev, id };
      }
      prev = { x, y, z };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX;
        x += stepX;
        tMaxX += tDeltaX;
      } else if (tMaxY < tMaxZ) {
        t = tMaxY;
        y += stepY;
        tMaxY += tDeltaY;
      } else {
        t = tMaxZ;
        z += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    return null;
  }
}
