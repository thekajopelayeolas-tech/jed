// Each woodland biome grows its own kind of tree: dark oak, birch, spruce or jungle, and oak where none is named.
import { BLOCK, BLOCK_DEFS } from '../src/blocks.js';
import { BIOME, BIOME_DEFS } from '../src/biomes.js';
import { WOOD_SETS, woodSet } from '../src/wood.js';
import { BLOCK_TILES } from '../src/textures.js';
import { Chunk } from '../src/chunk.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Every kind has wood, planks and leaves, each a named block with a texture.
const kinds = Object.keys(WOOD_SETS);
check('there are five wood kinds: oak, birch, dark oak, spruce, jungle', kinds.length === 5);
const allBlocks = kinds.flatMap((k) => [WOOD_SETS[k].wood, WOOD_SETS[k].planks, WOOD_SETS[k].leaves]);
check('every wood block is named', allBlocks.every((id) => BLOCK_DEFS[id]?.name));
check('every wood block has a texture', allBlocks.every((id) => BLOCK_TILES[id]));

// The kind a biome names exists, and the woodland biomes name the kind they should.
const expected = {
  [BIOME.DARK_FOREST]: 'dark', [BIOME.BIRCH_FOREST]: 'birch', [BIOME.OLD_GROWTH_BIRCH_FOREST]: 'birch',
  [BIOME.TAIGA]: 'spruce', [BIOME.SNOWY_TAIGA]: 'spruce', [BIOME.OLD_GROWTH_PINE_TAIGA]: 'spruce', [BIOME.OLD_GROWTH_SPRUCE_TAIGA]: 'spruce',
  [BIOME.JUNGLE]: 'jungle', [BIOME.SPARSE_JUNGLE]: 'jungle', [BIOME.BAMBOO_JUNGLE]: 'jungle',
};
for (const [biome, kind] of Object.entries(expected)) {
  check(`biome ${biome} grows ${kind} wood`, BIOME_DEFS[biome].wood === kind);
}
check('forest and flower forest keep oak (no kind named)', BIOME_DEFS[BIOME.FOREST].wood === undefined && BIOME_DEFS[BIOME.FLOWER_FOREST ?? 13].wood === undefined);
check('an unknown kind falls back to oak', woodSet('nope').wood === BLOCK.WOOD);

// The other kinds reach the world: a generated chunk holds spruce, dark oak or jungle wood somewhere.
const found = new Set();
for (let cx = -40; cx < 40 && found.size < 3; cx++) for (let cz = -40; cz < 40 && found.size < 3; cz++) {
  const c = new Chunk(cx, cz);
  c.generate(1337);
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 96; y++) {
    const id = c.get(x, y, z);
    if (id === BLOCK.SPRUCE_WOOD || id === BLOCK.DARK_OAK_WOOD || id === BLOCK.JUNGLE_WOOD) found.add(id);
  }
}
check('spruce, dark oak and jungle trees grow in generated chunks', found.size === 3);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
