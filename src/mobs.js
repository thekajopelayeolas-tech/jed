import * as THREE from 'three';
import { BLOCK, isSolid } from './blocks.js';
import { CHUNK_HEIGHT } from './constants.js';
import { shouldBurn, burnStep } from './burning.js';
import { buildMobModel } from './mob-model.js';
import { LIGHT } from './lighting.js';
import { villagesNear, LEVEL_BOX } from './village.js';

const GRAVITY = 26;
const KNOCKBACK_DECAY = 6;

// Mob types.
export const MOB = {
  COW: 'cow',
  SHEEP: 'sheep',
  PIG: 'pig',
  RABBIT: 'rabbit',
  FISH: 'fish',
  ZOMBIE: 'zombie',
  VILLAGER: 'villager',
  IRON_GOLEM: 'iron_golem',
};

// Each village keeps this many villagers and iron golems. They are topped up when the player is near.
export const VILLAGERS_PER_VILLAGE = 10;
export const GOLEMS_PER_VILLAGE = 1;
// How close the player must be for a village to be populated, in blocks.
const VILLAGE_SPAWN_RANGE = 40;
const VILLAGE_SPAWN_INTERVAL = 1.5;


// Mob definitions: body box size, max health, movement speed, and attack.
// `drops` lists the items the mob leaves when killed, one entry per item. Sheep drop mutton and wool.
const MOB_DEFS = {
  [MOB.COW]: { size: [0.9, 0.9, 0.9], color: 0xf2f2f2, health: 6, speed: 1.4, hostile: false, drops: [BLOCK.BEEF] },
  [MOB.SHEEP]: { size: [0.9, 0.9, 0.9], color: 0xf5f5f0, health: 5, speed: 1.3, hostile: false, drops: [BLOCK.RAW_MUTTON, BLOCK.WOOL] },
  [MOB.PIG]: { size: [0.9, 0.8, 0.9], color: 0xf0a0a8, health: 5, speed: 1.3, hostile: false, drops: [BLOCK.RAW_PORK] },
  [MOB.RABBIT]: { size: [0.5, 0.6, 0.5], color: 0xb08a62, health: 3, speed: 2.0, hostile: false, drops: [BLOCK.RAW_RABBIT] },
  // Fish swim in water only. Their body is flat and low, and they do not walk on land.
  [MOB.FISH]: { size: [0.6, 0.3, 0.3], color: 0x5c8fc4, health: 2, speed: 1.0, hostile: false, drops: [BLOCK.RAW_FISH], water: true },
  // Villagers are peaceful and drop nothing. Iron golems are large, peaceful guards that drop iron.
  [MOB.VILLAGER]: { size: [0.6, 1.9, 0.6], color: 0x6b4a2b, health: 20, speed: 1.0, hostile: false, drops: [] },
  [MOB.IRON_GOLEM]: { size: [1.0, 2.4, 1.0], color: 0xbfc3c8, health: 30, speed: 0.9, hostile: false, drops: [BLOCK.IRON_INGOT], scale: 1.25 },
  [MOB.ZOMBIE]: { size: [0.6, 1.9, 0.6], color: 0x3f8f3f, health: 10, speed: 2.3, hostile: true, damage: 3, drops: [BLOCK.ROTTEN_FLESH], burnsInSun: true },
};

// Land passive mobs spawn evenly: cows, sheep, pigs, and rabbits. Fish are spawned in water separately.
const LAND_PASSIVE = [MOB.COW, MOB.SHEEP, MOB.PIG, MOB.RABBIT];
export function pickPassiveMob() {
  return LAND_PASSIVE[Math.floor(Math.random() * LAND_PASSIVE.length)];
}

// A cell is dark enough for a zombie when neither sky light nor block light reaches it.
// Any light at all (a torch, the open sky) means no zombie can spawn there.
export function isDarkEnough(world, x, y, z) {
  const sky = world.getLight(x, y, z, LIGHT.SKY);
  const block = world.getLight(x, y, z, LIGHT.BLOCK);
  // Unloaded cells report -1 and are not safe to spawn in.
  if (sky < 0 || block < 0) return false;
  return sky === 0 && block === 0;
}

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
    // Some mobs are drawn larger than their collision box, such as iron golems. The box stays the same.
    if (this.def.scale) this.model.group.scale.setScalar(this.def.scale);
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

    // Fish stay in water: a fish turns back when its next step would leave the water.
    if (this.def.water) {
      const nx = Math.floor(this.pos.x + mx * 0.3);
      const nz = Math.floor(this.pos.z + mz * 0.3);
      if (this.world.getBlock(nx, Math.floor(this.pos.y), nz) !== BLOCK.WATER) {
        mx = 0;
        mz = 0;
        this.wanderDir.set(0, 0);
      }
    }

    // Knockback fades out over time and is added on top of the AI movement.
    this.knock.multiplyScalar(Math.max(0, 1 - KNOCKBACK_DECAY * dt));
    this.vel.x = mx * this.def.speed + this.knock.x;
    this.vel.z = mz * this.def.speed + this.knock.z;
    // A fish in water floats, so gravity does not pull it down. Out of water, it falls like any mob.
    const inWater = this.def.water && this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z)) === BLOCK.WATER;
    this.vel.y = inWater ? 0 : Math.max(-40, this.vel.y - GRAVITY * dt);

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
  // `seed` is the world seed, used to find the villages near the player. It is optional, so tests can skip villages.
  constructor(scene, world, seed) {
    this.scene = scene;
    this.world = world;
    this.seed = seed;
    this.mobs = [];
    this.spawnTimer = 0;
    this.villageTimer = 0;
  }

  // Keeps each village near the player populated: up to VILLAGERS_PER_VILLAGE villagers and GOLEMS_PER_VILLAGE
  // iron golems. Villagers and golems are placed on the village's levelled ground, one per attempt.
  // `villages` is a list of village centres. The caller passes the ones near the player.
  spawnVillagers(villages) {
    for (const v of villages) {
      const home = { x: v.x, z: v.z };
      const near = (type) => this.mobs.filter((m) => m.type === type && m.home && m.home.x === home.x && m.home.z === home.z).length;
      if (near(MOB.VILLAGER) < VILLAGERS_PER_VILLAGE) this.placeOnVillageGround(MOB.VILLAGER, home);
      if (near(MOB.IRON_GOLEM) < GOLEMS_PER_VILLAGE) this.placeOnVillageGround(MOB.IRON_GOLEM, home);
    }
  }

  // Puts one villager or golem on the ground at a random cell in the village's levelled area, if it is clear.
  placeOnVillageGround(type, home) {
    const x = home.x + Math.floor(LEVEL_BOX.x0 + Math.random() * (LEVEL_BOX.x1 - LEVEL_BOX.x0));
    const z = home.z + Math.floor(LEVEL_BOX.z0 + Math.random() * (LEVEL_BOX.z1 - LEVEL_BOX.z0));
    // Walk down from the top of the column to the first solid block, and stand on it.
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      const id = this.world.getBlock(x, y, z);
      if (id === BLOCK.AIR || id === BLOCK.WATER) continue;
      if (this.world.getBlock(x, y + 1, z) !== BLOCK.AIR) return;
      const mob = new Mob(this.scene, this.world, type, x + 0.5, y + 1, z + 0.5);
      mob.home = home;
      this.mobs.push(mob);
      return;
    }
  }

  // Tries one spawn near the player. Zombies favour night. Passive mobs favour day, and are cows or sheep.
  // Zombies only spawn in the dark: a cell with any light (sky or block) is too bright for a zombie.
  trySpawn(playerPos, timeOfDay) {
    const night = timeOfDay > 0.5;
    const roll = Math.random();
    const type = night || roll < 0.3 ? MOB.ZOMBIE : roll < 0.4 ? MOB.FISH : pickPassiveMob();
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 10;
    const x = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const z = Math.floor(playerPos.z + Math.sin(angle) * dist);
    if (type === MOB.FISH) {
      // Fish spawn at the surface of water: the top water cell with open air above it.
      for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
        if (this.world.getBlock(x, y, z) !== BLOCK.WATER) continue;
        if (this.world.getBlock(x, y + 1, z) === BLOCK.AIR) {
          this.mobs.push(new Mob(this.scene, this.world, type, x + 0.5, y + 0.2, z + 0.5));
        }
        return;
      }
      return;
    }
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      const id = this.world.getBlock(x, y, z);
      if (id === 0 || id === 7) continue;
      if (this.world.getBlock(x, y + 1, z) !== 0) return;
      if (type === MOB.ZOMBIE && !isDarkEnough(this.world, x, y + 1, z)) return;
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
    // Villagers and golems are topped up in the villages near the player. They do not count toward the cap.
    this.villageTimer -= dt;
    if (this.villageTimer <= 0 && this.seed !== undefined) {
      this.villageTimer = VILLAGE_SPAWN_INTERVAL;
      const near = villagesNear(playerPos.x, playerPos.z, this.seed, VILLAGE_SPAWN_RANGE);
      this.spawnVillagers(near);
    }
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      m.update(dt, playerPos, onAttack);
      // Sunlight damage: a burning zombie takes fire damage each tick until it dies or is shaded.
      const burning = shouldBurn(m, this.world, timeOfDay);
      const burnDamage = burnStep(m, dt, burning);
      if (burnDamage > 0 && !m.dead) m.takeHit(burnDamage, m.pos.x, m.pos.z);
      // Villagers and golems belong to a village, so they are only removed when they die, not when far away.
      const village = m.home !== undefined;
      if (m.dead || (!village && m.pos.distanceTo(playerPos) > 48)) {
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
