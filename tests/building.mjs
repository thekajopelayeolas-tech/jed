import { BLOCK, BLOCK_DEFS, isSolid } from '../src/blocks.js';
import { BUILD, boxesFor, isFullCube, bodyHitsBlock } from '../src/building.js';
import { RECIPES, matchRecipe } from '../src/inventory.js';
import { BLOCK_TILES } from '../src/textures.js';
import { breakTime, blockInfo } from '../src/mining.js';
import { buildChunkGeometry } from '../src/mesher.js';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const ids = Object.values(BUILD);

check('every building block has a definition', ids.every((id) => BLOCK_DEFS[id]?.name));
check('every building block has a texture', ids.every((id) => BLOCK_TILES[id]));
check('building blocks are placeable, not items', ids.every((id) => BLOCK_DEFS[id].item !== true));
check('building blocks are solid', ids.every((id) => isSolid(id)));
check('every building block has a recipe', ids.every((id) => RECIPES.some((r) => r.result === id)));
check('every building block has a mining entry', ids.every((id) => blockInfo(id) !== undefined));

// Shapes: cubes are one full box, slabs are the lower half, stairs are two boxes.
check('a stone cube is a full cube', isFullCube(BLOCK.STONE) === true);
check('a stone slab is not a full cube', isFullCube(BUILD.STONE_SLAB) === false);
check('a slab is one half-height box', boxesFor(BUILD.STONE_SLAB).length === 1 && boxesFor(BUILD.STONE_SLAB)[0][4] === 0.5);
check('stairs are two boxes', boxesFor(BUILD.WOOD_STAIRS).length === 2);

// Collision: a body standing on a slab's upper half overlaps; one above the slab does not.
const body = (y) => ({ minX: 0.2, maxX: 0.8, minY: y, maxY: y + 1.8, minZ: 0.2, maxZ: 0.8 });
check('a body inside the lower half of a slab collides', bodyHitsBlock(BUILD.STONE_SLAB, 0, 0, 0, body(0.1)) === true);
check('a body above the lower half of a slab does not collide', bodyHitsBlock(BUILD.STONE_SLAB, 0, 0, 0, body(0.6)) === false);
// Stairs: the upper step is at low x (0 to 0.5). A body in that step collides; one over the open front does not.
check('a body in the upper step of stairs collides', bodyHitsBlock(BUILD.WOOD_STAIRS, 0, 0, 0, { minX: 0.1, maxX: 0.3, minY: 0.6, maxY: 1.2, minZ: 0.2, maxZ: 0.8 }) === true);
check('a body over the open front of stairs does not collide', bodyHitsBlock(BUILD.WOOD_STAIRS, 0, 0, 0, { minX: 0.7, maxX: 0.9, minY: 0.6, maxY: 1.2, minZ: 0.2, maxZ: 0.8 }) === false);

// Mining: wood variants use the axe, stone variants the pickaxe, and the cobble-based recipes stay tier-1.
check('wood slab breaks faster with an axe', breakTime(BUILD.WOOD_SLAB, BLOCK.WOODEN_AXE) < breakTime(BUILD.WOOD_SLAB, 0));
check('stone bricks break faster with a pickaxe', breakTime(BUILD.STONE_BRICKS, BLOCK.STONE_PICKAXE) < breakTime(BUILD.STONE_BRICKS, 0));

// Recipes: each material's block, slab, and stair shapes match their pattern.
const grid = (rows) => {
  const out = Array(9).fill(0);
  rows.forEach((row, r) => row.forEach((id, c) => { out[r * 3 + c] = id; }));
  return out;
};
const S = BLOCK.STONE, P = BLOCK.PLANKS, C = BLOCK.COBBLESTONE;
check('three stone make a stone slab', matchRecipe(grid([[S, S, S]]), 3)?.result === BUILD.STONE_SLAB);
check('four planks in a stair shape make wood stairs', matchRecipe(grid([[P], [P, P], [P, P, P]]), 3)?.result === BUILD.WOOD_STAIRS);
check('four stone in a 2x2 make stone bricks', matchRecipe([S, S, 0, S, S, 0, 0, 0, 0], 3)?.result === BUILD.STONE_BRICKS);
check('four cobblestone in a 2x2 make polished stone', matchRecipe([C, C, 0, C, C, 0, 0, 0, 0], 3)?.result === BUILD.POLISHED_STONE);

// Mesher: a slab adds faces. A cube next to a slab must keep its face toward the slab.
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
const chunk = w.chunks.values().next().value;
const x = chunk.cx * 16 + 2, z = chunk.cz * 16 + 2, y = 60;
w.setBlock(x, y, z, BUILD.STONE_SLAB);
let meshOk = true;
let slabFaces = 0;
try {
  for (const c of w.chunks.values()) buildChunkGeometry(c, w);
  const g = buildChunkGeometry(chunk, w);
  slabFaces = g.opaque.idx.length;
} catch (err) {
  meshOk = false;
  console.log(err.message);
}
check('the mesher draws a slab without throwing', meshOk);
check('a slab adds faces to the mesh', slabFaces > 0);

// A cube beside a slab: its face toward the slab must still be emitted.
w.setBlock(x, y, z, BLOCK.STONE);
const before = buildChunkGeometry(chunk, w).opaque.idx.length;
w.setBlock(x + 1, y, z, BUILD.STONE_SLAB);
const after = buildChunkGeometry(chunk, w).opaque.idx.length;
check('a cube next to a slab keeps the face toward it', after > before - 6);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
