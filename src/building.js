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

// Two-part blocks take two cells. A door is two blocks tall, and a bed is two blocks long, along its facing.
// `partOffsets(id, facing)` gives the other cells a block occupies, relative to the cell it was placed in.
// Single-cell blocks return an empty list.
// The bed's block id, repeated here because blocks.js imports this file, so importing BLOCK back would be a cycle.
// It is fixed (BLOCK.BED is 21 in blocks.js) and checked by a test.
const BED_ID = 21;
// The bed's second half (the foot). It is all red, so it is its own block. Placing a bed writes a foot next to it.
// Id 80 is new and never reused.
export const BED_FOOT = 80;
export function partOffsets(id, facing) {
  if (id === DOOR.DOOR || id === DOOR.OPEN_DOOR) return [{ dx: 0, dy: 1, dz: 0 }];
  if (id === BED_ID) {
    const [sx, sz] = [[0, 1], [-1, 0], [0, -1], [1, 0]][facing & 3];
    return [{ dx: sx, dy: 0, dz: sz }];
  }
  if (id === BED_FOOT) {
    // The foot's head is the other cell, one step back along the facing.
    const [sx, sz] = [[0, 1], [-1, 0], [0, -1], [1, 0]][facing & 3];
    return [{ dx: -sx, dy: 0, dz: -sz }];
  }

  return [];
}

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

// A closed door is a thin panel across the middle of its cell. An open door is the same panel swung 90 degrees
// on a hinge at one edge of its cell, so it stands out from the wall. Open doors are not solid (see blocks.js),
// so the player and mobs walk through them, whatever box is drawn.
export const DOOR_BOX = [[0, 0, 0.4, 1, 1, 0.6]];
export const OPEN_DOOR_BOX = [[0, 0, 0, 0.12, 1, 1]];

// A torch is a thin upright post in the middle of its cell, not a full cube. Its id is 14 (BLOCK.TORCH in blocks.js).
const TORCH_ID = 14;
// Water's id, repeated here because blocks.js imports this file, so importing BLOCK back would be a cycle.
const BLOCK_WATER_ID = 7;
// The ramp box for a single water cell, in cell units. Kept in sync with WATER_RAMP_BOXES in water.js.
export const RAMP_BOX = [[0, 0, 0, 1, 0.5, 1]];
export const POST_BOX = [[0.42, 0, 0.42, 0.58, 1, 0.58]];

// Rotates one box about the centre of its cell, by a facing (0 south, 1 west, 2 north, 3 east).
// Each quarter turn maps (x, z) about (0.5, 0.5). Box ends are kept ordered (min, then max).
export function rotateBox(box, facing) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const turns = facing & 3;
  // Corners of the box in the cell's xz plane, rotated one quarter turn per step.
  let corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (let t = 0; t < turns; t++) {
    corners = corners.map(([x, z]) => [1 - z, x]);
  }
  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  return [Math.min(...xs), y0, Math.min(...zs), Math.max(...xs), y1, Math.max(...zs)];
}

// The collision and rendering boxes for a door in a given state and facing. A closed door is a panel across
// its cell, turned to match its facing. An open door is that panel swung 90 degrees on a hinge at one edge
// of the cell: it runs across the closed panel's axis, so it stands out from the wall like a door held open.
export function doorBoxes(open, facing) {
  const closed = rotateBox(DOOR_BOX[0], facing);
  if (!open) return [closed];
  const [x0, y0, z0, x1, y1, z1] = closed;
  // The closed panel runs along x for facings 1 and 3, and along z for 0 and 2. The open panel runs along
  // the other axis, thin across the closed panel's axis, and is hinged on the cell edge where it starts.
  const alongX = x1 - x0 > z1 - z0;
  return alongX ? [[0, y0, 0, 0.12, y1, 1]] : [[0, y0, 0, 1, y1, 0.12]];
}

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
  [TORCH_ID]: 'post',
  // A single water cell is a ramp, not a full cube. See src/water.js.
  [BLOCK_WATER_ID]: 'ramp',
};

// The texture a door half uses on one face. The upper half shows the handle on its front face, and the lower half
// is plain planks on every face, so the two halves read as one door with no handle or seam at the bottom.
// `isFront` says whether this face is the door's front. `isUpper` says whether this cell is the upper half.
export function doorTileName(id, isFront, isUpper) {
  if (!isUpper) return 'doorBottom';
  return isFront ? 'doorFront' : 'door';
}

// Which icon shape the inventory draws for a block: 'slab', 'stairs', or 'cube'. Slabs and stairs are drawn with
// their own shape, so they do not look like a full block. Every other block is a full cube icon.
export function iconShape(id) {
  const shape = SHAPE[id];
  if (shape === 'slab') return 'slab';
  if (shape === 'stairs') return 'stairs';
  return 'cube';
}

// Returns the collision and rendering boxes for a block id. Full cubes return one box.
// `facing` (0..3) turns doors to match the way they face. Other shapes ignore it.
export function boxesFor(id, facing = 0) {
  const shape = SHAPE[id];
  if (shape === 'slab') return SLAB_BOX;
  if (shape === 'stairs') return STAIR_BOXES;
  if (shape === 'door') return doorBoxes(false, facing);
  if (shape === 'open') return doorBoxes(true, facing);
  if (shape === 'post') return POST_BOX;
  if (shape === 'ramp') return RAMP_BOX;
  return FULL_BOX;
}

// True for ordinary cubes. Slabs and stairs are partial and need box tests.
export function isFullCube(id) {
  return SHAPE[id] === undefined;
}

// True if a body with the given world-space bounds overlaps any box of the block at cell (cx, cy, cz).
export function bodyHitsBlock(id, cx, cy, cz, body, facing = 0) {
  for (const [x0, y0, z0, x1, y1, z1] of boxesFor(id, facing)) {
    if (body.maxX > cx + x0 && body.minX < cx + x1 &&
        body.maxY > cy + y0 && body.minY < cy + y1 &&
        body.maxZ > cz + z0 && body.minZ < cz + z1) return true;
  }
  return false;
}
