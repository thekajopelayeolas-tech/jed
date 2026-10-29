// Hostile mob behaviour rules: hunter archery, creeper fuse and blast, spider bite, enderman gaze, and the ender
// pearl. Pure functions with no DOM or three.js, so tests run in Node. mobs.js and main.js do the moving and hitting.
import { breakTime } from './mining.js';

// Hunter: it keeps its distance, backs off when the player comes close, and shoots when in range.
export const HUNTER_RANGE = 14;
export const HUNTER_MIN_RANGE = 4;
export const HUNTER_SHOOT_INTERVAL = 2.0;
// A hunter's arrow does one heart (2 HP).
export const HUNTER_ARROW_DAMAGE = 2;

// What a hunter does this frame: 'advance' toward the player, 'retreat' from them, 'shoot', or 'hold'.
export function hunterAction(distance, canShoot) {
  if (distance > HUNTER_RANGE) return 'advance';
  if (distance < HUNTER_MIN_RANGE) return 'retreat';
  return canShoot ? 'shoot' : 'hold';
}

// Creeper: it follows the player, starts a fuse when close, and blows up when the fuse ends. The fuse is cancelled
// if the player moves well away before it ends.
export const CREEPER_FUSE_RANGE = 3;
export const CREEPER_CANCEL_RANGE = 6;
export const CREEPER_FUSE_TIME = 1.5;
export const CREEPER_BLAST_RADIUS = 3.5;
// A creeper's blast does three hearts (6 HP) at the centre, less further out.
export const CREEPER_BLAST_DAMAGE = 6;

// Advances a creeper's fuse by dt. A fuse of 0 is not lit. Once lit it counts up. Returns the new fuse value, or -1
// when the fuse was cancelled by the player getting away.
export function creeperFuse(fuse, distance, dt) {
  if (fuse <= 0) return distance <= CREEPER_FUSE_RANGE ? dt : 0;
  if (distance > CREEPER_CANCEL_RANGE) return -1;
  return fuse + dt;
}

export function creeperExploded(fuse) {
  return fuse >= CREEPER_FUSE_TIME;
}

// Damage a blast does to something `distance` from the centre: the most at the centre, none at the edge.
export function blastDamage(distance) {
  if (distance >= CREEPER_BLAST_RADIUS) return 0;
  return CREEPER_BLAST_DAMAGE * (1 - distance / CREEPER_BLAST_RADIUS);
}

// True if a blast at `distance` from a block breaks that block. A block inside the radius breaks unless it can't be
// mined at all (bedrock, which has an infinite break time, and air, which has nothing to break).
export function blastBreaks(blockId, distance) {
  if (blockId === 0) return false;
  if (distance >= CREEPER_BLAST_RADIUS) return false;
  return breakTime(blockId, 0) !== Infinity;
}

// Spider: it runs at the player and bites when close. It climbs walls like the other land mobs.
export const SPIDER_BITE_RANGE = 1.4;
export const SPIDER_BITE_DAMAGE = 2;

// Enderman: calm until the player looks straight at it. `lookDot` is the dot product of the player's look direction
// and the direction to the enderman (1 means looking straight at it). The gaze counts only inside a narrow cone, so
// a glance to the side does not anger it.
export const ENDERMAN_GAZE_DOT = 0.985;
export const ENDERMAN_RANGE = 24;
export const ENDERMAN_DAMAGE = 7;

export function endermanAngry(lookDot, distance) {
  return lookDot >= ENDERMAN_GAZE_DOT && distance <= ENDERMAN_RANGE;
}

// Ender pearl: thrown along the look direction, it lands on the first solid block it reaches. The player is then
// teleported to that spot.
export const PEARL_RANGE = 40;
export const PEARL_SPEED = 28;
export const PEARL_LIFETIME = 4;

// The landing spot for a pearl thrown from `from` along the unit vector `dir`. `isSolid(x, y, z)` says whether a
// cell blocks the pearl. The pearl stops just before the first solid cell, so the player stands in the air in front
// of it. Returns { x, y, z } for the feet, or null if the pearl hits nothing within range.
export function pearlLanding(from, dir, isSolid) {
  const steps = Math.ceil(PEARL_RANGE * 4);
  let last = null;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * PEARL_RANGE;
    const cx = Math.floor(from.x + dir.x * t);
    const cy = Math.floor(from.y + dir.y * t);
    const cz = Math.floor(from.z + dir.z * t);
    if (isSolid(cx, cy, cz)) {
      if (last === null) return null;
      return { x: last.x + 0.5, y: last.y, z: last.z + 0.5 };
    }
    last = { x: cx, y: cy, z: cz };
  }
  return last ? { x: last.x + 0.5, y: last.y, z: last.z + 0.5 } : null;
}
