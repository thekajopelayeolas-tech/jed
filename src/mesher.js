import * as THREE from 'three';
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { LIGHT, lightFactor } from './lighting.js';
import { BLOCK_TILES, TILE_INDEX, tileUV } from './textures.js';
import { isFullCube, boxesFor } from './building.js';

// Face definitions: direction, 4 corner offsets (CCW from outside), and shade.
const FACES = [
  { dir: [1, 0, 0], shade: 0.8, face: 'side', corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], shade: 0.8, face: 'side', corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 1, 0], shade: 1.0, face: 'top', corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.5, face: 'bottom', corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], shade: 0.9, face: 'side', corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], shade: 0.9, face: 'side', corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

// Ambient occlusion for one face corner. The face looks into an air cell (x+n). A corner touches
// two in-plane neighbours of that air cell and the diagonal between them. Each solid one darkens
// the corner. Returns 3 (open) down to 0 (fully occluded).
function isOccluder(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  return id !== BLOCK.AIR && !BLOCK_DEFS[id].transparent ? 1 : 0;
}

function cornerAO(world, wx, y, wz, f, c) {
  // The air cell in front of the face.
  const ax = wx + f.dir[0];
  const ay = y + f.dir[1];
  const az = wz + f.dir[2];
  // The two in-plane axes are the ones the face normal does not point along.
  // For each, the corner's side (0 = negative, 1 = positive) gives the neighbour offset.
  const inPlane = [];
  if (f.dir[0] === 0) inPlane.push([0, c[0] === 0 ? -1 : 1]);
  if (f.dir[1] === 0) inPlane.push([1, c[1] === 0 ? -1 : 1]);
  if (f.dir[2] === 0) inPlane.push([2, c[2] === 0 ? -1 : 1]);
  const [[axisA, sA], [axisB, sB]] = inPlane;
  const offA = [0, 0, 0];
  const offB = [0, 0, 0];
  offA[axisA] = sA;
  offB[axisB] = sB;
  const sideA = isOccluder(world, ax + offA[0], ay + offA[1], az + offA[2]);
  const sideB = isOccluder(world, ax + offB[0], ay + offB[1], az + offB[2]);
  const diag = isOccluder(world, ax + offA[0] + offB[0], ay + offA[1] + offB[1], az + offA[2] + offB[2]);
  // Standard voxel AO: if both sides are solid the corner is fully occluded.
  if (sideA && sideB) return 0;
  return 3 - sideA - sideB - diag;
}

// Emits the six faces of one axis-aligned box inside a block cell. Box corners are in 0..1 cell units.
// Faces point outward, so the side facing a neighbour is drawn too. Lighting and textures match cubes.
function emitBox(box, id, def, target, world, chunk, wx, y, wz, x, z) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const fx = wx;
  const fy = y;
  const fz = wz;
  const shapes = [
    { dir: [1, 0, 0], shade: 0.8, face: 'side', corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { dir: [-1, 0, 0], shade: 0.8, face: 'side', corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { dir: [0, 1, 0], shade: 1.0, face: 'top', corners: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    { dir: [0, -1, 0], shade: 0.5, face: 'bottom', corners: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { dir: [0, 0, 1], shade: 0.9, face: 'side', corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { dir: [0, 0, -1], shade: 0.9, face: 'side', corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
  ];
  for (const f of shapes) {
    const lf = lightFactor(Math.max(0, world.getLight(fx + f.dir[0], fy + f.dir[1], fz + f.dir[2], LIGHT.SKY), world.getLight(fx + f.dir[0], fy + f.dir[1], fz + f.dir[2], LIGHT.BLOCK)));
    const tileName = BLOCK_TILES[id][f.face] ?? BLOCK_TILES[id].side;
    const [u0, v0, u1, v1] = tileUV(TILE_INDEX[tileName]);
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const base = target.pos.length / 3;
    f.corners.forEach((c, i) => {
      const k = lf * f.shade;
      target.pos.push(x + c[0], y + c[1], z + c[2]);
      target.nor.push(f.dir[0], f.dir[1], f.dir[2]);
      target.col.push(k, k, k);
      target.uv.push(uvs[i][0], uvs[i][1]);
    });
    target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

// Builds opaque and transparent geometry for one chunk.
// `world.getBlock(wx, wy, wz)` is used to check neighbours across chunk borders.
export function buildChunkGeometry(chunk, world) {
  const opaque = { pos: [], nor: [], col: [], uv: [], idx: [] };
  const trans = { pos: [], nor: [], col: [], uv: [], idx: [] };
  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        // Skip air and any id without a block texture, such as an item from a bad save.
        if (id === BLOCK.AIR || !BLOCK_TILES[id]) continue;
        const def = BLOCK_DEFS[id];
        const target = def.transparent ? trans : opaque;
        const wx = ox + x;
        const wz = oz + z;

        // Slabs and stairs are partial boxes, so they are drawn box by box and never culled.
        if (!isFullCube(id)) {
          for (const box of boxesFor(id)) {
            emitBox(box, id, def, target, world, chunk, wx, y, wz, x, z);
          }
          continue;
        }

        for (const f of FACES) {
          const nid = world.getBlock(wx + f.dir[0], y + f.dir[1], wz + f.dir[2]);
          // Hide a face if the neighbour is opaque, or is the same transparent block type.
          // A slab or stair does not fill its whole cell, so a cube must still draw its face next to one.
          if (nid !== BLOCK.AIR && isFullCube(nid) && (!BLOCK_DEFS[nid].transparent || nid === id)) continue;

          // Brightness comes from the light in the empty cell this face looks into.
          const fx = wx + f.dir[0];
          const fy = y + f.dir[1];
          const fz = wz + f.dir[2];
          const lf = lightFactor(Math.max(0, world.getLight(fx, fy, fz, LIGHT.SKY), world.getLight(fx, fy, fz, LIGHT.BLOCK)));
          const tileName = BLOCK_TILES[id][f.face] ?? BLOCK_TILES[id].side;
          const [u0, v0, u1, v1] = tileUV(TILE_INDEX[tileName]);
          const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
          const base = target.pos.length / 3;
          f.corners.forEach((c, i) => {
            // Ambient occlusion: 3 = open, 0 = fully occluded. Scale brightness from 0.55 up to 1.
            const k = lf * f.shade * (0.55 + 0.15 * cornerAO(world, wx, y, wz, f, c));
            target.pos.push(x + c[0], y + c[1], z + c[2]);
            target.nor.push(f.dir[0], f.dir[1], f.dir[2]);
            target.col.push(k, k, k);
            target.uv.push(uvs[i][0], uvs[i][1]);
          });
          // Split the quad along the diagonal with the smaller AO sum so shading interpolates without a seam.
          const ao = (i) => cornerAO(world, wx, y, wz, f, f.corners[i]);
          if (ao(0) + ao(2) > ao(1) + ao(3)) {
            target.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          } else {
            target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
  }

  return { opaque, trans };
}

function toMesh(data, material) {
  if (data.idx.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(data.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(data.col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
  g.setIndex(data.idx);
  return new THREE.Mesh(g, material);
}

export function createChunkMeshes(geo, opaqueMat, transMat) {
  const group = new THREE.Group();
  const o = toMesh(geo.opaque, opaqueMat);
  const t = toMesh(geo.trans, transMat);
  if (o) group.add(o);
  if (t) group.add(t);
  return group;
}
