import * as THREE from 'three';
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { RENDER_DISTANCE, REACH, SEA_LEVEL, CHUNK_HEIGHT } from './constants.js';
import { createHud } from './hud.js';
import { setupInput } from './input.js';
import { updateDayNight, createSky } from './sky.js';
import { DropManager } from './drops.js';
import { createCrafting } from './crafting.js';
import { MobManager } from './mobs.js';
import { saveGame, loadGame } from './save.js';
import { createAtlasTexture } from './textures.js';

const SEED = 1337;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
const sky = createSky(scene);

const atlas = createAtlasTexture(THREE);
const opaqueMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5 });
const transMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });

const world = new World(scene, SEED, opaqueMat, transMat);
const player = new Player(world, 8, 80, 8);
const inventory = new Inventory();
const hud = createHud();
const drops = new DropManager(scene, world);
const mobs = new MobManager(scene, world);

// Starter items so the hotbar is useful immediately.
inventory.add(BLOCK.DIRT, 64);
inventory.add(BLOCK.STONE, 64);
inventory.add(BLOCK.PLANKS, 32);
inventory.add(BLOCK.WOOD, 16);
inventory.add(BLOCK.GLASS, 16);
inventory.add(BLOCK.COBBLESTONE, 32);

// Find the top solid block at (x, z) and return the y just above it.
function findSpawn(x, z) {
  for (let y = CHUNK_HEIGHT - 1; y > 0; y--) {
    const id = world.getBlock(x, y, z);
    if (id !== BLOCK.AIR && id !== BLOCK.WATER) return y + 1;
  }
  return SEA_LEVEL + 2;
}

function respawn() {
  const sx = 8;
  const sz = 8;
  // Load nearby terrain before searching for the surface.
  world.update(sx, sz, 2, 16);
  player.respawn(sx, findSpawn(sx, sz), sz);
}

function targetHit() {
  return world.raycast(player.eye, player.lookDir(), REACH);
}

// What a broken block leaves behind. Blocks not listed here drop themselves.
const DROP_FOR = { [BLOCK.GRASS]: BLOCK.DIRT, [BLOCK.STONE]: BLOCK.COBBLESTONE };

// Left click: hit a mob if one is in front of the player, otherwise break the block.
function attack() {
  const eye = player.eye;
  const dir = player.lookDir();
  const blockHit = targetHit();
  // Only mobs closer than the block in front of the player can be hit.
  const blockDist = blockHit
    ? eye.distanceTo(new THREE.Vector3(blockHit.block.x + 0.5, blockHit.block.y + 0.5, blockHit.block.z + 0.5))
    : REACH;
  const mob = mobs.raycastMob(eye, dir, blockDist);
  if (mob) {
    mob.takeHit(3, player.pos.x, player.pos.z);
    if (mob.dead) drops.spawn(mob.def.drop, mob.pos.x, mob.pos.y, mob.pos.z);
    return;
  }
  breakBlock();
}

function breakBlock() {
  const hit = targetHit();
  if (!hit || hit.id === BLOCK.BEDROCK) return;
  if (world.setBlock(hit.block.x, hit.block.y, hit.block.z, BLOCK.AIR)) {
    drops.spawn(DROP_FOR[hit.id] ?? hit.id, hit.block.x, hit.block.y, hit.block.z);
  }
}

function placeBlock() {
  const hit = targetHit();
  if (!hit) return;
  const item = inventory.selectedItem;
  if (item.id === BLOCK.AIR || item.count <= 0) return;
  const { x, y, z } = hit.place;
  const target = world.getBlock(x, y, z);
  if (target !== BLOCK.AIR && target !== BLOCK.WATER) return;
  if (overlapsPlayer(x, y, z)) return;
  if (world.setBlock(x, y, z, item.id)) inventory.consumeSelected(1);
}

// True if the block cell at (bx, by, bz) intersects the player's body.
function overlapsPlayer(bx, by, bz) {
  const hw = 0.3;
  const p = player.pos;
  return p.x + hw > bx && p.x - hw < bx + 1 &&
    p.z + hw > bz && p.z - hw < bz + 1 &&
    p.y + 1.8 > by && p.y < by + 1;
}

const crafting = createCrafting(inventory);

setupInput(renderer.domElement, player, inventory, {
  onBreak: attack,
  onPlace: placeBlock,
  onRespawn: respawn,
  onPauseChange: (paused) => hud.setPaused(paused && !crafting.isOpen()),
  onToggleCrafting: () => {
    // Opening the panel frees the mouse. Closing it grabs the mouse again.
    if (crafting.toggle()) document.exitPointerLock();
    else renderer.domElement.requestPointerLock();
  },
  isUIOpen: () => crafting.isOpen(),
});

// Restore a saved game if one exists, otherwise start fresh at spawn.
const saved = loadGame();
let timeOfDay = 0.25;
if (saved) {
  world.edits = saved.edits;
  timeOfDay = saved.timeOfDay ?? timeOfDay;
  inventory.slots.forEach((s, i) => {
    const src = saved.inventory?.[i];
    if (src) { s.id = src.id; s.count = src.count; }
  });
  const p = saved.player;
  world.update(p.x, p.z, RENDER_DISTANCE, 16);
  player.respawn(p.x, p.y, p.z);
  player.health = p.health ?? player.maxHealth;
  player.yaw = p.yaw ?? 0;
  player.pitch = p.pitch ?? 0;
} else {
  respawn();
}

function persist() {
  saveGame(world, player, inventory, timeOfDay);
}

setInterval(persist, 30000);
window.addEventListener('beforeunload', persist);

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // The player does not move while the crafting panel is open.
  if (!crafting.isOpen()) player.update(dt);
  timeOfDay = updateDayNight(scene, sky, timeOfDay, dt, RENDER_DISTANCE);
  world.update(player.pos.x, player.pos.z, RENDER_DISTANCE, 2);
  drops.update(dt, player.pos, inventory);
  if (!crafting.isOpen()) {
    mobs.update(dt, player.pos, timeOfDay, (mob, damage) => {
      if (player.hurt(damage)) {
        const away = player.pos.clone().sub(mob.pos);
        player.vel.x += away.x * 4;
        player.vel.z += away.z * 4;
      }
    });
  }
  player.tickHealth(dt);

  camera.position.copy(player.eye);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  const hit = targetHit();
  hud.update({
    inventory,
    hotbarItems: null,
    target: hit ? BLOCK_DEFS[hit.id]?.name : null,
    health: player.health,
    maxHealth: player.maxHealth,
    flying: player.flying,
    timeOfDay,
    pos: player.pos,
    chunks: world.chunks.size,
  });

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
