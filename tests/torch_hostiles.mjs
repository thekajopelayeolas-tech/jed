// Hostile mobs spawn near torches: at night, a hostile spawn lands close to a torch the player can reach, and
// otherwise falls back to the usual ring around the player.
import { MobManager, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import { torchSpawnCell, TORCH_SPAWN_RANGE } from '../src/torch-spawn.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A flat world with a torch at (30, 61, 30). Ground is stone up to y = 60, and air above.
const torch = { x: 30, y: 61, z: 30 };
const world = {
  getBlock(x, y, z) {
    if (x === torch.x && y === torch.y && z === torch.z) return BLOCK.TORCH;
    if (y <= 60) return BLOCK.STONE;
    return BLOCK.AIR;
  },
  getLight() { return 15; },
};

// A spawn near a torch lands within the torch range of it, on the ground beside it. The player is within
// TORCH_REACH of the torch (about 28 blocks away is too far, so stand 10 blocks off).
{
  const player = new THREE.Vector3(20, 61, 30);
  const cell = torchSpawnCell(world, player, [torch]);
  check('a torch within reach gives a spawn cell', cell !== null);
  if (cell) {
    const d = Math.hypot(cell.x - torch.x, cell.z - torch.z);
    check('the spawn cell is near the torch', d <= TORCH_SPAWN_RANGE + 1);
  }
}

// With no torch in reach there is no torch spawn, so spawning uses the normal ring.
{
  const player = new THREE.Vector3(200, 61, 200);
  check('no torch in reach gives no torch spawn', torchSpawnCell(world, player, [torch]) === null);
}

// End to end: at night, a hostile spawned by the mob manager lands within a few blocks of the torch.
{
  const scene = { add() {}, remove() {} };
  const player = new THREE.Vector3(20, 61, 30);
  const mgr = new MobManager(scene, world, 1337);
  const hostileBefore = mgr.mobs.length;
  // Spawn a hostile at night a number of times, and record where each one lands.
  const spots = [];
  for (let i = 0; i < 30; i++) {
    mgr.trySpawnOnLand(player, MOB.ZOMBIE, true);
    const m = mgr.mobs[mgr.mobs.length - 1];
    if (m && mgr.mobs.length > hostileBefore + spots.length) spots.push(m.pos);
  }
  const nearTorch = spots.filter((p) => Math.hypot(p.x - torch.x, p.z - torch.z) <= TORCH_SPAWN_RANGE + 2).length;
  check('at night, hostiles spawn near the torch', spots.length > 0 && nearTorch / spots.length > 0.8);
  check('a zombie is hostile', mgr.mobs[mgr.mobs.length - 1]?.def.hostile === true);
}

// The torch spawn range is a sensible size: close enough to be near the torch, not so close it stands on it.
check('the torch spawn range is a few blocks', TORCH_SPAWN_RANGE >= 4 && TORCH_SPAWN_RANGE <= 12);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
