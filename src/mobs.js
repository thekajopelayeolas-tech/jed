import * as THREE from 'three';
import { BLOCK, isSolid } from './blocks.js';
import { CHUNK_HEIGHT } from './constants.js';
import { shouldBurn, burnStep } from './burning.js';
import { buildMobModel } from './mob-model.js';

const GRAVITY = 26;
const KNOCKBACK_DECAY = 6;

// Mob types.
export const MOB = {
  COW: 'cow',
  ZOMBIE: 'zombie',
};

// Mob definitions: body box size, max health, movement speed, and attack.
const MOB_DEFS = {
  [MOB.COW]: { size: [0.9, 0.9, 0.9], color: 0xf2f2f2, health: 6, speed: 1.4, hostile: false, drop: BLOCK.BEEF },
  [MOB.ZOMBIE]: { size: [0.6, 1.9, 0.6], color: 0x3f8f3f, health: 10, speed: 2.3, hostile: true, damage: 3, drop: BLOCK.ROTTEN_FLESH, burnsInSun: true },
};

// A single mob with a box body, simple physics against the voxel world, and AI.
export class Mob {
  constructor(scene, world, type, x, y, z) {
    this.scene = scene;
    this.world = world;
    this.type = type;
    this.def = MOB_DEFS[type];
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.health = this.def.health;
    this.dead = false;
    this.wanderTimer = 0;
    this.wanderDir = new THREE.Vector2();
    this.attackCooldown = 0;
    this.hitFlash = 0;

    // Collision uses this simple box. The visible model is built separately and animated.
    const [w, h] = this.def.size;
    this.height = h;
    this.halfWidth = w / 2;
    this.group = new THREE.Group();
    this.model = buildMobModel(type);
    this.group.add(this.model.group);
    this.scene.add(this.group);
    this.walkPhase = 0;
  }

  // True if the body overlaps any solid block at the given position.
  collides(px, py, pz) {
    const hw = this.halfWidth;
    const minX = Math.floor(px - hw);
    const maxX = Math.floor(px + hw - 1e-6);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + this.height - 1e-6);
    const minZ = Math.floor(pz - hw);
    const maxZ = Math.floor(pz + hw - 1e-6);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(this.world.getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  // Moves one axis in small steps, stopping at collisions. Returns true if blocked.
  moveAxis(axis, delta) {
    if (delta === 0) return false;
    const steps = Math.ceil(Math.abs(delta) / 0.05);
    const step = delta / steps;
    for (let i = 0; i < steps; i++) {
      const next = this.pos.clone();
      next[axis] += step;
      if (this.collides(next.x, next.y, next.z)) {
        this.vel[axis] = 0;
        return true;
      }
      this.pos.copy(next);
    }
    return false;
  }

  // Steps up one block when walking into a wall, so mobs can climb terrain.
  tryStepUp(dx, dz) {
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (!this.collides(nx, this.pos.y, nz)) return false;
    if (this.collides(nx, this.pos.y + 1, nz)) return false;
    this.pos.y += 1;
    return true;
  }

  // Runs AI and physics for one frame. `playerPos` is the player's feet position.
  // `onAttack(mob, damage)` is called when a hostile mob strikes.
  update(dt, playerPos, onAttack) {
    if (this.dead) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    let mx = 0;
    let mz = 0;
    const dx = playerPos.x - this.pos.x;
    const dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    if (this.def.hostile && dist < 16) {
      // Zombie: chase the player and attack when close.
      if (dist > 0.1) { mx = dx / dist; mz = dz / dist; }
      if (dist < 1.2 && this.attackCooldown <= 0) {
        this.attackCooldown = 1;
        onAttack(this, this.def.damage);
      }
    } else {
      // Cow: wander in a random direction and pause between walks.
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2;
        this.wanderDir.set(Math.cos(a), Math.sin(a));
        if (Math.random() < 0.4) this.wanderDir.set(0, 0);
      }
      mx = this.wanderDir.x;
      mz = this.wanderDir.y;
    }

    // Knockback fades out over time and is added on top of the AI movement.
    this.knock.multiplyScalar(Math.max(0, 1 - KNOCKBACK_DECAY * dt));
    this.vel.x = mx * this.def.speed + this.knock.x;
    this.vel.z = mz * this.def.speed + this.knock.z;
    this.vel.y = Math.max(-40, this.vel.y - GRAVITY * dt);

    const blockedX = this.moveAxis('x', this.vel.x * dt);
    const blockedZ = this.moveAxis('z', this.vel.z * dt);
    if (blockedX && this.tryStepUp(this.vel.x * dt, 0)) this.vel.x = 0;
    if (blockedZ && this.tryStepUp(0, this.vel.z * dt)) this.vel.z = 0;

    const falling = this.vel.y < 0;
    if (this.moveAxis('y', this.vel.y * dt) && falling) this.vel.y = 0;

    this.group.position.copy(this.pos);
    // Hit flash tints every part red for a moment. Otherwise each part keeps its own colour.
    for (const mat of this.model.materials) {
      mat.emissive.setHex(this.hitFlash > 0 ? 0x661010 : 0x000000);
    }
    // Walking animation: legs and arms swing in opposite phase while the mob moves.
    const moving = Math.hypot(mx, mz) > 0.05;
    if (moving) this.walkPhase += dt * this.def.speed * 4;
    const swing = moving ? Math.sin(this.walkPhase) * 0.6 : 0;
    this.model.legs.forEach((leg, i) => { leg.rotation.x = i % 2 === 0 ? swing : -swing; });
    this.model.arms.forEach((arm, i) => { arm.rotation.x = i % 2 === 0 ? -swing : swing; });
    if (mx !== 0 || mz !== 0) this.group.rotation.y = Math.atan2(-mx, -mz);
  }

  // Applies damage and knockback away from (fromX, fromZ). Returns true if the mob died.
  takeHit(amount, fromX, fromZ) {
    if (this.dead) return false;
    this.health -= amount;
    this.hitFlash = 0.3;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.knock.set((dx / d) * 5, 0, (dz / d) * 5);
    this.vel.y = 4;
    if (this.health <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.group);
    this.model.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}

// Owns all mobs. Spawns them near the player on solid ground and removes dead or distant ones.
export class MobManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.mobs = [];
    this.spawnTimer = 0;
  }

  // Tries one spawn near the player. Zombies favour night, cows favour day.
  trySpawn(playerPos, timeOfDay) {
    const night = timeOfDay > 0.5;
    const type = night || Math.random() < 0.3 ? MOB.ZOMBIE : MOB.COW;
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 10;
    const x = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const z = Math.floor(playerPos.z + Math.sin(angle) * dist);
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      const id = this.world.getBlock(x, y, z);
      if (id === 0 || id === 7) continue;
      if (this.world.getBlock(x, y + 1, z) !== 0) return;
      this.mobs.push(new Mob(this.scene, this.world, type, x + 0.5, y + 1, z + 0.5));
      return;
    }
  }

  // Updates spawning and every mob. `onAttack(mob, damage)` is called when a zombie strikes.
  update(dt, playerPos, timeOfDay, onAttack) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.mobs.length < 14) {
      this.spawnTimer = 1.5;
      this.trySpawn(playerPos, timeOfDay);
    }
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      m.update(dt, playerPos, onAttack);
      // Sunlight damage: a burning zombie takes fire damage each tick until it dies or is shaded.
      const burning = shouldBurn(m, this.world, timeOfDay);
      const burnDamage = burnStep(m, dt, burning);
      if (burnDamage > 0 && !m.dead) m.takeHit(burnDamage, m.pos.x, m.pos.z);
      if (m.dead || m.pos.distanceTo(playerPos) > 48) {
        m.dispose();
        this.mobs.splice(i, 1);
      }
    }
  }

  // Returns the nearest live mob whose body a ray passes through, or null.
  raycastMob(origin, dir, maxDist) {
    let best = null;
    let bestT = maxDist;
    const ray = new THREE.Ray(origin, dir);
    const hit = new THREE.Vector3();
    for (const m of this.mobs) {
      if (m.dead) continue;
      const box = new THREE.Box3(
        new THREE.Vector3(m.pos.x - m.halfWidth, m.pos.y, m.pos.z - m.halfWidth),
        new THREE.Vector3(m.pos.x + m.halfWidth, m.pos.y + m.height, m.pos.z + m.halfWidth),
      );
      if (!ray.intersectBox(box, hit)) continue;
      const t = origin.distanceTo(hit);
      if (t < bestT) { bestT = t; best = m; }
    }
    return best;
  }
}
