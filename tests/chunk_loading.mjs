import * as THREE from 'three';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

const scene = new THREE.Scene();
const material = new THREE.MeshLambertMaterial();
const world = new World(scene, 1337, material, material);
world.update(8, 8, 0, 1);
const firstChunk = [...world.chunks.values()][0];
check('interactive loading generates only one chunk per frame', world.chunks.size === 1 && world.pendingLighting.length === 1);
check('new chunks wait for their own lighting frame', world.litChunks.size === 0 && firstChunk.mesh === null);
world.update(8, 8, 0, 1);
check('lighting is processed separately from generation', world.litChunks.size === 1 && firstChunk.mesh === null);
world.update(8, 8, 0, 1);
check('mesh building is separated into its own frame', firstChunk.mesh !== null && firstChunk.dirty === false);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
