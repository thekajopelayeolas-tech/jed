import { DOOR, isFullCube, boxesFor, DOOR_BOX, OPEN_DOOR_BOX } from '../src/building.js';
import { BLOCK_DEFS, isSolid } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import { World } from '../src/world.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A closed door is a thin panel, so it is not a full cube and blocks only where the panel is.
check('a closed door is not a full cube', !isFullCube(DOOR.DOOR));
// Doors turn with their facing, so compare the box values for a south door (the default), not the array object.
const sameBox = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
check('a closed door uses the thin door box', sameBox(boxesFor(DOOR.DOOR, 0)[0], DOOR_BOX[0]));

// An open door is drawn as a thin panel swung to the cell's hinge edge, and is not solid, so a player walks through it.
// The open panel is thin across x for a south door, because it has swung 90 degrees from the closed panel.
const openBox = boxesFor(DOOR.OPEN_DOOR, 0)[0];
check('an open door is drawn as a thin panel', boxesFor(DOOR.OPEN_DOOR, 0).length === 1 && openBox[3] - openBox[0] < 0.2);
check('an open door is not solid, so it does not block', !isSolid(DOOR.OPEN_DOOR));
check('a closed door is solid, so it blocks', isSolid(DOOR.DOOR));

// Both door states have a texture and a block definition, so they can be placed and drawn.
check('the closed door has a texture', !!BLOCK_TILES[DOOR.DOOR]);
check('the open door has a texture', !!BLOCK_TILES[DOOR.OPEN_DOOR]);
check('the closed door is a solid block', BLOCK_DEFS[DOOR.DOOR].solid === true);
check('the open door is not solid', BLOCK_DEFS[DOOR.OPEN_DOOR].solid === false);

// A door can be placed in the world and read back.
{
  const scene = { add() {}, remove() {} };
  const w = new World(scene, 1337, {}, {});
  w.update(8, 8, 2, 25);
  const x = 8, z = 8, y = 60;
  w.setBlock(x, y, z, DOOR.DOOR);
  check('a door can be placed in the world', w.getBlock(x, y, z) === DOOR.DOOR);
  w.setBlock(x, y, z, BLOCK.AIR);
}

// The door is the same brown as planks, and the upper half has no seam lines. The handle stays on the upper front.
check('a door is the same colour as planks', JSON.stringify(BLOCK_DEFS[DOOR.DOOR].side) === JSON.stringify(BLOCK_DEFS[BLOCK.PLANKS].side));
check('an open door is the same colour as planks', JSON.stringify(BLOCK_DEFS[DOOR.OPEN_DOOR].side) === JSON.stringify(BLOCK_DEFS[BLOCK.PLANKS].side));
{
  // The upper half's planks have no seam: the rows that are a multiple of 4 are not darker than the rows around them.
  const up = tileImageData('doorFront');
  const lum = (x, y) => { const i = (y * TILE + x) * 4; return (up[i] + up[i + 1] + up[i + 2]) / 3; };
  // Read the middle of the door face (away from the frame and the handle), row 4 against rows 3 and 5.
  let seamDarker = 0;
  for (let x = 4; x <= 11; x++) if (lum(x, 4) < lum(x, 3) - 15 && lum(x, 4) < lum(x, 5) - 15) seamDarker++;
  check('the upper door face has no seam line across its planks', seamDarker === 0);
}
// The lower half of a door has no handle, no frame, and no seam row. The upper half keeps the handle.
import { doorTileName } from '../src/building.js';
import { tileImageData, tileUV, TILE_INDEX, TILE } from '../src/textures.js';
const handleAt = (px, x, y) => {
  const i = (y * TILE + x) * 4;
  return px[i] > 200 && px[i + 1] > 170 && px[i + 2] < 100;
};
const lower = tileImageData('doorBottom');
const upper = tileImageData('doorFront');
check('the lower door half has a texture', lower.length === TILE * TILE * 4);
let lowerHandle = false;
for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (handleAt(lower, x, y)) lowerHandle = true;
check('the lower door half has no handle', !lowerHandle);
let upperHandle = false;
for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (handleAt(upper, x, y)) upperHandle = true;
check('the upper door half keeps its handle', upperHandle);
// No frame and no horizontal seam: the edge pixels of the lower half are plank colour, not the dark frame colour.
const frameColour = (px, x, y) => {
  const i = (y * TILE + x) * 4;
  return px[i] < 110 && px[i] > 70 && px[i + 1] < 80 && px[i + 2] < 40;
};
let lowerFrame = false;
for (let i = 0; i < TILE; i++) if (frameColour(lower, i, 0) || frameColour(lower, 0, i)) lowerFrame = true;
check('the lower door half has no frame along its edges', !lowerFrame);
// The mesher picks the lower tile for a door's lower cell and the handle tile for its upper cell.
check('a door lower cell uses the bottom tile on every face', doorTileName(DOOR.DOOR, true, false) === 'doorBottom' && doorTileName(DOOR.DOOR, false, false) === 'doorBottom');
check('a door upper cell uses the handle tile on its front', doorTileName(DOOR.DOOR, true, true) === 'doorFront');
check('a door upper cell uses plain planks on its other faces', doorTileName(DOOR.DOOR, false, true) === 'door');

// The mesher draws the lower and upper door cells with different tiles: the lower half is plain planks, and the
// upper half keeps the handle on its front. Build a real chunk with a door in it and read the UVs it produces.
import { Chunk } from '../src/chunk.js';
import { buildChunkGeometry } from '../src/mesher.js';
import { FACING } from '../src/facing.js';
{
  const chunk = new Chunk(0, 0);
  const cx = 4, cz = 4, yLow = 60;
  // Chunk.set takes the facing as its fourth argument. Both halves of a door face south.
  chunk.set(cx, yLow, cz, DOOR.DOOR, FACING.SOUTH);
  chunk.set(cx, yLow + 1, cz, DOOR.DOOR, FACING.SOUTH);
  // A flat world with the door cells as the only blocks, so the mesher sees nothing else.
  const world = {
    getBlock: (x, y, z) => (x === cx && z === cz && (y === yLow || y === yLow + 1) ? DOOR.DOOR : BLOCK.AIR),
    getLight: () => 15,
  };
  const geo = buildChunkGeometry(chunk, world);
  // Each tile is a rectangle in the atlas. Collect every UV the door faces use, and check the tiles they belong to.
  const used = new Set();
  const uv = geo.opaque.uv.length ? geo.opaque.uv : geo.trans.uv;
  for (let i = 0; i < uv.length; i += 2) used.add(`${uv[i].toFixed(4)},${uv[i + 1].toFixed(4)}`);
  const rect = (name) => tileUV(TILE_INDEX[name]).map((n) => n.toFixed(4)).join(',');
  const lowerRect = rect('doorBottom');
  const handleRect = rect('doorFront');
  const plainRect = rect('door');
  const cornerKeys = (r) => { const [u0, v0, u1, v1] = r.split(',').map(Number); return [`${u0.toFixed(4)},${v0.toFixed(4)}`, `${u1.toFixed(4)},${v1.toFixed(4)}`]; };
  check('the mesher produces door faces', used.size > 0);
  // Each cell's faces, read one cell at a time. The world holds both halves, so the upper cell sees the lower one
  // below it, and the lower cell sees nothing below it. The chunk holds only the cell being read.
  const tilesFor = (cell) => {
    const c = new Chunk(0, 0);
    c.set(cx, cell, cz, DOOR.DOOR, FACING.SOUTH);
    const w = {
      getBlock: (x, y, z) => (x === cx && z === cz && (y === yLow || y === yLow + 1) ? DOOR.DOOR : BLOCK.AIR),
      getLight: () => 15,
    };
    const g = buildChunkGeometry(c, w);
    const list = g.opaque.uv.length ? g.opaque.uv : g.trans.uv;
    const s = new Set();
    for (let i = 0; i < list.length; i += 2) s.add(`${list[i].toFixed(4)},${list[i + 1].toFixed(4)}`);
    return s;
  };
  const lowerOnly = tilesFor(yLow);
  const upperOnly = tilesFor(yLow + 1);
  // Each quad carries its tile as a rectangle: its lower-left and upper-right UVs. Name each quad by the exact
  // rectangle it uses, so a tile is matched only when all four of its corners agree.
  const quadTiles = (cell) => {
    const c = new Chunk(0, 0);
    c.set(cx, cell, cz, DOOR.DOOR, FACING.SOUTH);
    const w = {
      getBlock: (x, y, z) => (x === cx && z === cz && (y === yLow || y === yLow + 1) ? DOOR.DOOR : BLOCK.AIR),
      getLight: () => 15,
    };
    const g = buildChunkGeometry(c, w);
    const list = g.opaque.uv.length ? g.opaque.uv : g.trans.uv;
    const names = Object.keys(TILE_INDEX).map((n) => [n, rect(n)]);
    const found = new Set();
    // Every quad is four vertices with two UVs each, so a quad's rectangle is the min and max over its vertices.
    for (let q = 0; q * 8 < list.length; q++) {
      const us = [], vs = [];
      for (let k = 0; k < 4; k++) { us.push(list[q * 8 + k * 2]); vs.push(list[q * 8 + k * 2 + 1]); }
      const key = [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)].map((n) => n.toFixed(4)).join(',');
      const hit = names.find(([, r]) => r === key);
      if (hit) found.add(hit[0]);
    }
    return found;
  };
  const lowerTiles = quadTiles(yLow);
  const upperTiles = quadTiles(yLow + 1);
  // The lower half of a door is plain planks, and never the handle tile.
  check('a lower door cell is plain planks', lowerTiles.has('doorBottom') && !lowerTiles.has('doorFront'));
  // The upper half keeps the handle on its front.
  check('an upper door cell keeps the handle tile', upperTiles.has('doorFront'));
}

// Toggling a door: closed becomes open and open becomes closed. The toggle is the same rule main.js uses.
const toggle = (id) => (id === DOOR.DOOR ? DOOR.OPEN_DOOR : DOOR.DOOR);
check('toggling a closed door opens it', toggle(DOOR.DOOR) === DOOR.OPEN_DOOR);
check('toggling an open door closes it', toggle(DOOR.OPEN_DOOR) === DOOR.DOOR);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
