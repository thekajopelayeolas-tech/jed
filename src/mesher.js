import * as THREE from 'three';
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { LIGHT, lightFactor } from './lighting.js';

// Face definitions: direction, 4 corner offsets (CCW from outside), and shade.
const FACES = [
  { dir: [1, 0, 0], shade: 0.8, face: 'side', corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], shade: 0.8, face: 'side', corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 1, 0], shade: 1.0, face: 'top', corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.5, face: 'bottom', corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], shade: 0.9, face: 'side', corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], shade: 0.9, face: 'side', corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

// Builds opaque and transparent geometry for one chunk.
// `world.getBlock(wx, wy, wz)` is used to check neighbours across chunk borders.
export function buildChunkGeometry(chunk, world) {
  const opaque = { pos: [], nor: [], col: [], idx: [] };
  const trans = { pos: [], nor: [], col: [], idx: [] };
  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        if (id === BLOCK.AIR) continue;
        const def = BLOCK_DEFS[id];
        const target = def.transparent ? trans : opaque;
        const wx = ox + x;
        const wz = oz + z;

        for (const f of FACES) {
          const nid = world.getBlock(wx + f.dir[0], y + f.dir[1], wz + f.dir[2]);
          // Hide a face if the neighbour is opaque, or is the same transparent block type.
          if (nid !== BLOCK.AIR && (!BLOCK_DEFS[nid].transparent || nid === id)) continue;

          // Brightness comes from the light in the empty cell this face looks into.
          const fx = wx + f.dir[0];
          const fy = y + f.dir[1];
          const fz = wz + f.dir[2];
          const lf = lightFactor(Math.max(0, world.getLight(fx, fy, fz, LIGHT.SKY), world.getLight(fx, fy, fz, LIGHT.BLOCK)));
          const color = def[f.face];
          const base = target.pos.length / 3;
          for (const c of f.corners) {
            target.pos.push(x + c[0], y + c[1], z + c[2]);
            target.nor.push(f.dir[0], f.dir[1], f.dir[2]);
            target.col.push(color[0] * f.shade * lf, color[1] * f.shade * lf, color[2] * f.shade * lf);
          }
          target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
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
