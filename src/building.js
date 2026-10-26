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

// Doors are kept apart from the building blocks, since they are not crafted. A closed door blocks movement,
// and an open door is passable. Right-click switches between them. Ids 76 and 77 are new and never reused.
export const DOOR = {
  DOOR: 76,
  OPEN_DOOR: 77,
};

// The furnace while it is smelting: the same block, drawn with a glowing fire in its firebox.
export const FURNACE_STATE = {
  LIT: 79,
};

// A chest holds 27 items. It is a placeable block, opened with right-click, and it keeps its contents when saved.
export const STORAGE = {
  CHEST: 78,
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

// A closed door is a thin panel across the middle of its cell. An open door is a thin panel pushed against
// the west edge of its cell, so it is still visible. Open doors are not solid (see blocks.js), so the
// player and mobs walk through them, whatever box is drawn.
export const DOOR_BOX = [[0, 0, 0.4, 1, 1, 0.6]];
export const OPEN_DOOR_BOX = [[0, 0, 0, 0.12, 1, 1]];

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
  [DOOR.DOOR]: 'door',
  [DOOR.OPEN_DOOR]: 'open',
};

// Returns the collision and rendering boxes for a block id. Full cubes return one box.
export function boxesFor(id) {
  const shape = SHAPE[id];
  if (shape === 'slab') return SLAB_BOX;
  if (shape === 'stairs') return STAIR_BOXES;
  if (shape === 'door') return DOOR_BOX;
  if (shape === 'open') return OPEN_DOOR_BOX;
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
