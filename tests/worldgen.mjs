import { Chunk, isCave } from '../src/chunk.js';
import { BLOCK } from '../src/blocks.js';
import { isDarkEnough } from '../src/mobs.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Generate a band of chunks away from spawn and count the blocks.
const counts = {};
let waterCols = 0;
let cols = 0;
for (let cx = -12; cx <= 12; cx++) {
  for (let cz = -12; cz <= 12; cz++) {
    const c = new Chunk(cx, cz);
    c.generate(1337);
    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        cols++;
        let hasWater = false;
        for (let y = 0; y < 96; y++) {
          const id = c.get(x, y, z);
          counts[id] = (counts[id] || 0) + 1;
          if (id === BLOCK.WATER) hasWater = true;
        }
        if (hasWater) waterCols++;
      }
    }
  }
}

// Water: lakes and oceans exist on the generated map.
check('some columns have water (lakes and oceans exist)', waterCols > 0);
check('water covers a visible share of columns (over 3%)', waterCols / cols > 0.03);

// Ores: iron and coal are common, diamond uncommon, rainbow rare.
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const share = (id) => (counts[id] || 0) / total;
check('coal ore exists', share(BLOCK.COAL_ORE) > 0);
check('iron ore is more common than diamond', share(BLOCK.IRON_ORE) > share(BLOCK.DIAMOND_ORE));
check('diamond ore exists but is uncommon', share(BLOCK.DIAMOND_ORE) > 0 && share(BLOCK.DIAMOND_ORE) < 0.005);
check('rainbow ore is rarer than diamond', share(BLOCK.RAINBOW_ORE) < share(BLOCK.DIAMOND_ORE));

// Caves: a noticeable share of underground cells are carved, but the world is not hollow.
let caves = 0;
let n = 0;
for (let x = 0; x < 200; x++) for (let z = 0; z < 200; z++) for (let y = 5; y < 40; y++) {
  n++;
  if (isCave(x, y, z, 1337)) caves++;
}
const caveShare = caves / n;
check('caves carve some underground space (over 2%)', caveShare > 0.02);
check('caves leave most underground ground solid (under 25%)', caveShare < 0.25);

// The bedrock floor is never carved.
const cc = new Chunk(0, 0);
cc.generate(1337);
let bedrockOk = true;
for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) if (cc.get(x, 0, z) !== BLOCK.BEDROCK) bedrockOk = false;
check('bedrock floor is intact at y=0', bedrockOk);

// Zombie light rule: only fully dark cells qualify.
const world = (sky, block) => ({ getLight: (x, y, z, ch) => (ch === 0 ? sky : block) });
check('dark cell (no sky, no block light) allows a zombie', isDarkEnough(world(0, 0), 0, 10, 0));
check('sky light blocks a zombie', !isDarkEnough(world(15, 0), 0, 10, 0));
check('block light blocks a zombie', !isDarkEnough(world(0, 14), 0, 10, 0));
check('unloaded cell blocks a zombie', !isDarkEnough(world(-1, -1), 0, 10, 0));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
