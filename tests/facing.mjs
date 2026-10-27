import { FACING, facingToward, isFrontFace, sideName } from '../src/facing.js';
import { Chunk } from '../src/chunk.js';
import { World } from '../src/world.js';
import { buildChunkGeometry } from '../src/mesher.js';
import { BLOCK } from '../src/blocks.js';
import { STORAGE } from '../src/building.js';
import { BLOCK_TILES, TILE_INDEX } from '../src/textures.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A block placed east of the player faces west, toward them. Four directions cover the compass.
check('a block east of the player faces west', facingToward(10, 0, 5, 0) === FACING.WEST);
check('a block west of the player faces east', facingToward(0, 0, 5, 0) === FACING.EAST);
check('a block south of the player faces north', facingToward(0, 10, 0, 5) === FACING.NORTH);
// The player is north of this block (smaller z), so the block's front points north, toward them.
check('a block with the player to its north faces north', facingToward(0, 0, 0, -5) === FACING.NORTH);

// Diagonal placement picks the dominant axis, so the block still faces one clear side.
check('a block diagonal to the player faces the longer axis', facingToward(10, 0, 5, 2) === FACING.WEST);

// Exactly one side of a block is its front.
const fronts = ['north', 'south', 'east', 'west'].filter((s) => isFrontFace(FACING.WEST, s));
check('exactly one side is the front', fronts.length === 1 && fronts[0] === 'west');

// The mesher's face directions map to side names, and vertical faces have none.
check('the +x face is east', sideName([1, 0, 0]) === 'east');
check('the -z face is north', sideName([0, 0, -1]) === 'north');
check('the top face has no side name', sideName([0, 1, 0]) === null);

// Facing is stored per block: it defaults to south, can be set, and survives a chunk edit.
const c = new Chunk(0, 0);
check('an unset block defaults to south', c.getFacing(1, 60, 1) === FACING.SOUTH);
c.set(1, 60, 1, STORAGE.CHEST, FACING.EAST);
check('a placed block keeps its facing', c.getFacing(1, 60, 1) === FACING.EAST);
c.set(1, 60, 1, BLOCK.STONE);
check('replacing a block with a plain block resets its facing to south', c.getFacing(1, 60, 1) === FACING.SOUTH);

// World placement passes facing through, and the chunk stores it.
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
w.setBlock(8, 80, 8, STORAGE.CHEST, FACING.NORTH);
check('a chest placed in the world keeps its facing', w.chunkAt(0, 0).getFacing(8, 80, 8) === FACING.NORTH);

// The mesher draws the front tile on the front face only. Put one chest alone in a chunk and check the faces.
const solo = new Chunk(5, 5);
solo.set(4, 70, 4, STORAGE.CHEST, FACING.EAST);
const scene2 = { add() {}, remove() {} };
const w2 = new World(scene2, 1337, {}, {});
w2.chunks.set('5,5', solo);
const geo = buildChunkGeometry(solo, w2);
const uvs = geo.opaque.uv;
const frontTile = BLOCK_TILES[STORAGE.CHEST].front;
const sideTile = BLOCK_TILES[STORAGE.CHEST].side;
check('the chest has a distinct front tile', frontTile !== sideTile);
check('the mesh draws some faces for the chest', uvs.length > 0);

// Each quad has 4 vertices and 8 UV values. Work out which tile each quad uses from its UV rectangle.
const frontRect = (() => { const [u0, v0, u1, v1] = tileRect(frontTile); return [u0, v0, u1, v1]; })();
function tileRect(name) {
  const idx = TILE_INDEX[name];
  const cols = 8;
  const rows = Math.ceil(Object.keys(TILE_INDEX).length / cols);
  const c = idx % cols;
  const r = Math.floor(idx / cols);
  return [c / cols, r / rows, (c + 1) / cols, (r + 1) / rows];
}
const quads = [];
for (let q = 0; q < uvs.length / 8; q++) {
  const s = q * 8;
  quads.push([uvs[s], uvs[s + 1], uvs[s + 2], uvs[s + 3], uvs[s + 4], uvs[s + 5], uvs[s + 6], uvs[s + 7]]);
}
const isFrontQuad = (qd) => {
  const us = [qd[0], qd[2], qd[4], qd[6]];
  const vs = [qd[1], qd[3], qd[5], qd[7]];
  const [u0, v0, u1, v1] = frontRect;
  return Math.min(...us) >= u0 - 1e-6 && Math.max(...us) <= u1 + 1e-6 && Math.min(...vs) >= v0 - 1e-6 && Math.max(...vs) <= v1 + 1e-6;
};
const frontCount = quads.filter(isFrontQuad).length;
check('exactly one side of the chest shows the front tile', frontCount === 1);

// Saving keeps facing: edits carry the facing array, and a reload restores it.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
const { saveGame, loadGame } = await import('../src/save.js');
const { Player } = await import('../src/player.js');
const { Inventory } = await import('../src/inventory.js');
const w3 = new World(scene, 1337, {}, {});
w3.update(8, 8, 2, 25);
w3.setBlock(8, 80, 8, STORAGE.CHEST, FACING.WEST);
saveGame(w3, new Player(w3, 8, 80, 8), new Inventory(), 0.4);
const loaded = loadGame();
check('the save file has a facing entry for the edited chunk', loaded.facingEdits.has('0,0'));
check('the saved facing reads back as west', loaded.facingEdits.get('0,0')[80 * 256 + 8 * 16 + 8] === FACING.WEST);

// Older saves have no facing at all, so loading one gives an empty map and blocks stay south.
store.set('voxelcraft-save-v1', JSON.stringify({ chunks: {}, player: { x: 8, y: 80, z: 8 }, inventory: [], timeOfDay: 0.4 }));
check('an old save without facing loads with no facing entries', loadGame().facingEdits.size === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
