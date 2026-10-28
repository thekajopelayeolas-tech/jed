// Birch: birch forests grow birch wood and leaves, and a village in one builds with birch planks. Other biomes keep oak.
import { houseCells, HOUSES } from '../src/village.js';
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';
import { BIOME_DEFS, BIOME } from '../src/biomes.js';
import { Chunk } from '../src/chunk.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

check('birch wood, planks and leaves are named blocks', BLOCK_DEFS[BLOCK.BIRCH_WOOD].name === 'Birch Wood' && BLOCK_DEFS[BLOCK.BIRCH_PLANKS].name === 'Birch Planks' && BLOCK_DEFS[BLOCK.BIRCH_LEAVES].name === 'Birch Leaves');
check('birch forest biomes use birch wood', BIOME_DEFS[BIOME.BIRCH_FOREST].wood === 'birch' && BIOME_DEFS[BIOME.OLD_GROWTH_BIRCH_FOREST].wood === 'birch');
check('forest keeps oak wood (no kind named)', BIOME_DEFS[BIOME.FOREST].wood === undefined);

// A house built with birch planks uses birch planks for its walls and roof, and oak is the default.
const house = HOUSES[0];
const birchCells = houseCells(house, 70, BLOCK.BIRCH_PLANKS);
const oakCells = houseCells(house, 70);
check('a birch house is built with birch planks', birchCells.some((c) => c.id === BLOCK.BIRCH_PLANKS) && !birchCells.some((c) => c.id === BLOCK.PLANKS));
check('a house with no planks given is built with oak', oakCells.some((c) => c.id === BLOCK.PLANKS) && !oakCells.some((c) => c.id === BLOCK.BIRCH_PLANKS));

// Birch trees grow in the world: a generated patch of birch forest holds birch wood.
let birchWood = 0;
for (let cx = -40; cx < 40 && birchWood === 0; cx++) for (let cz = -40; cz < 40 && birchWood === 0; cz++) {
  const c = new Chunk(cx, cz);
  c.generate(1337);
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 96; y++) if (c.get(x, y, z) === BLOCK.BIRCH_WOOD) birchWood++;
}
check('birch trees grow in generated chunks', birchWood > 0);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
