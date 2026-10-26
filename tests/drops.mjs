import * as THREE from 'three';
import { ItemDrop } from '../src/drops.js';
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';
import { BLOCK_TILES, createAtlasTexture } from '../src/textures.js';
import { itemPixels } from '../src/item-icons.js';

let failed = 0;
const check = (ok, msg) => {
  console.log(ok ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!ok) failed++;
};

// Only the scene and the world's block lookup are needed for building a drop mesh.
const scene = { add() {}, remove() {} };
const world = { getBlock: () => BLOCK.AIR };
const atlasMaterial = new THREE.MeshLambertMaterial({ map: createAtlasTexture(THREE), vertexColors: true });

// Blocks with textures use the atlas material, so they show the same tiles as placed blocks.
const stone = new ItemDrop(scene, world, BLOCK.STONE, 0, 0, 0, atlasMaterial);
check(stone.mesh.material === atlasMaterial, 'textured block drop uses the atlas material');
check(stone.ownsMaterial === false, 'textured block drop does not own its material');

// Every block drop should be a cube with 24 vertices, each carrying one atlas UV pair and a shade.
const blockIds = Object.keys(BLOCK_TILES).map(Number);
const badCube = blockIds.filter((id) => {
  const d = new ItemDrop(scene, world, id, 0, 0, 0, atlasMaterial);
  const uv = d.mesh.geometry.attributes.uv;
  const col = d.mesh.geometry.attributes.color;
  return uv.count !== 24 || col.count !== 24;
});
check(badCube.length === 0, `every textured block builds a 24-vertex cube (bad: ${badCube.map((id) => BLOCK_DEFS[id].name).join(', ') || 'none'})`);

// UVs must stay inside the atlas, so no drop samples a neighbouring tile.
const outOfRange = blockIds.filter((id) => {
  const d = new ItemDrop(scene, world, id, 0, 0, 0, atlasMaterial);
  const uv = d.mesh.geometry.attributes.uv.array;
  return Array.from(uv).some((v) => v < 0 || v > 1);
});
check(outOfRange.length === 0, `block UVs stay within the atlas (bad: ${outOfRange.map((id) => BLOCK_DEFS[id].name).join(', ') || 'none'})`);

// Items with sprites use a card with their own texture and alpha test.
const coal = new ItemDrop(scene, world, BLOCK.COAL, 0, 0, 0, atlasMaterial);
check(coal.mesh.material.map !== null && coal.mesh.material.alphaTest === 0.5, 'item drop uses its sprite texture with alpha test');
check(coal.mesh.geometry.type === 'PlaneGeometry', 'item drop is a flat card');
check(itemPixels(BLOCK.COAL) !== null, 'coal has a sprite to show');

// Dropping the same item twice must reuse the same cached material, not create a new one each time.
const coal2 = new ItemDrop(scene, world, BLOCK.COAL, 0, 0, 0, atlasMaterial);
check(coal.mesh.material === coal2.mesh.material, 'same item shares one cached material');

// Disposing a shared item drop must not free the cached material, since later drops still use it.
coal.dispose();
check(coal2.mesh.material.map !== null, 'disposing one item drop keeps the shared material usable');

// Unknown ids fall back to a colour cube that this drop owns and disposes.
const fallback = new ItemDrop(scene, world, 999, 0, 0, 0, atlasMaterial);
check(fallback.ownsMaterial === true, 'unknown id gets its own fallback material');

if (failed) process.exitCode = 1;
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
