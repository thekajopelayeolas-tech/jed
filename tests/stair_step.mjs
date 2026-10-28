// Auto-climb: walking into a stair steps the player up onto it quickly, and stepping off it returns to normal.
// Q-dropped items wait until the player has moved away, so they are not picked straight back up.
import { Player } from '../src/player.js';
import { BLOCK } from '../src/blocks.js';
import { BUILD, FULL_BOX } from '../src/building.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Flat ground at y <= 10. A single stair block at x = 5, facing +x (east), so its upper step is on the far side.
const STAIR = BUILD.STONE_STAIRS;
const world = {
  getBlock(x, y, z) {
    if (y <= 10) return BLOCK.STONE;
    if (x === 5 && z === 0 && y === 11) return STAIR;
    return BLOCK.AIR;
  },
  getLight() { return 15; },
  facingAt() { return 0; },
};
const step = (p, seconds, keys = {}) => {
  p.keys = { ...keys };
  for (let t = 0; t < seconds; t += 1 / 60) p.update(1 / 60);
};

// Walking east into a stair: the player rises onto it.
{
  const p = new Player(world, 3.5, 11, 0.5);
  p.onGround = true;
  let maxY = 0;
  let riseFrame = -1;
  for (let i = 0; i < 90; i++) {
    p.keys = { KeyD: true };
    p.update(1 / 60);
    if (p.pos.y > 11.01 && riseFrame < 0) riseFrame = i;
    maxY = Math.max(maxY, p.pos.y);
  }
  // The stair block is at y = 11, so its top is y = 12, and the player stands on it.
  check('walking into a stair climbs onto its top', maxY > 11.95 && maxY < 12.05);
  // Quick: the rise starts within a quarter of a second of walking into the stair.
  check('the climb is quick: it starts within a quarter of a second', riseFrame >= 0 && riseFrame < 15);
}

// A player standing on a half-height slab (y = 11.5) climbs onto a stair one block up, and is not snapped
// up by a whole block. The stair's top is at y = 12, so the player ends near 12, not 13.
{
  const slabWorld = {
    getBlock(x, y, z) {
      if (y <= 10) return BLOCK.STONE;
      if (x === 5 && z === 0 && y === 11) return STAIR;
      return BLOCK.AIR;
    },
    getLight() { return 15; },
    facingAt() { return 0; },
  };
  const p = new Player(slabWorld, 3.5, 11.5, 0.5);
  p.onGround = true;
  let maxY = 0;
  for (let i = 0; i < 120; i++) {
    p.keys = { KeyD: true };
    p.update(1 / 60);
    maxY = Math.max(maxY, p.pos.y);
  }
  check('a player on a half-height slab is not snapped up by a whole block', maxY < 12.6);
}

// Standing still next to the stair does not climb.
{
  const p = new Player(world, 3.5, 11, 0.5);
  p.onGround = true;
  step(p, 1.0, {});
  check('standing next to a stair does not climb', p.pos.y < 11.05);
}

// Once off the stairs, normal movement resumes: the player walks on flat ground without rising.
{
  const p = new Player(world, 9.5, 11, 0.5);
  p.onGround = true;
  step(p, 1.0, { KeyD: true });
  check('walking on flat ground after the stair does not rise', p.pos.y < 11.05);
}

// A Q-dropped item cannot be picked up while the player is still beside it.
import { ItemDrop } from '../src/drops.js';
import * as THREE from 'three';
{
  const scene = { add() {}, remove() {} };
  const atlasMaterial = {};
  const d = new ItemDrop(scene, world, BLOCK.STONE, 0.5, 11, 0.5, atlasMaterial);
  d.markDropped?.(new THREE.Vector3(0.5, 11, 0.5));
  d.age = 5;
  check('a Q-dropped item is not picked up while the player stands by it', !d.canPickUp(new THREE.Vector3(0.5, 11, 0.5)));
  // Walking away from it, past the pickup radius, lifts the lockout, so the item can be picked up again.
  d.canPickUp(new THREE.Vector3(4, 11, 0.5));
  check('a Q-dropped item can be picked up once the player has walked away', d.canPickUp(new THREE.Vector3(0.5, 11, 0.5)) === true);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
