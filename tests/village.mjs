import { Chunk, surfaceHeight } from '../src/chunk.js';
import { villageCentre, houseCells, pathCells, farmCells, penCells, HOUSES, REGION, LEVEL_BOX } from '../src/village.js';
import { BLOCK } from '../src/blocks.js';
import { DOOR } from '../src/building.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const SEED = 1337;
const SEA = 30;

// Find villages across a band of regions: some must exist, and each centre must be above water.
// Ground under a village is levelled to its centre height, so the terrain itself no longer has to be flat.
const found = [];
for (let rx = -6; rx < 6; rx++) {
  for (let rz = -6; rz < 6; rz++) {
    const c = villageCentre(rx, rz, SEED);
    if (!c) continue;
    if (surfaceHeight(SEED, c.x, c.z) > SEA + 1) found.push(c);
  }
}
check('some villages are placed across the map', found.length > 0);
check('villages are rare: at least one, but under a third of regions (over 0 in 144)', found.length >= 1 && found.length < 144 / 3);

// Each village centre lies inside its own region with margin, so one region never overlaps another.
const insideRegion = found.every((c) => {
  const rx = Math.floor(c.x / REGION);
  const rz = Math.floor(c.z / REGION);
  const lx = c.x - rx * REGION;
  const lz = c.z - rz * REGION;
  return lx >= 12 && lx < REGION - 12 && lz >= 12 && lz < REGION - 12;
});
check('every village centre sits inside its region with margin', insideRegion);

// Build one village directly and confirm the houses have walls, floors, and a door gap.
const v = found[0];
const groundY = surfaceHeight(SEED, v.x, v.z);
const cells = [...HOUSES.flatMap((h) => houseCells(h, groundY)), ...farmCells(groundY), ...penCells(groundY)];
// Each doorway holds a closed door (not a wall), so the house can be entered by opening it.
const doorsPlaced = HOUSES.map((h) => {
  const dx = h.x + Math.floor(h.w / 2);
  const dz = h.z + h.doorZ;
  return cells.some((c) => c.dx === dx && c.dz === dz && c.dy === groundY + 1 && c.id === DOOR.DOOR);
});
check('each house doorway holds a closed door', doorsPlaced.every(Boolean));
check('houses include planks, cobblestone and glass', ['PLANKS', 'COBBLESTONE', 'GLASS'].every((n) => cells.some((c) => c.id === BLOCK[n])));

// Chunk generation: a village's cells land in the generated chunks, with the ground at its height.
const chunkCX = Math.floor(v.x / 16);
const chunkCZ = Math.floor(v.z / 16);
let placed = 0;
for (let cx = chunkCX - 2; cx <= chunkCX + 2; cx++) {
  for (let cz = chunkCZ - 2; cz <= chunkCZ + 2; cz++) {
    const c = new Chunk(cx, cz);
    c.generate(SEED);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = groundY; y < groundY + 5; y++) {
      if (c.get(x, y, z) === BLOCK.PLANKS || c.get(x, y, z) === BLOCK.COBBLESTONE) placed++;
    }
  }
}
check('the village is built into the generated chunks', placed > 0);

// A village that crosses a chunk border is built in full. Generate every chunk around the village, then
// count the village blocks at every village cell. Every cell must hold its intended block, so none is cut off.
const villageChunks = new Map();
for (let cx = Math.floor((v.x - 22) / 16); cx <= Math.floor((v.x + 22) / 16); cx++) {
  for (let cz = Math.floor((v.z - 22) / 16); cz <= Math.floor((v.z + 22) / 16); cz++) {
    const c = new Chunk(cx, cz);
    c.generate(SEED);
    villageChunks.set(`${cx},${cz}`, c);
  }
}
const blockAt = (wx, wy, wz) => {
  const c = villageChunks.get(`${Math.floor(wx / 16)},${Math.floor(wz / 16)}`);
  return c.get(((wx % 16) + 16) % 16, wy, ((wz % 16) + 16) % 16);
};
// Only cells the village wants to be solid are checked. Air inside a house is expected.
const solidWanted = cells.filter((c) => c.id !== BLOCK.AIR && c.id !== BLOCK.BEDROCK);
const missing = solidWanted.filter((c) => blockAt(v.x + c.dx, c.dy, v.z + c.dz) !== c.id);
check(`every village block lands in its chunk (missing ${missing.length} of ${solidWanted.length})`, missing.length === 0);

// The bedrock floor is never touched by villages: the bottom layer of a village chunk is still bedrock.
const floorOk = [...villageChunks.values()].every((c) => {
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) if (c.get(x, 0, z) !== BLOCK.BEDROCK) return false;
  return true;
});
check('bedrock floor is intact in every village chunk', floorOk);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
