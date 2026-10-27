// Hostile mob behaviour: hunter archery, creeper fuse and blast, spider bite, enderman gaze, and the ender pearl.
// Exits non-zero on failure.
import * as H from '../src/hostile.js';
import { World } from '../src/world.js';
import { Mob, MOB } from '../src/mobs.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Hunter: shoots in its range, backs off when close, and advances when far.
check('a hunter shoots at mid range', H.hunterAction(10, true) === 'shoot');
check('a hunter backs away when the player is close', H.hunterAction(2, true) === 'retreat');
check('a hunter advances when the player is far', H.hunterAction(20, true) === 'advance');
check('a hunter holds while it reloads', H.hunterAction(10, false) === 'hold');

// Creeper: a fuse lights close, cancels when the player gets far, and the blast hurts most at the centre.
check('a creeper lights its fuse when close', H.creeperFuse(0, 2, 0.1) > 0);
check('a creeper does not light its fuse from far', H.creeperFuse(0, 10, 0.1) === 0);
check('a creeper cancels its fuse when the player gets away', H.creeperFuse(0.5, 10, 0.1) === -1);
check('a creeper blows up when the fuse is full', H.creeperExploded(H.CREEPER_FUSE_TIME));
check('the blast hurts most at the centre', H.blastDamage(0) === H.CREEPER_BLAST_DAMAGE);
check('the blast does nothing past its radius', H.blastDamage(H.CREEPER_BLAST_RADIUS + 1) === 0);

// Enderman: angry only when the player looks straight at it, and only within range.
check('an enderman is angry when looked at straight on', H.endermanAngry(1, 5));
check('an enderman is calm when the player glances to the side', !H.endermanAngry(0.5, 5));
check('an enderman is calm when it is out of range', !H.endermanAngry(1, H.ENDERMAN_RANGE + 1));

// Ender pearl: it lands on the first solid block, in the air just before it.
{
  // A solid wall from x 10 onward, at pearl height, so the pearl flying along +x meets it.
  const solidAt = (x, y, z) => x >= 10 && y === 61;
  const from = { x: 0.5, y: 61.5, z: 0.5 };
  const landing = H.pearlLanding(from, { x: 1, y: 0, z: 0 }, solidAt);
  check('a pearl lands in front of the first solid block', landing !== null && landing.x < 10);
  check('the landing spot is in the air, at the pearl height', landing !== null && landing.y === 61);
  // Fired straight up into open air, the pearl never meets a block, so it lands at its far end, not on a block.
  const sky = H.pearlLanding({ x: 0.5, y: 61.5, z: 0.5 }, { x: 0, y: 1, z: 0 }, () => false);
  check('a pearl fired into open air lands at its far end', sky !== null && sky.y > 61);
}

// The mobs: each special kind keeps its own behaviour in the game loop.
{
  const scene = { add() {}, remove() {} };
  const flat = { getBlock(x, y, z) { return y < 60 ? BLOCK.STONE : BLOCK.AIR; }, getLight() { return 0; } };
  const player = new THREE.Vector3(20, 60, 0);

  const skel = new Mob(scene, flat, MOB.HUNTER, 10, 60, 0);
  const fired = [];
  skel.update(0.05, player, () => {}, [], false, null, (from, dir, dmg) => fired.push({ from, dir, dmg }));
  check('a hunter fires at the player when in range', fired.length === 1 && fired[0].dmg > 0);

  const creep = new Mob(scene, flat, MOB.CREEPER, 10, 60, 0);
  for (let i = 0; i < 60; i++) creep.update(0.05, new THREE.Vector3(12, 60, 0), () => {});
  check('a creeper blows up near the player', creep.exploded === true);

  const spider = new Mob(scene, flat, MOB.SPIDER, 10, 60, 0);
  let bit = 0;
  spider.update(0.05, new THREE.Vector3(10.5, 60, 0), (m, dmg) => { bit += dmg; });
  check('a spider bites a player it is next to', bit > 0);

  // The enderman is at x 10 and the player at x 20, so looking at it means looking along -x.
  const ender = new Mob(scene, flat, MOB.ENDERMAN, 10, 60, 0);
  ender.update(0.05, player, () => {}, [], false, new THREE.Vector3(-1, 0, 0), null);
  check('an enderman is angry when the player looks at it', ender.angry === true);
  const calm = new Mob(scene, flat, MOB.ENDERMAN, 10, 60, 0);
  calm.update(0.05, player, () => {}, [], false, new THREE.Vector3(0, 0, 1), null);
  check('an enderman stays calm when the player looks away', calm.angry === false);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
