// The wetland and coastal biomes: all seven exist with the requested names, they appear on the map, rivers hold
// water, and the shores sit at sea level. Exits non-zero on failure.
import { BIOME, BIOME_DEFS, biomeAt } from '../src/biomes.js';
import { surfaceHeight, Chunk } from '../src/chunk.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const SEED = 1337;
const WET = ['River', 'Frozen River', 'Swamp', 'Mangrove Swamp', 'Beach', 'Snowy Beach', 'Stony Shore'];
const names = Object.values(BIOME_DEFS).map((d) => d.name);
check('every requested wetland and coastal name is defined', WET.every((n) => names.includes(n)));

const wetIds = [BIOME.RIVER, BIOME.FROZEN_RIVER, BIOME.SWAMP, BIOME.MANGROVE_SWAMP, BIOME.BEACH, BIOME.SNOWY_BEACH, BIOME.STONY_SHORE];
const seen = new Set();
for (let x = -2000; x < 2000; x += 16) for (let z = -2000; z < 2000; z += 16) {
  seen.add(biomeAt(x, z, SEED, surfaceHeight(SEED, x, z)));
}
const missing = wetIds.filter((id) => !seen.has(id));
check(`every wetland and coastal biome appears on the map (missing: ${missing.length})`, missing.length === 0);

// A river cuts the ground below sea level, so the channel is water.
check('a river is a channel', BIOME_DEFS[BIOME.RIVER].channel === true);
check('a frozen river is a channel too', BIOME_DEFS[BIOME.FROZEN_RIVER].channel === true);

// Swamps sink, so they are low and wet. Beaches do not sink.
check('swamps sink below the ground around them', BIOME_DEFS[BIOME.SWAMP].sink > 0 && BIOME_DEFS[BIOME.MANGROVE_SWAMP].sink > 0);
check('beaches do not sink', BIOME_DEFS[BIOME.BEACH].sink === 0);

// A chunk holding a river has water in it.
{
  let river = null;
  for (let x = -2000; x < 2000 && !river; x += 16) for (let z = -2000; z < 2000 && !river; z += 16) {
    if (biomeAt(x, z, SEED, surfaceHeight(SEED, x, z)) === BIOME.RIVER) river = { x, z };
  }
  check('a river exists to test with', river !== null);
  if (river) {
    const c = new Chunk(Math.floor(river.x / 16), Math.floor(river.z / 16));
    c.generate(SEED);
    let water = 0;
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 96; y++) if (c.get(x, y, z) === BLOCK.WATER) water++;
    check('a chunk holding river has water in it', water > 0);
  }
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
