// Which horizontal way a placed block faces. Pure functions with no DOM or three.js, so tests run in Node.
// A block's front is the side that points at the player who placed it. Four directions are enough.
// Facing is stored per block as 0..3. The default 0 is south (+z), so blocks saved before facing existed keep
// their look.
export const FACING = { SOUTH: 0, WEST: 1, NORTH: 2, EAST: 3 };

// The unit step (dx, dz) for each facing: the direction the block's front points.
const STEP = [
  [0, 1],   // SOUTH
  [-1, 0],  // WEST
  [0, -1],  // NORTH
  [1, 0],   // EAST
];

export function facingStep(facing) {
  return STEP[facing & 3];
}

// The facing that points from a block toward a player standing at (px, pz).
// Chooses the dominant horizontal axis, so a block placed beside you faces you.
// The player's position is the feet position; a block at (bx, bz) is its cell's corner.
export function facingToward(bx, bz, px, pz) {
  const dx = px - (bx + 0.5);
  const dz = pz - (bz + 0.5);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? FACING.EAST : FACING.WEST;
  return dz > 0 ? FACING.SOUTH : FACING.NORTH;
}

// The side name for a mesher face direction [dx, dy, dz]. Only the four horizontal faces have a side name.
export function sideName(dir) {
  const [dx, dy, dz] = dir;
  if (dy !== 0) return null;
  if (dx === 1) return 'east';
  if (dx === -1) return 'west';
  if (dz === 1) return 'south';
  if (dz === -1) return 'north';
  return null;
}

// Which side of a block shows its front texture, given the facing and the side being drawn.
// `side` is one of 'north', 'south', 'east', 'west' (the outward direction of that face).
// The front face is the one whose outward normal matches the facing.
export function isFrontFace(facing, side) {
  const [sx, sz] = facingStep(facing);
  const normal = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[side];
  return !!normal && normal[0] === sx && normal[1] === sz;
}
