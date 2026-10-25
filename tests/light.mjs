import { World } from '../src/world.js';
import { BLOCK } from '../src/blocks.js';

const mockMat = {};
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, mockMat, mockMat);
w.update(8, 8, 2, 25);

// Build a sealed 5x5x5 stone room in the air above the terrain, then light it with a torch.
const bx = 4, by = 70, bz = 4;
for (let x = bx - 1; x <= bx + 5; x++) for (let y = by - 1; y <= by + 5; y++) for (let z = bz - 1; z <= bz + 5; z++) {
  const inside = x >= bx && x <= bx + 4 && y >= by && y <= by + 4 && z >= bz && z <= bz + 4;
  w.setBlock(x, y, z, inside ? BLOCK.AIR : BLOCK.STONE);
}
const x = bx + 2, y = by + 2, z = bz + 2;
const before = w.getLight(x + 1, y, z, 1);
w.setBlock(x, y, z, BLOCK.TORCH);
const neighbour = w.getLight(x + 1, y, z, 1);
const far = w.getLight(bx, by, bz, 1);
console.log('block light next to torch before/after:', before, neighbour, '| far corner:', far);
w.setBlock(x, y, z, BLOCK.AIR);
console.log('block light next to torch after removal:', w.getLight(x + 1, y, z, 1), '(expect 0)');
