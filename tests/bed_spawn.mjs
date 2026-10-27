// Respawning beside a bed. Exits non-zero on failure.
import { spotBesideBed } from '../src/bed-spawn.js';
import { BLOCK } from '../src/blocks.js';
import { saveGame, loadGame } from '../src/save.js';
import { Inventory } from '../src/inventory.js';
import { Player } from '../src/player.js';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A flat floor of stone at y = 9, with air above it. The bed sits at (5, 10, 5).
const floor = (x, y, z) => {
  if (y === 9) return BLOCK.STONE;
  return BLOCK.AIR;
};
const bed = { x: 5, y: 10, z: 5 };
const spot = spotBesideBed(bed, floor);
check('a free spot beside the bed is found on flat ground', spot !== null);
check('the spot is next to the bed, not on it', spot && !(spot.x === bed.x && spot.z === bed.z));
check('the spot stands on the ground, with air above', spot && spot.y === 10);

// If every side of the bed is walled in, there is no spot, so the caller uses the default spawn.
const walled = (x, y, z) => {
  if (y === 9) return BLOCK.STONE;
  // Solid walls at head height all around the bed, with the bed itself.
  if (Math.abs(x - bed.x) + Math.abs(z - bed.z) === 1) return BLOCK.STONE;
  return BLOCK.AIR;
};
check('a bed with no free side gives no spot', spotBesideBed(bed, walled) === null);

// The bed is saved and loaded back, so the respawn point survives a reload.
const scene = { add() {}, remove() {} };
const world = new World(scene, 1337, {}, {});
const player = new Player(world, 5, 10, 5);
const inv = new Inventory();
const storage = new Map();
globalThis.localStorage = { setItem: (k, v) => storage.set(k, v), getItem: (k) => storage.get(k) ?? null, removeItem: (k) => storage.delete(k) };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
saveGame(world, player, inv, 0.25, new Map(), new Map(), bed);
const loaded = loadGame();
check('the respawn bed is saved', loaded?.spawnBed?.x === bed.x && loaded?.spawnBed?.y === bed.y && loaded?.spawnBed?.z === bed.z);
saveGame(world, player, inv, 0.25, new Map(), new Map(), null);
check('no bed is saved as null', loadGame()?.spawnBed === null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
