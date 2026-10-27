// Torch light is the brightest the game allows, and peaceful mobs only spawn where there is open sky.
import { World } from '../src/world.js';
import { BLOCK } from '../src/blocks.js';
import { MAX_LIGHT } from '../src/lighting.js';
import { MobManager, MOB } from '../src/mobs.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

// A sealed stone room in the air, as tests/light.mjs builds, so the torch is lit by its own light only.
const bx = 4, by = 70, bz = 4;
for (let x = bx - 1; x <= bx + 5; x++) for (let y = by - 1; y <= by + 5; y++) for (let z = bz - 1; z <= bz + 5; z++) {
  const inside = x >= bx && x <= bx + 4 && y >= by && y <= by + 4 && z >= bz && z <= bz + 4;
  w.setBlock(x, y, z, inside ? BLOCK.AIR : BLOCK.STONE);
}
w.setBlock(bx + 2, by + 2, bz + 2, BLOCK.TORCH);
check('the cell next to a torch is at the brightest level', w.getLight(bx + 3, by + 2, bz + 2, 1) === MAX_LIGHT - 1);

// Peaceful land mobs need open sky. A column whose sky light is zero is refused, so a cow never spawns in the dark.
// Sky light spreads sideways, so the test forces the sky channel to zero rather than relying on a roof alone.
const mm = new MobManager(scene, w, 1337);
const spawnX = 8, spawnZ = 8;
let top = 0;
for (let y = 94; y > 0; y--) if (w.getBlock(spawnX, y, spawnZ) !== BLOCK.AIR) { top = y; break; }
for (let y = top + 1; y <= top + 3; y++) w.setLight(spawnX, y, spawnZ, 0, 0);
const before = mm.mobs.length;
for (let i = 0; i < 400; i++) mm.trySpawnOnLand({ x: spawnX - 14, z: spawnZ }, MOB.COW, false);
check('no peaceful mob spawns where the sky light is zero', mm.mobs.length === before || mm.mobs.every((m) => Math.floor(m.pos.x) !== spawnX || Math.floor(m.pos.z) !== spawnZ));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
