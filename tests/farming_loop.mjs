import { BLOCK } from '../src/blocks.js';
import { cropDrops, farmlandHydrated, grassSeedDrop, growCropAt, plantWheatSeed, tickCropGrowth, tillSoil } from '../src/farming.js';
import { Chunk } from '../src/chunk.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

const blocks = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
const world = {
  getBlock(x, y, z) { return blocks.get(key(x, y, z)) ?? BLOCK.AIR; },
  setBlock(x, y, z, id) { blocks.set(key(x, y, z), id); return true; },
  getLight() { return 15; },
};
blocks.set(key(0, 60, 0), BLOCK.GRASS);
check('a hoe can till grass with open space above', tillSoil(world, 0, 60, 0) && world.getBlock(0, 60, 0) === BLOCK.FARMLAND);
check('seeds plant only on farmland', plantWheatSeed(world, 0, 60, 0) && world.getBlock(0, 61, 0) === BLOCK.WHEAT_CROP_0);
check('dry farmland is not hydrated', !farmlandHydrated(world, 0, 60, 0));
world.setBlock(4, 60, 0, BLOCK.WATER);
check('water within four blocks hydrates farmland', farmlandHydrated(world, 0, 60, 0));
check('hydrated crops can grow one stage', growCropAt(world, 0, 61, 0, 0.2) && world.getBlock(0, 61, 0) === BLOCK.WHEAT_CROP_1);
check('wet crop harvest gives wheat and extra seeds', cropDrops(BLOCK.WHEAT_CROP_3, 0.5).some((drop) => drop.id === BLOCK.WHEAT) && cropDrops(BLOCK.WHEAT_CROP_3, 0.5).some((drop) => drop.id === BLOCK.WHEAT_SEEDS));
check('immature crop harvest returns seeds', cropDrops(BLOCK.WHEAT_CROP_1)[0].id === BLOCK.WHEAT_SEEDS);
check('grass sometimes drops seeds', grassSeedDrop(0.1) === BLOCK.WHEAT_SEEDS && grassSeedDrop(0.8) === 0);

const cropIndex = Chunk.index(0, 61, 0);
const cropChunk = { cx: 0, cz: 0, blocks: new Uint8Array(16 * 96 * 16), cropIndices: new Set([cropIndex]) };
cropChunk.blocks[cropIndex] = BLOCK.WHEAT_CROP_0;
blocks.set(key(0, 61, 0), BLOCK.WHEAT_CROP_0);
const cropWorld = { ...world, chunks: new Map([['0,0', cropChunk]]) };
check('growth ticks visit indexed crop blocks', tickCropGrowth(cropWorld, () => 0) === 1 && cropWorld.getBlock(0, 61, 0) === BLOCK.WHEAT_CROP_1);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
