// The highland and mountain biomes: all 13 biomes exist, the mountains appear on high ground, and they lift the
// terrain. Exits non-zero on failure.
import { BIOME, BIOME_DEFS, biomeAt } from '../src/biomes.js';
import { surfaceHeight } from '../src/chunk.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const SEED = 1337;

// The 13 biomes are all defined, with the names the request gives.
const names = Object.values(BIOME_DEFS).map((d) => d.name);
const requested = [
  'Jagged Peaks', 'Frozen Peaks', 'Stony Peaks', 'Meadow', 'Grove', 'Cherry Grove', 'Snowy Slopes',
  'Windswept Hills', 'Windswept Gravelly Hills', 'Windswept Forest',
];
check('every requested biome name is defined', requested.every((n) => names.includes(n)));
// The total is 31: the 3 original biomes, 10 highland and mountain, 11 woodland, and 7 wetland and coastal.
check('there are 31 biomes in total', Object.keys(BIOME_DEFS).length === 31);

// Over a wide area, every biome appears at least once.
const seen = new Set();
for (let x = -1200; x < 1200; x += 24) for (let z = -1200; z < 1200; z += 24) {
  seen.add(biomeAt(x, z, SEED, surfaceHeight(SEED, x, z)));
}
check('every biome appears somewhere on the map', Object.keys(BIOME).every((k) => seen.has(BIOME[k])));

// Mountain biomes are picked only on high ground, and lowland biomes only below it.
let mountainLow = 0;
let lowlandHigh = 0;
for (let x = -800; x < 800; x += 20) for (let z = -800; z < 800; z += 20) {
  const h = surfaceHeight(SEED, x, z);
  const b = biomeAt(x, z, SEED, h);
  if (BIOME_DEFS[b].alt && h < 38) mountainLow++;
  if (!BIOME_DEFS[b].alt && h >= 46 && [BIOME.PLAINS, BIOME.FOREST, BIOME.DESERT].includes(b)) lowlandHigh++;
}
check('mountain biomes are never picked on low ground', mountainLow === 0);
check('the original lowland biomes are not picked on high ground', lowlandHigh === 0);

// The mountain biomes lift the ground above the same column's base height.
check('the mountain biomes lift the ground', BIOME_DEFS[BIOME.JAGGED_PEAKS].lift > 0 && BIOME_DEFS[BIOME.FROZEN_PEAKS].lift > 0);
check('the original biomes do not lift the ground', BIOME_DEFS[BIOME.PLAINS].lift === 0 && BIOME_DEFS[BIOME.DESERT].lift === 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
