import { World } from '../src/world.js';
import { biomeAt } from '../src/biomes.js';
import { MAX_LIGHT } from '../src/lighting.js';

const mockMat = {};
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, mockMat, mockMat);
w.update(8, 8, 2, 25);
console.log('chunks loaded:', w.chunks.size);

let skyMax = 0;
for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) if (w.getLight(x, 90, z, 0) === MAX_LIGHT) skyMax++;
console.log('sky light at maximum at y=90 (of 256):', skyMax);

let surface = -1;
for (let y = 95; y > 0; y--) if (w.getBlock(8, y, 8) !== 0) { surface = y; break; }
console.log('surface y at (8,8):', surface, 'sky light above:', w.getLight(8, surface + 1, 8, 0));

const hit = w.raycast({ x: 8.5, y: surface + 3, z: 8.5 }, { x: 0, y: -1, z: 0 }, 10);
console.log('downward raycast hit:', !!hit && hit.block.y === surface);

const seen = new Set();
for (let x = -300; x < 300; x += 15) for (let z = -300; z < 300; z += 15) seen.add(biomeAt(x, z, 1337));
console.log('biomes seen:', [...seen].sort());
