// The woodland and forest biomes: all 11 exist with the requested names, they appear on the map, and their tree
// settings differ as intended. Exits non-zero on failure.
import { BIOME, BIOME_DEFS, biomeAt } from '../src/biomes.js';
import { surfaceHeight } from '../src/chunk.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const SEED = 1337;
const WOOD = [
  'Forest', 'Flower Forest', 'Dark Forest', 'Birch Forest', 'Old Growth Birch Forest', 'Taiga', 'Snowy Taiga',
  'Old Growth Pine Taiga', 'Old Growth Spruce Taiga', 'Jungle', 'Sparse Jungle', 'Bamboo Jungle',
];
const names = Object.values(BIOME_DEFS).map((d) => d.name);
check('every requested woodland name is defined', WOOD.every((n) => names.includes(n)));

// Over a wide area, every woodland biome appears at least once.
const seen = new Set();
for (let x = -2000; x < 2000; x += 20) for (let z = -2000; z < 2000; z += 20) {
  seen.add(biomeAt(x, z, SEED, surfaceHeight(SEED, x, z)));
}
const woodIds = [BIOME.FOREST, BIOME.FOREST_FLOWER, BIOME.DARK_FOREST, BIOME.BIRCH_FOREST, BIOME.OLD_GROWTH_BIRCH_FOREST,
  BIOME.TAIGA, BIOME.SNOWY_TAIGA, BIOME.OLD_GROWTH_PINE_TAIGA, BIOME.OLD_GROWTH_SPRUCE_TAIGA, BIOME.JUNGLE,
  BIOME.SPARSE_JUNGLE, BIOME.BAMBOO_JUNGLE];
const missing = woodIds.filter((id) => !seen.has(id));
check(`every woodland biome appears on the map (missing: ${missing.length})`, missing.length === 0);

// Dark Forest is the thickest woodland, and the taiga and old growth trees are taller.
check('Dark Forest is denser than Forest', BIOME_DEFS[BIOME.DARK_FOREST].treeDensity > BIOME_DEFS[BIOME.FOREST].treeDensity);
check('old growth taiga trees are taller than normal taiga', BIOME_DEFS[BIOME.OLD_GROWTH_PINE_TAIGA].trunk > BIOME_DEFS[BIOME.TAIGA].trunk);
check('the woodland biomes have no ground lift', woodIds.every((id) => BIOME_DEFS[id].lift === 0));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
