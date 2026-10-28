import * as THREE from 'three';
import { isSolid } from './blocks.js';
import { isFullCube, bodyHitsBlock } from './building.js';
import { Hunger } from './hunger.js';
import { emptyArmour, damageReduction } from './armour.js';
import { bodyInWater, swimVelocityY, SWIM_SPEED_MULT } from './swimming.js';

// Walking is 5 blocks per second slower than the faster setting (14.3 - 5 = 9.3).
const WALK_SPEED = 9.3;
const SPRINT_MULT = 1.3;
const JUMP_VEL = 8.0;
const GRAVITY = 28;
const HALF_WIDTH = 0.3;
const HEIGHT = 1.8;
const EYE = 1.62;
// Health regeneration while hunger is full: 3 hearts every 5 seconds. One heart is 2 HP.
const HP_PER_HEART = 2;
const REGEN_INTERVAL = 5;
const REGEN_HEARTS = 3;
// Stepping up onto a stair: the tallest step the player climbs without jumping, and how fast the rise is.
const STEP_HEIGHT = 1.0;
const STEP_SPEED = 14;

// First-person player with AABB collision against the voxel world.
export class Player {
  constructor(world, x, y, z) {
    this.world = world;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = {};
    this.health = 20;
    this.maxHealth = 20;
    this.fallStartY = y;
    this.regenTimer = 0;
    this.hurtCooldown = 0;
    this.hunger = new Hunger();
    // Worn armour, one item id per part (helmet, chest, legs, boots). 0 means the slot is empty.
    this.armour = emptyArmour();
  }

  // True while the sprint key is held. Sprinting also drains hunger faster.
  isSprinting() {
    return !!(this.keys.ShiftLeft || this.keys.ShiftRight);
  }

  // Damages the player. Ignores hits during the short invulnerability window after a hit.
  // Every hit that lands also costs one hunger point.
  hurt(amount) {
    if (this.hurtCooldown > 0 || this.health <= 0) return false;
    // Worn armour blocks a share of the damage. Hunger still drops by one point per hit.
    const taken = amount * (1 - damageReduction(this.armour));
    this.health = Math.max(0, this.health - taken);
    this.hurtCooldown = 0.5;
    this.regenTimer = 0;
    this.hunger.onDamage();
    return true;
  }

  // While hunger is full, every REGEN_INTERVAL seconds restores REGEN_HEARTS hearts.
  // Losing a point of hunger or taking damage restarts the timer.
  tickHealth(dt) {
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    if (this.health <= 0 || this.health >= this.maxHealth || !this.hunger.full) {
      this.regenTimer = 0;
      return;
    }
    this.regenTimer += dt;
    if (this.regenTimer >= REGEN_INTERVAL) {
      this.regenTimer -= REGEN_INTERVAL;
      this.health = Math.min(this.maxHealth, this.health + REGEN_HEARTS * HP_PER_HEART);
    }
  }

  collides(px, py, pz) {
    const body = {
      minX: px - HALF_WIDTH, maxX: px + HALF_WIDTH,
      minY: py, maxY: py + HEIGHT,
      minZ: pz - HALF_WIDTH, maxZ: pz + HALF_WIDTH,
    };
    const minX = Math.floor(px - HALF_WIDTH);
    const maxX = Math.floor(px + HALF_WIDTH - 1e-6);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + HEIGHT - 1e-6);
    const minZ = Math.floor(pz - HALF_WIDTH);
    const maxZ = Math.floor(pz + HALF_WIDTH - 1e-6);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const id = this.world.getBlock(x, y, z);
          if (!isSolid(id)) continue;
          // Full cubes block on any overlap. Slabs and stairs only block where their shape is.
          if (isFullCube(id) || bodyHitsBlock(id, x, y, z, body, this.world.facingAt(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  // Move along one axis, stopping at collisions. Returns true if blocked.
  moveAxis(axis, delta) {
    if (delta === 0) return false;
    const steps = Math.ceil(Math.abs(delta) / 0.05);
    const step = delta / steps;
    for (let i = 0; i < steps; i++) {
      const next = this.pos.clone();
      next[axis] += step;
      if (this.collides(next.x, next.y, next.z)) {
        if (axis === 'y') this.vel.y = 0;
        else this.vel[axis] = 0;
        return true;
      }
      this.pos.copy(next);
    }
    return false;
  }

  // Climbs a stair the player is walking into. It rises by up to STEP_HEIGHT, only while the space above
  // the step is clear, and then the player keeps walking on it. Stepping off means nothing is in the way, so
  // the player does not rise. Returns true if the player moved up.
  stepUp(dt, move) {
    if (move.lengthSq() === 0) return false;
    // Look a little ahead of the body, in the direction of the walk, for the block that stops it.
    const ahead = 0.35;
    const ax = this.pos.x + move.x * (HALF_WIDTH + ahead);
    const az = this.pos.z + move.z * (HALF_WIDTH + ahead);
    // The wall is in front at foot height. Find the lowest step height, up to STEP_HEIGHT, at which the body fits.
    if (!this.collides(ax, this.pos.y + 0.01, az)) return false;
    for (let rise = 0.1; rise <= STEP_HEIGHT + 1e-6; rise += 0.1) {
      const y = this.pos.y + rise;
      if (this.collides(ax, y + 0.01, az)) continue;
      if (this.collides(this.pos.x, y, this.pos.z)) continue;
      // Clear at this height: put the player on the step in one move, so the climb is quick and gravity cannot
      // pull them back down partway up. The rise is relative to where the player stands now, so a player
      // standing on a slab is not snapped up by a whole block.
      this.pos.y += rise;
      this.vel.y = 0;
      this.onGround = true;
      return true;
    }
    return false;
  }

  update(dt) {
    const wasOnGround = this.onGround;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys.KeyW) move.add(forward);
    if (this.keys.KeyS) move.sub(forward);
    if (this.keys.KeyD) move.add(right);
    if (this.keys.KeyA) move.sub(right);
    if (move.lengthSq() > 0) move.normalize();

    const sprint = this.isSprinting();
    const swimming = bodyInWater(this.world, this.pos, HALF_WIDTH, HEIGHT);
    // In water you move slower, and sprinting does not apply.
    const speed = WALK_SPEED * (swimming ? SWIM_SPEED_MULT : sprint ? SPRINT_MULT : 1);

    this.vel.x = move.x * speed;
    this.vel.z = move.z * speed;
    if (swimming) {
      // Space swims up. Without it you sink slowly, so you can stay at the surface by holding Space.
      this.vel.y = swimVelocityY(this.vel.y, dt, GRAVITY, !!this.keys.Space);
      this.onGround = false;
    } else {
      if (this.keys.Space && this.onGround) {
        this.vel.y = JUMP_VEL;
        this.onGround = false;
      }
      this.vel.y -= GRAVITY * dt;
      if (this.vel.y < -50) this.vel.y = -50;
    }

    const blockedX = this.moveAxis('x', this.vel.x * dt);
    const blockedZ = this.moveAxis('z', this.vel.z * dt);
    // Walking into a stair on the ground climbs it quickly, so the player does not have to jump.
    if ((blockedX || blockedZ) && this.onGround && !swimming) this.stepUp(dt, move);
    const fallingBeforeMove = this.vel.y < 0;
    const blockedY = this.moveAxis('y', this.vel.y * dt);
    // Landed if vertical movement was stopped while falling.
    this.onGround = blockedY && fallingBeforeMove;
    // Water breaks a fall: while the body is in water, the fall start follows the player, so landing
    // in water does not count as a long fall.
    if (swimming) this.fallStartY = this.pos.y;

    if (!wasOnGround && this.onGround) {
      const fall = this.fallStartY - this.pos.y;
      if (fall > 3) {
        this.health = Math.max(0, this.health - Math.floor(fall - 3));
        this.regenTimer = 0;
        this.hunger.onDamage();
      }
    }
    if (this.onGround || this.vel.y > 0) this.fallStartY = this.pos.y;
  }

  respawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.health = this.maxHealth;
    this.hunger = new Hunger();
    this.fallStartY = y;
  }

  get eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
  }

  lookDir() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
}
