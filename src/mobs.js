import * as THREE from 'three';
import { BLOCK, isSolid } from './blocks.js';
import { CHUNK_HEIGHT } from './constants.js';
import { shouldBurn, burnStep } from './burning.js';
import { buildMobModel } from './mob-model.js';
import { LIGHT } from './lighting.js';
import { villagesNear, LEVEL_BOX, HOUSES } from './village.js';
import { EXTRA_MOBS } from './mob-catalogue.js';
import { torchSpawnCell, findTorches } from './torch-spawn.js';
import {
  hunterAction, HUNTER_SHOOT_INTERVAL, HUNTER_ARROW_DAMAGE,
  creeperFuse, creeperExploded, CREEPER_FUSE_RANGE,
  SPIDER_BITE_RANGE, SPIDER_BITE_DAMAGE,
  endermanAngry, ENDERMAN_DAMAGE,
} from './hostile.js';

const GRAVITY = 26;
const KNOCKBACK_DECAY = 6;
// The jump speed for a mob: high enough to clear one block.
// The tallest wall, in blocks, that a land mob can climb. Water mobs never climb.
export const CLIMB_HEIGHT = 1;
// Shearing a sheep gives this much wool, and its wool grows back after this many seconds.
export const SHEARED_WOOL = 2;
export const SHEEP_WOOL_REGROW = 60;
// A tamed wolf this far from the player teleports back to them, and is never removed for distance.
export const TAME_TELEPORT_RANGE = 24;

// Mob types. The first twelve are the original kinds. The rest come from the catalogue, one id per row.
export const MOB = {
  COW: 'cow',
  SHEEP: 'sheep',
  PIG: 'pig',
  RABBIT: 'rabbit',
  CHICKEN: 'chicken',
  FISH: 'fish',
  SALMON: 'salmon',
  DOLPHIN: 'dolphin',
  SQUID: 'squid',
  ZOMBIE: 'zombie',
  VILLAGER: 'villager',
  IRON_GOLEM: 'iron_golem',
};
for (const [id] of EXTRA_MOBS) MOB[id.toUpperCase()] = id;

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
  // A chicken drops raw chicken (meat) and an egg when killed.
  [MOB.CHICKEN]: { size: [0.4, 0.7, 0.4], color: 0xf5f5f5, health: 4, speed: 1.2, hostile: false, drops: [BLOCK.RAW_CHICKEN, BLOCK.EGG] },
  // Fish swim in water only. Their body is flat and low, and they do not walk on land.
  [MOB.FISH]: { size: [0.6, 0.3, 0.3], color: 0x5c8fc4, health: 2, speed: 1.0, hostile: false, drops: [BLOCK.RAW_FISH], water: true },
  // Water mobs. All of them stay in the water. Salmon are a second kind of fish, dolphins are larger, and squid
  // float low in the water.
  [MOB.SALMON]: { size: [0.6, 0.3, 0.3], color: 0xd9735a, health: 3, speed: 1.2, hostile: false, drops: [BLOCK.RAW_FISH], water: true },
  [MOB.DOLPHIN]: { size: [0.9, 0.5, 0.5], color: 0x7d8fa6, health: 8, speed: 1.8, hostile: false, drops: [BLOCK.RAW_FISH], water: true },
  [MOB.SQUID]: { size: [0.6, 0.6, 0.6], color: 0x2c3e50, health: 4, speed: 0.8, hostile: false, drops: [BLOCK.RAW_FISH], water: true },
  // Villagers are peaceful and drop nothing. Iron golems are large, peaceful guards that drop iron.
  [MOB.VILLAGER]: { size: [0.6, 1.9, 0.6], color: 0x6b4a2b, health: 20, speed: 1.0, hostile: false, drops: [] },
  // The iron golem stays peaceful until the player hits a villager. Then it attacks the player, with 7 damage.
  // Iron golems and zombies walk backwards: they face away from the way they move.
  [MOB.IRON_GOLEM]: { size: [1.0, 2.4, 1.0], color: 0xbfc3c8, health: 30, speed: 0.9, hostile: false, drops: [BLOCK.IRON_INGOT], scale: 1.25, damage: 7, guardDamage: 7, walksBackwards: true },
  [MOB.ZOMBIE]: { size: [0.6, 1.9, 0.6], color: 0x3f8f3f, health: 10, speed: 2.3, hostile: true, damage: 3, drops: [BLOCK.ROTTEN_FLESH], burnsInSun: true, walksBackwards: true },
};

// The 68 catalogue mobs. Each row gives its stats, body shape, and colour. Drops are the item names in the
// catalogue, and they stay mob-only items: each drop is a placeholder id so a kill never fails.
// A tamed wolf's bite damage. It bites a target the player has attacked.
export const WOLF_BITE_DAMAGE = 3;
// Each catalogue drop name maps to the item a mob leaves. The names match what the mob is known for in the game.
const CATALOGUE_DROP = {
  raw_fish: BLOCK.RAW_FISH, raw_chicken: BLOCK.RAW_CHICKEN, raw_pork: BLOCK.RAW_PORK, raw_mutton: BLOCK.RAW_MUTTON,
  leather: BLOCK.LEATHER, bone: BLOCK.BONE, string: BLOCK.STRING, gunpowder: BLOCK.GUNPOWDER,
  feather: BLOCK.FEATHER, wheat: BLOCK.WHEAT, rotten_flesh: BLOCK.ROTTEN_FLESH, pearl: BLOCK.ENDER_PEARL,
  ink_sac: BLOCK.INK_SAC, slime_ball: BLOCK.SLIME_BALL, honeycomb: BLOCK.HONEYCOMB, scute: BLOCK.SCUTE, bamboo: BLOCK.BAMBOO,
};
for (const [id, name, hostile, water, shape, hp, speed, dmg, colour, drops] of EXTRA_MOBS) {
  MOB_DEFS[id] = {
    name,
    shape,
    size: shape === 'fish' ? [0.6, 0.3, 0.3] : shape === 'blob' ? [0.6, 0.6, 0.6] : [0.7, 1.0, 0.7],
    color: colour,
    health: hp,
    speed,
    hostile,
    // A hostile mob hits for its catalogue damage. A tamed wolf bites for WOLF_BITE_DAMAGE. Other peaceful mobs do not hit.
    damage: hostile ? dmg : id === 'wolf' ? WOLF_BITE_DAMAGE : 0,
    drops: drops.map((d) => CATALOGUE_DROP[d]).filter((d) => d !== undefined),
    // Hostile land mobs catch fire in daylight, the same as the zombie. Peaceful mobs do not.
    burnsInSun: hostile && !water,
    ...(water ? { water: true } : {}),
  };
}

// Land passive mobs spawn evenly: cows, sheep, pigs, and rabbits. Fish are spawned in water separately.
const LAND_PASSIVE = [MOB.COW, MOB.SHEEP, MOB.PIG, MOB.RABBIT, MOB.CHICKEN];
// The peaceful land kinds from the catalogue join the passive list, so they spawn by day too.
const CATALOGUE_LAND_PASSIVE = EXTRA_MOBS.filter((r) => !r[2] && !r[3]).map((r) => r[0]);
export function pickPassiveMob() {
  const all = [...LAND_PASSIVE, ...CATALOGUE_LAND_PASSIVE];
  return all[Math.floor(Math.random() * all.length)];
}

// The hostile land kinds from the catalogue. They join the zombie at night.
export const HOSTILE_LAND = EXTRA_MOBS.filter((r) => r[2] && !r[3]).map((r) => r[0]);
export function pickHostileMob() {
  const all = [MOB.ZOMBIE, ...HOSTILE_LAND];
  return all[Math.floor(Math.random() * all.length)];
}

// Water mobs: fish, salmon, dolphin, squid, and the catalogue's water kinds. They spawn only in water and never leave it.
export const WATER_MOBS = [MOB.FISH, MOB.SALMON, MOB.DOLPHIN, MOB.SQUID, ...EXTRA_MOBS.filter((r) => r[3]).map((r) => r[0])];
export function pickWaterMob() {
  return WATER_MOBS[Math.floor(Math.random() * WATER_MOBS.length)];
}
// The share of spawn attempts that are water mobs.
const WATER_SPAWN_SHARE = 0.12;

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
    // An iron golem turns on the player once a villager of its village is hit.
    this.angry = false;
    this.wanderTimer = 0;
    this.wanderDir = new THREE.Vector2();
    this.attackCooldown = 0;
    this.hitFlash = 0;
    // Sheep can be sheared for wool. A sheared sheep keeps living, and its wool grows back after a while.
    this.sheared = false;
    this.woolTimer = 0;
    // A wolf can be tamed with a bone. A tamed wolf follows the player and does not wander off.
    this.tamed = false;
    // True while the mob is standing on something. Jumps need it, so a mob cannot jump in mid-air.
    this.onGround = false;

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

  // True if a land mob's body would overlap water at this position. Land mobs never enter water.
  entersWater(px, py, pz) {
    if (this.def.water) return false;
    const hw = this.halfWidth;
    for (let x = Math.floor(px - hw); x <= Math.floor(px + hw - 1e-6); x++) {
      for (let z = Math.floor(pz - hw); z <= Math.floor(pz + hw - 1e-6); z++) {
        for (let y = Math.floor(py); y <= Math.floor(py + this.height - 1e-6); y++) {
          if (this.world.getBlock(x, y, z) === BLOCK.WATER) return true;
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
      // A land mob treats water as a wall, so it cannot walk in even if its wander direction took it there.
      if (this.collides(next.x, next.y, next.z) || this.entersWater(next.x, next.y, next.z)) {
        this.vel[axis] = 0;
        return true;
      }
      this.pos.copy(next);
    }
    return false;
  }

  // True if a solid block is directly in front of the mob at foot height, in the direction it is about to move.
  // Used to start the jump before the mob reaches the block.
  blockAhead(dx, dz) {
    const nx = this.pos.x + Math.sign(dx) * this.halfWidth + dx;
    const nz = this.pos.z + Math.sign(dz) * this.halfWidth + dz;
    return this.collides(nx, this.pos.y, nz);
  }

  // Climbs a wall when walking into it. Every land mob climbs a wall up to CLIMB_HEIGHT blocks tall, as long as
  // the space above the top of the wall is clear. Water mobs never climb. Returns true if the mob started a climb.
  tryJump(dx, dz) {
    if (this.def.water) return false;
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (!this.onGround) return false;
    // Find the first cell above foot height that is free: that is the height the wall reaches to.
    // If there is no solid block in front at foot height, there is no wall to climb.
    if (!this.collides(nx, this.pos.y, nz)) return false;
    let top = 1;
    while (top <= CLIMB_HEIGHT && this.collides(nx, this.pos.y + top, nz)) top++;
    // Still solid after CLIMB_HEIGHT blocks, so the wall is too tall to climb.
    if (top > CLIMB_HEIGHT) return false;
    // Lift the mob high enough to clear the top of the wall, using the same gravity the mob falls with.
    this.vel.y = Math.sqrt(2 * GRAVITY * (top + 0.1));
    return true;
  }

  // The point a villager walks to at night: the centre of its village's nearest house doorway, from inside.
  // Returns null during the day, or when the villager is already inside a house.
  indoorTarget(night) {
    if (!night) return null;
    let best = null;
    let bestDist = Infinity;
    for (const h of HOUSES) {
      const doorX = this.home.x + h.x + Math.floor(h.w / 2) + 0.5;
      const doorZ = this.home.z + h.z + h.doorZ + 0.5;
      const d = Math.hypot(doorX - this.pos.x, doorZ - this.pos.z);
      if (d < bestDist) { bestDist = d; best = { x: doorX, z: doorZ }; }
    }
    return best;
  }

  // The behaviour of the special hostile kinds, from hostile.js. Returns null for every other mob, so those keep the
  // generic chase. Otherwise returns { mx, mz } for the walk direction, and optionally `onAttack` with `damage`.
  specialAction(dt, playerPos, lookDir, fire) {
    if (!['hunter', 'creeper', 'spider', 'enderman'].includes(this.type)) return null;
    const dx = playerPos.x - this.pos.x;
    const dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = dist > 0.01 ? { x: dx / dist, z: dz / dist } : { x: 0, z: 0 };

    if (this.type === 'hunter') {
      // Keeps its distance, backs off when close, and shoots arrows at range.
      this.shootTimer = Math.max(0, (this.shootTimer ?? 0) - dt);
      const action = hunterAction(dist, this.shootTimer <= 0);
      let mx = 0;
      let mz = 0;
      if (action === 'advance') { mx = toPlayer.x; mz = toPlayer.z; }
      if (action === 'retreat') { mx = -toPlayer.x; mz = -toPlayer.z; }
      if (action === 'shoot' && fire) {
        this.shootTimer = HUNTER_SHOOT_INTERVAL;
        // The rifle is aimed at the player's chest, so the bullet travels toward the body, not the ground.
        const aim = { x: playerPos.x - this.pos.x, y: playerPos.y + 1.0 - (this.pos.y + 1.5), z: playerPos.z - this.pos.z };
        const len = Math.hypot(aim.x, aim.y, aim.z) || 1;
        fire({ x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z }, { x: aim.x / len, y: aim.y / len, z: aim.z / len }, HUNTER_ARROW_DAMAGE);
      }
      return { mx, mz };
    }

    if (this.type === 'creeper') {
      // Follows the player. A fuse lights when close and the blast goes off when it ends.
      this.fuse = creeperFuse(this.fuse ?? 0, dist, dt);
      if (this.fuse < 0) this.fuse = 0;
      if (creeperExploded(this.fuse)) {
        this.dead = true;
        this.exploded = true;
        return { mx: 0, mz: 0, onAttack: true, damage: 0 };
      }
      const pursue = dist > CREEPER_FUSE_RANGE ? 1 : 0;
      return { mx: toPlayer.x * pursue, mz: toPlayer.z * pursue };
    }

    if (this.type === 'spider') {
      // Runs at the player and bites when close.
      const bite = dist < SPIDER_BITE_RANGE && this.attackCooldown <= 0;
      if (bite) {
        this.attackCooldown = 1;
        return { mx: toPlayer.x, mz: toPlayer.z, onAttack: true, damage: SPIDER_BITE_DAMAGE };
      }
      return { mx: toPlayer.x, mz: toPlayer.z };
    }

    // Enderman: calm until the player looks straight at it, then it charges and attacks.
    let lookDot = -1;
    if (lookDir && dist > 0.01) lookDot = (lookDir.x * -toPlayer.x + lookDir.z * -toPlayer.z);
    this.angry = endermanAngry(lookDot, dist);
    if (!this.angry) return { mx: 0, mz: 0 };
    if (dist < 1.2 && this.attackCooldown <= 0) {
      this.attackCooldown = 1;
      return { mx: toPlayer.x, mz: toPlayer.z, onAttack: true, damage: ENDERMAN_DAMAGE };
    }
    return { mx: toPlayer.x, mz: toPlayer.z };
  }

  // Picks what this mob goes for this frame, or null. `others` is the list of live mobs it can see.
  // A returned target is { x, z, mob } for another mob, or { x, z, mob: null } for the player.
  chooseTarget(playerPos, others) {
    const playerDist = Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    // A tamed wolf attacks whatever the player last hit, until that mob dies or gets too far away.
    if (this.tamed && this.wolfTarget && !this.wolfTarget.dead) {
      const d = Math.hypot(this.wolfTarget.pos.x - this.pos.x, this.wolfTarget.pos.z - this.pos.z);
      if (d < 16) return { x: this.wolfTarget.pos.x, z: this.wolfTarget.pos.z, mob: this.wolfTarget };
    }
    if (this.tamed) this.wolfTarget = null;
    if (this.type === MOB.ZOMBIE) {
      // Zombies go for villagers that are close, and otherwise for the player.
      let best = null;
      let bestDist = 12;
      for (const m of others) {
        if (m.type !== MOB.VILLAGER || m.dead) continue;
        const d = Math.hypot(m.pos.x - this.pos.x, m.pos.z - this.pos.z);
        if (d < bestDist) { bestDist = d; best = m; }
      }
      if (best) return { x: best.pos.x, z: best.pos.z, mob: best };
      if (this.def.hostile && playerDist < 16) return { x: playerPos.x, z: playerPos.z, mob: null };
      return null;
    }
    if (this.type === MOB.IRON_GOLEM) {
      // Golems attack zombies nearby, and the player only once they are angry.
      let best = null;
      let bestDist = 14;
      for (const m of others) {
        if (m.type !== MOB.ZOMBIE || m.dead) continue;
        const d = Math.hypot(m.pos.x - this.pos.x, m.pos.z - this.pos.z);
        if (d < bestDist) { bestDist = d; best = m; }
      }
      if (best) return { x: best.pos.x, z: best.pos.z, mob: best };
      if (this.angry && playerDist < 16) return { x: playerPos.x, z: playerPos.z, mob: null };
      return null;
    }
    return null;
  }

  // Runs AI and physics for one frame. `playerPos` is the player's feet position.
  // `onAttack(mob, damage)` is called when a hostile mob strikes.
  // `others` is every other live mob, used for targets. `night` is true when villagers should stay indoors.
  // `lookDir` is the player's look direction, for the enderman's gaze. `fire(from, dir, damage)` shoots an arrow.
  update(dt, playerPos, onAttack, others = [], night = false, lookDir = null, fire = null) {
    if (this.dead) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    // A sheared sheep grows its wool back after a while, and can be sheared again.
    if (this.sheared) {
      this.woolTimer -= dt;
      if (this.woolTimer <= 0) this.sheared = false;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    let mx = 0;
    let mz = 0;
    // Hostile and angry mobs pick a target. Zombies attack the player and villagers. Iron golems attack zombies,
    // and the player too once they are angry. Each target is a mob or the player, and a strike goes to whichever it is.
    // Special hostile kinds (hunter, creeper, spider, enderman) have their own behaviour, from hostile.js.
    const special = this.specialAction(dt, playerPos, lookDir, fire);
    if (special) {
      mx = special.mx;
      mz = special.mz;
      if (special.onAttack) onAttack(this, special.damage);
    } else if (this.chooseTarget(playerPos, others) !== null) {
      // Zombies, golems and the rest chase their target as before.
      const target = this.chooseTarget(playerPos, others);
      const tdx = target.x - this.pos.x;
      const tdz = target.z - this.pos.z;
      const tdist = Math.hypot(tdx, tdz);
      if (tdist > 0.1) { mx = tdx / tdist; mz = tdz / tdist; }
      if (tdist < 1.2 && this.attackCooldown <= 0) {
        this.attackCooldown = 1;
        if (target.mob) target.mob.takeHit(this.def.damage ?? this.def.guardDamage, this.pos.x, this.pos.z);
        else onAttack(this, this.def.damage ?? this.def.guardDamage);
      }
    } else if (this.tamed) {
      // A tamed wolf keeps close to the player: it walks toward them when far, and waits when near.
      const fx = playerPos.x - this.pos.x;
      const fz = playerPos.z - this.pos.z;
      const d = Math.hypot(fx, fz);
      if (d > 3) { mx = fx / d; mz = fz / d; }
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

    // At night a villager walks to the nearest house door, opens it, and goes inside. It stays in until morning.
    if (this.type === MOB.VILLAGER && this.home) {
      const inside = this.indoorTarget(night);
      if (inside) {
        const idx = inside.x - this.pos.x;
        const idz = inside.z - this.pos.z;
        const idist = Math.hypot(idx, idz);
        if (idist > 0.2) { mx = idx / idist; mz = idz / idist; }
        else { mx = 0; mz = 0; }
        // Standing at the door opens it, so the villager can walk through.
        if (idist < 1.2) this.world.openDoorAt?.(Math.floor(inside.x), Math.floor(this.pos.y), Math.floor(inside.z));
      }
    }

    // Water mobs stay in water: they turn back when the next step would leave the water.
    // Land mobs stay on land: they turn back when the next step would go into water.
    // Look ahead far enough to cover one frame of movement, plus the mob's half-width, so a fast mob cannot skip
    // over the shore in one step.
    const lookAhead = Math.max(0.6, this.halfWidth + this.def.speed * dt * 2);
    const nxt = Math.floor(this.pos.x + mx * lookAhead);
    const nzt = Math.floor(this.pos.z + mz * lookAhead);
    const stepCell = this.world.getBlock(nxt, Math.floor(this.pos.y), nzt);
    const wouldLeave = this.def.water ? stepCell !== BLOCK.WATER : stepCell === BLOCK.WATER;
    if (wouldLeave) {
      mx = 0;
      mz = 0;
      this.wanderDir.set(0, 0);
    }

    // Knockback fades out over time and is added on top of the AI movement.
    this.knock.multiplyScalar(Math.max(0, 1 - KNOCKBACK_DECAY * dt));
    this.vel.x = mx * this.def.speed + this.knock.x;
    this.vel.z = mz * this.def.speed + this.knock.z;
    // A fish in water floats, so gravity does not pull it down. Out of water, it falls like any mob.
    const inWater = this.def.water && this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z)) === BLOCK.WATER;
    this.vel.y = inWater ? 0 : Math.max(-40, this.vel.y - GRAVITY * dt);

    const stepX = this.vel.x * dt;
    const stepZ = this.vel.z * dt;
    // If a block is directly in front of the mob, jump before walking into it. The jump runs first, so the
    // mob rises as it moves and does not stop against the block.
    if (stepX !== 0 && this.blockAhead(stepX, 0)) this.tryJump(stepX, 0);
    else if (stepZ !== 0 && this.blockAhead(0, stepZ)) this.tryJump(0, stepZ);
    const blockedX = this.moveAxis('x', stepX);
    const blockedZ = this.moveAxis('z', stepZ);
    if (blockedX && this.tryJump(stepX, 0)) this.vel.x = 0;
    if (blockedZ && this.tryJump(0, stepZ)) this.vel.z = 0;

    const falling = this.vel.y < 0;
    const landed = this.moveAxis('y', this.vel.y * dt) && falling;
    if (landed) this.vel.y = 0;
    // On the ground when the fall was stopped by a block below. A jump lifts the mob off the ground.
    this.onGround = landed;

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
    // Most mobs face the way they walk. Iron golems and zombies walk backwards, so they face away from their path.
    if (mx !== 0 || mz !== 0) {
      const facing = this.def.walksBackwards ? 1 : -1;
      this.group.rotation.y = Math.atan2(facing * mx, facing * mz);
    }
  }

  // Shears a sheep. Returns the wool it gives (2), or 0 if it cannot be sheared (not a sheep, or already sheared).
  // The sheep lives on, and its wool grows back after SHEEP_WOOL_REGROW seconds.
  // Taming: a wild wolf becomes tamed when fed a bone. Returns true if it was tamed by this call.
  tame() {
    if (this.type !== 'wolf' || this.tamed || this.dead) return false;
    this.tamed = true;
    return true;
  }

  // Moves a tamed wolf onto open ground a few blocks from the player. Tries a ring of spots around them, and
  // returns false (leaving the wolf where it is) if none of them has ground with room to stand.
  teleportNear(playerPos) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const x = Math.floor(playerPos.x + Math.cos(a) * 2.5);
      const z = Math.floor(playerPos.z + Math.sin(a) * 2.5);
      // Walk down from just above the player to the first solid block, which is the ground at this spot.
      for (let y = Math.floor(playerPos.y) + 2; y > 0; y--) {
        if (!isSolid(this.world.getBlock(x, y, z))) continue;
        // The two cells above the ground must be open, so the wolf fits standing on it.
        if (!isSolid(this.world.getBlock(x, y + 1, z)) && !isSolid(this.world.getBlock(x, y + 2, z))) {
          this.pos.set(x + 0.5, y + 1, z + 0.5);
          this.vel.set(0, 0, 0);
          this.knock.set(0, 0, 0);
          this.group.position.copy(this.pos);
          return true;
        }
        break;
      }
    }
    return false;
  }

  shear() {
    if (this.type !== MOB.SHEEP || this.sheared || this.dead) return 0;
    this.sheared = true;
    this.woolTimer = SHEEP_WOOL_REGROW;
    return SHEARED_WOOL;
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
    // Villages that have lost a villager. Their villagers are never topped up again. Keyed by "x,z" of the centre.
    this.lostVillagers = new Set();
  }

  // Keeps each village near the player populated: up to VILLAGERS_PER_VILLAGE villagers and GOLEMS_PER_VILLAGE
  // iron golems. Villagers and golems are placed on the village's levelled ground, one per attempt.
  // `villages` is a list of village centres. The caller passes the ones near the player.
  spawnVillagers(villages) {
    for (const v of villages) {
      const home = { x: v.x, z: v.z };
      const near = (type) => this.mobs.filter((m) => m.type === type && m.home && m.home.x === home.x && m.home.z === home.z).length;
      // A village that has lost a villager does not get a replacement, so its villagers stay gone.
      const lost = this.lostVillagers.has(`${home.x},${home.z}`);
      if (!lost && near(MOB.VILLAGER) < VILLAGERS_PER_VILLAGE) this.placeOnVillageGround(MOB.VILLAGER, home);
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
    // Water mobs (fish, salmon, dolphin, squid) are one share of spawns. Everything else is a land mob.
    if (roll < WATER_SPAWN_SHARE) {
      this.trySpawnInWater(playerPos, pickWaterMob());
      return;
    }
    // At night a land spawn is hostile: a zombie or one of the catalogue's hostile kinds. By day it is peaceful.
    // Hostile mobs only spawn at night. By day every land spawn is peaceful.
    const type = night ? pickHostileMob() : pickPassiveMob();
    this.trySpawnOnLand(playerPos, type, night);
  }

  // Random ground cell near the player, used by both spawn paths.
  spawnCell(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 10;
    return {
      x: Math.floor(playerPos.x + Math.cos(angle) * dist),
      z: Math.floor(playerPos.z + Math.sin(angle) * dist),
    };
  }

  // Land mobs spawn on dry ground only. The top solid block of the column must be ground, not water.
  // If the column's top is water, the spot is refused, so a land mob is never placed under the water.
  trySpawnOnLand(playerPos, type, night = false) {
    // A hostile spawn at night prefers a spot near a torch the player can reach, so hostiles gather at torches.
    // With no torch in reach, it uses the usual ring around the player.
    if (night && MOB_DEFS[type]?.hostile) {
      const torchCell = torchSpawnCell(this.world, playerPos, findTorches(this.world, playerPos));
      if (torchCell) {
        this.mobs.push(new Mob(this.scene, this.world, type, torchCell.x + 0.5, torchCell.y, torchCell.z + 0.5));
        return;
      }
    }
    const { x, z } = this.spawnCell(playerPos);
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      const id = this.world.getBlock(x, y, z);
      if (id === BLOCK.AIR) continue;
      // The first non-air cell decides it: water means no land spawn here.
      if (id === BLOCK.WATER) return;
      if (this.world.getBlock(x, y + 1, z) !== BLOCK.AIR) return;
      // A hostile mob only spawns at night, so by day no hostile spawn happens here at all.
      if (MOB_DEFS[type]?.hostile && !night) return;
      // A peaceful land mob needs open sky above it, so it never spawns stuck inside a cave or under a roof.
      if (!MOB_DEFS[type]?.hostile && this.world.getLight(x, y + 1, z, LIGHT.SKY) <= 0) return;
      this.mobs.push(new Mob(this.scene, this.world, type, x + 0.5, y + 1, z + 0.5));
      return;
    }
  }

  // The top non-air cell of a column (the surface), searching down from the top of the world.
  surfaceY(x, z) {
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      if (this.world.getBlock(x, y, z) !== BLOCK.AIR) return y;
    }
    return 0;
  }

  // Water mobs spawn in water and stay there. Fish-like mobs sit near the surface, and squid lower in the water.
  // A spawn needs water at the cell and air or water above it, so the mob has room to swim.
  trySpawnInWater(playerPos, type) {
    // A random spot near the player would rarely be water, so sample a few spots and keep the first that is water.
    // Water spots are sampled across the whole spawn range (a disc around the player), not only the ring the land
    // mobs use, so a lake near the player is found. Each sample is a column; the first with water on top wins.
    let spot = null;
    for (let tries = 0; tries < 40 && !spot; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * (14 + 10);
      const x = Math.floor(playerPos.x + Math.cos(angle) * d);
      const z = Math.floor(playerPos.z + Math.sin(angle) * d);
      if (this.world.getBlock(x, this.surfaceY(x, z), z) === BLOCK.WATER) spot = { x, z };
    }
    if (!spot) return;
    const { x, z } = spot;
    for (let y = CHUNK_HEIGHT - 2; y > 0; y--) {
      if (this.world.getBlock(x, y, z) !== BLOCK.WATER) continue;
      // Found the surface water cell of this column.
      if (this.world.getBlock(x, y + 1, z) !== BLOCK.AIR && this.world.getBlock(x, y + 1, z) !== BLOCK.WATER) return;
      const depth = type === MOB.SQUID ? 2 : 0;
      const sy = Math.max(1, y - depth);
      // The spawn cell must be water, with water around it so the mob is not on the bottom or at the shore.
      if (this.world.getBlock(x, sy, z) !== BLOCK.WATER) return;
      this.mobs.push(new Mob(this.scene, this.world, type, x + 0.5, sy + 0.2, z + 0.5));
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
    const night = timeOfDay > 0.5;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      m.update(dt, playerPos, onAttack, this.mobs.filter((o) => o !== m), night);
      // Sunlight damage: a burning zombie takes fire damage each tick until it dies or is shaded.
      const burning = shouldBurn(m, this.world, timeOfDay);
      const burnDamage = burnStep(m, dt, burning);
      if (burnDamage > 0 && !m.dead) m.takeHit(burnDamage, m.pos.x, m.pos.z);
      // A tamed wolf that gets far away teleports back to the player. It is never removed for distance.
      if (m.tamed && !m.dead && m.pos.distanceTo(playerPos) > TAME_TELEPORT_RANGE) m.teleportNear(playerPos);
      // Villagers and golems belong to a village, so they are only removed when they die, not when far away.
      const village = m.home !== undefined;
      const tamed = m.tamed === true;
      if (m.dead || (!village && !tamed && m.pos.distanceTo(playerPos) > 48)) {
        // A villager that dies is not replaced: its village stops topping up villagers for good.
        if (m.dead && m.type === MOB.VILLAGER && m.home) this.lostVillagers.add(`${m.home.x},${m.home.z}`);
        m.dispose();
        this.mobs.splice(i, 1);
      }
    }
  }

  // Called when the player hits a villager. Every iron golem of that village turns on the player.
  angerGolemsOf(villager) {
    if (villager.type !== MOB.VILLAGER || !villager.home) return;
    for (const m of this.mobs) {
      if (m.type !== MOB.IRON_GOLEM || m.dead || !m.home) continue;
      if (m.home.x === villager.home.x && m.home.z === villager.home.z) m.angry = true;
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
