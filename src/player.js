import * as THREE from 'three';
import { isSolid } from './blocks.js';

const WALK_SPEED = 4.3;
const SPRINT_MULT = 1.3;
const JUMP_VEL = 8.0;
const GRAVITY = 28;
const HALF_WIDTH = 0.3;
const HEIGHT = 1.8;
const EYE = 1.62;

// First-person player with AABB collision against the voxel world.
export class Player {
  constructor(world, x, y, z) {
    this.world = world;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.flying = false;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = {};
    this.health = 20;
    this.maxHealth = 20;
    this.fallStartY = y;
    this.regenTimer = 0;
    this.hurtCooldown = 0;
  }

  // Damages the player. Ignores hits during the short invulnerability window after a hit.
  hurt(amount) {
    if (this.hurtCooldown > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtCooldown = 0.5;
    this.regenTimer = 0;
    return true;
  }

  // Restores one heart every 4 seconds once the player has gone 4 seconds without taking damage.
  tickHealth(dt) {
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    if (this.health <= 0 || this.health >= this.maxHealth) return;
    this.regenTimer += dt;
    if (this.regenTimer >= 4) {
      this.regenTimer = 0;
      this.health = Math.min(this.maxHealth, this.health + 1);
    }
  }

  collides(px, py, pz) {
    const minX = Math.floor(px - HALF_WIDTH);
    const maxX = Math.floor(px + HALF_WIDTH - 1e-6);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + HEIGHT - 1e-6);
    const minZ = Math.floor(pz - HALF_WIDTH);
    const maxZ = Math.floor(pz + HALF_WIDTH - 1e-6);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(this.world.getBlock(x, y, z))) return true;
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

    const sprint = this.keys.ShiftLeft || this.keys.ShiftRight;
    const speed = WALK_SPEED * (sprint ? SPRINT_MULT : 1);

    if (this.flying) {
      this.vel.set(move.x * speed, 0, move.z * speed);
      this.vel.y = (this.keys.Space ? 1 : 0) * speed - (this.keys.ControlLeft ? speed : 0);
      this.pos.addScaledVector(this.vel, dt);
      this.onGround = false;
      this.fallStartY = this.pos.y;
      return;
    }

    this.vel.x = move.x * speed;
    this.vel.z = move.z * speed;
    if (this.keys.Space && this.onGround) {
      this.vel.y = JUMP_VEL;
      this.onGround = false;
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -50) this.vel.y = -50;

    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    const fallingBeforeMove = this.vel.y < 0;
    const blockedY = this.moveAxis('y', this.vel.y * dt);
    // Landed if vertical movement was stopped while falling.
    this.onGround = blockedY && fallingBeforeMove;

    if (!wasOnGround && this.onGround) {
      const fall = this.fallStartY - this.pos.y;
      if (fall > 3) this.health = Math.max(0, this.health - Math.floor(fall - 3));
      if (fall > 3) this.regenTimer = 0;
    }
    if (this.onGround || this.vel.y > 0) this.fallStartY = this.pos.y;
  }

  respawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.health = this.maxHealth;
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
