// Building blocks: stone variants, bricks, concrete, and wood slabs and stairs.
// Ids are stored in saves, so they are fixed here. Ids 53 and up are new and never reused.
export const BUILD = {
  STONE_BRICKS: 53,
  POLISHED_STONE: 54,
  BRICKS: 55,
  CONCRETE: 56,
  WOOD_SLAB: 57,
  STONE_SLAB: 58,
  BRICK_SLAB: 59,
  CONCRETE_SLAB: 60,
  WOOD_STAIRS: 61,
  STONE_STAIRS: 62,
  BRICK_STAIRS: 63,
  CONCRETE_STAIRS: 64,
};

// Shape of a placed block as boxes inside the cell, in 0..1 units.
// A full cube is one box. A slab is the lower half. Stairs are a lower slab plus an upper back step.
export const FULL_BOX = [[0, 0, 0, 1, 1, 1]];
export const SLAB_BOX = [[0, 0, 0, 1, 0.5, 1]];
// Stairs face +x: a full-width lower slab, plus an upper step covering the back half (x from 0 to 0.5).
export const STAIR_BOXES = [
  [0, 0, 0, 1, 0.5, 1],
  [0, 0.5, 0, 0.5, 1, 1],
];

// Which shape each building block uses. Full cubes are missing from this table and use FULL_BOX.
export const SHAPE = {
  [BUILD.WOOD_SLAB]: 'slab',
  [BUILD.STONE_SLAB]: 'slab',
  [BUILD.BRICK_SLAB]: 'slab',
  [BUILD.CONCRETE_SLAB]: 'slab',
  [BUILD.WOOD_STAIRS]: 'stairs',
  [BUILD.STONE_STAIRS]: 'stairs',
  [BUILD.BRICK_STAIRS]: 'stairs',
  [BUILD.CONCRETE_STAIRS]: 'stairs',
};

// Returns the collision and rendering boxes for a block id. Full cubes return one box.
export function boxesFor(id) {
  const shape = SHAPE[id];
  if (shape === 'slab') return SLAB_BOX;
  if (shape === 'stairs') return STAIR_BOXES;
  return FULL_BOX;
}

// True for ordinary cubes. Slabs and stairs are partial and need box tests.
export function isFullCube(id) {
  return SHAPE[id] === undefined;
}

// True if a body with the given world-space bounds overlaps any box of the block at cell (cx, cy, cz).
export function bodyHitsBlock(id, cx, cy, cz, body) {
  for (const [x0, y0, z0, x1, y1, z1] of boxesFor(id)) {
    if (body.maxX > cx + x0 && body.minX < cx + x1 &&
        body.maxY > cy + y0 && body.minY < cy + y1 &&
        body.maxZ > cz + z0 && body.minZ < cz + z1) return true;
  }
  return false;
}
