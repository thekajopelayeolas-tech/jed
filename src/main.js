import * as THREE from 'three';
import { BLOCK, BLOCK_DEFS, isItem } from './blocks.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { RENDER_DISTANCE, REACH, SEA_LEVEL, CHUNK_HEIGHT } from './constants.js';
import { createHud } from './hud.js';
import { setupInput } from './input.js';
import { updateDayNight, createSky } from './sky.js';
import { DropManager } from './drops.js';
import { createInventoryUI } from './inventory-ui.js';
import { createFurnaceUI } from './furnace-ui.js';
import { createRecipeBookUI } from './recipe-book-ui.js';
import { Furnace, emptyFurnaceInto } from './smelting.js';
import { PARTS, armourInfo } from './armour.js';
import { MobManager } from './mobs.js';
import { saveGame, loadGame } from './save.js';
import { createAtlasTexture } from './textures.js';
import { breakTime, canHarvest, attackDamage } from './mining.js';
import { createSleep } from './sleep.js';
import { foodPoints } from './hunger.js';

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
const drops = new DropManager(scene, world, opaqueMat);
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
// Coal and iron ore drop the item they are mined into, so the furnace and crafting use real materials.
const DROP_FOR = {
  [BLOCK.GRASS]: BLOCK.DIRT,
  [BLOCK.STONE]: BLOCK.COBBLESTONE,
  [BLOCK.COAL_ORE]: BLOCK.COAL,
  [BLOCK.DIAMOND_ORE]: BLOCK.DIAMOND,
  [BLOCK.RAINBOW_ORE]: BLOCK.RAINBOW_GEM,
};

// Left click: hit a mob in front of the player with the held weapon. Otherwise start mining the block.
// A click on a mob does not start mining. Mining runs in the frame loop while the button is held.
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
    const dmg = attackDamage(inventory.selectedItem.id);
    mob.takeHit(dmg, player.pos.x, player.pos.z);
    if (mob.dead) drops.spawn(mob.def.drop, mob.pos.x, mob.pos.y, mob.pos.z);
    return;
  }
  mining.start();
}

// Breaks the block at the given cell. The drop only appears if the held tool can harvest it.
function finishBreak(hit) {
  const held = inventory.selectedItem.id;
  const drop = canHarvest(hit.id, held);
  const { x, y, z } = hit.block;
  if (world.setBlock(x, y, z, BLOCK.AIR)) {
    if (drop) drops.spawn(DROP_FOR[hit.id] ?? hit.id, x, y, z);
    // A furnace also gives back everything it held, so breaking it never loses items.
    if (hit.id === BLOCK.FURNACE) {
      const key = furnaceKey(x, y, z);
      const f = furnaces.get(key);
      if (f) {
        dropFurnaceContents(f, x, y, z);
        furnaces.delete(key);
      }
    }
  }
}

// Spawns one drop for each item the furnace held, so they scatter and can be picked up.
function dropFurnaceContents(f, x, y, z) {
  emptyFurnaceInto(f, (id, dx, dy, dz) => drops.spawn(id, dx, dy, dz), x, y, z);
}

// Hold-to-mine state. Progress is in seconds and resets when the target changes or the button is released.
const mining = {
  pressed: false,
  target: null,
  progress: 0,
  start() {
    this.pressed = true;
  },
  stop() {
    this.pressed = false;
    this.target = null;
    this.progress = 0;
  },
  // Called every frame. Advances progress on the block in front of the player.
  update(dt) {
    if (!this.pressed) return;
    const hit = targetHit();
    if (!hit) { this.target = null; this.progress = 0; return; }
    const key = `${hit.block.x},${hit.block.y},${hit.block.z}`;
    if (this.target !== key) {
      this.target = key;
      this.progress = 0;
    }
    const need = breakTime(hit.id, inventory.selectedItem.id);
    if (!Number.isFinite(need)) return;
    this.progress += dt;
    if (this.progress >= need) {
      finishBreak(hit);
      this.target = null;
      this.progress = 0;
    }
  },
  // Fraction 0..1 for the crack overlay on the HUD.
  fraction() {
    if (!this.target) return 0;
    const hit = targetHit();
    if (!hit) return 0;
    const need = breakTime(hit.id, inventory.selectedItem.id);
    return Number.isFinite(need) ? Math.min(1, this.progress / need) : 0;
  },
};

// Furnaces keep their contents per block position. Each one is created when first opened.
const furnaces = new Map();
const furnaceKey = (x, y, z) => `${x},${y},${z}`;

function furnaceAt(x, y, z) {
  const key = furnaceKey(x, y, z);
  if (!furnaces.has(key)) furnaces.set(key, new Furnace());
  return furnaces.get(key);
}

// Right click: sleep if the target is a bed, open a furnace, eat if the held item is food, otherwise place the held block.
function useOrPlace() {
  const hit = targetHit();
  if (hit && hit.id === BLOCK.BED) {
    if (!sleep.start(timeOfDay)) showMessage('You can only sleep at night.');
    return;
  }
  if (hit && hit.id === BLOCK.FURNACE) {
    const { x, y, z } = hit.block;
    // Only one panel at a time: close the crafting panel before opening the furnace.
    if (crafting.isOpen()) crafting.toggle();
    furnaceUI.open(furnaceAt(x, y, z));
    document.exitPointerLock();
    return;
  }
  if (eat()) return;
  placeBlock();
}

// Brief on-screen message used for sleep feedback.
let messageUntil = 0;
let messageText = '';
function showMessage(text, seconds = 2.5) {
  messageText = text;
  messageUntil = performance.now() + seconds * 1000;
}

// Eats one of the held food item. Returns true if something was eaten.
function eat() {
  const item = inventory.selectedItem;
  const points = foodPoints(item.id);
  if (points === 0 || item.count <= 0) return false;
  if (player.hunger.value >= player.hunger.max) {
    showMessage('You are full.');
    return true;
  }
  player.hunger.eat(points);
  inventory.consumeSelected(1);
  return true;
}

function placeBlock() {
  const hit = targetHit();
  if (!hit) return;
  const item = inventory.selectedItem;
  if (item.id === BLOCK.AIR || item.count <= 0) return;
  // Items such as sticks, food, and tools have no block texture, so they cannot be placed in the world.
  if (isItem(item.id)) return;
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

const sleep = createSleep();
const crafting = createInventoryUI(inventory, player);
const furnaceUI = createFurnaceUI(inventory);
const recipeBook = createRecipeBookUI(inventory);

// True while any inventory-style panel is open. Movement and mining pause while one is open.
const anyPanelOpen = () => crafting.isOpen() || furnaceUI.isOpen() || recipeBook.isOpen();

// Closes whichever panel is open and grabs the mouse back for play. Returns true if a panel was closed.
function closeAnyPanel() {
  if (furnaceUI.isOpen()) furnaceUI.close();
  else if (recipeBook.isOpen()) recipeBook.close();
  else if (crafting.isOpen()) crafting.toggle();
  else return false;
  renderer.domElement.requestPointerLock();
  return true;
}

setupInput(renderer.domElement, player, inventory, {
  onBreak: attack,
  onRelease: () => mining.stop(),
  onPlace: useOrPlace,
  onRespawn: respawn,
  onPauseChange: (paused) => hud.setPaused(paused && !anyPanelOpen()),
  onToggleCrafting: () => {
    // E closes whichever panel is open. Otherwise it opens the crafting panel.
    if (closeAnyPanel()) return;
    // Opening the panel frees the mouse. Closing it grabs the mouse again.
    if (crafting.toggle()) document.exitPointerLock();
    else renderer.domElement.requestPointerLock();
  },
  onToggleRecipeBook: () => {
    // B closes whichever panel is open. Otherwise it opens the recipe book.
    if (closeAnyPanel()) return;
    recipeBook.toggle();
    document.exitPointerLock();
  },
  isUIOpen: () => anyPanelOpen(),
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
  player.hunger.value = Math.max(0, Math.min(player.hunger.max, Math.floor(p.hunger ?? player.hunger.max)));
  player.yaw = p.yaw ?? 0;
  player.pitch = p.pitch ?? 0;
  for (const [key, data] of Object.entries(saved.furnaces ?? {})) furnaces.set(key, Furnace.fromJSON(data));
  // Old saves have no armour. Only accept ids that are real armour pieces.
  if (saved.armour) {
    for (const part of PARTS) {
      const id = saved.armour[part];
      if (armourInfo(id)?.part === part) player.armour[part] = id;
    }
  }
} else {
  respawn();
}

function persist() {
  saveGame(world, player, inventory, timeOfDay, furnaces);
}

setInterval(persist, 30000);
window.addEventListener('beforeunload', persist);

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // The player does not move while a panel is open or while asleep.
  if (!anyPanelOpen() && !sleep.isSleeping()) player.update(dt);
  // Every furnace in the world keeps smelting, even with its panel closed.
  for (const f of furnaces.values()) f.update(dt);
  furnaceUI.refresh();
  recipeBook.refresh();
  // While asleep, time stands still until the sleep timer ends. Then it jumps to sunrise.
  const wakeTime = sleep.update(dt, timeOfDay);
  if (wakeTime !== null) {
    timeOfDay = wakeTime;
    showMessage('Good morning!');
  }
  if (!sleep.isSleeping()) {
    timeOfDay = updateDayNight(scene, sky, timeOfDay, dt, RENDER_DISTANCE);
  } else {
    updateDayNight(scene, sky, timeOfDay, 0, RENDER_DISTANCE);
  }
  world.update(player.pos.x, player.pos.z, RENDER_DISTANCE, 2);
  drops.update(dt, player.pos, inventory);
  if (!anyPanelOpen()) mining.update(dt);
  if (!anyPanelOpen()) {
    mobs.update(dt, player.pos, timeOfDay, (mob, damage) => {
      if (player.hurt(damage)) {
        const away = player.pos.clone().sub(mob.pos);
        player.vel.x += away.x * 4;
        player.vel.z += away.z * 4;
      }
    });
  }
  player.tickHealth(dt);
  if (!sleep.isSleeping()) player.hunger.update(dt, player.isSprinting());

  camera.position.copy(player.eye);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  const hit = targetHit();
  hud.update({
    inventory,
    target: hit ? BLOCK_DEFS[hit.id]?.name : null,
    health: player.health,
    maxHealth: player.maxHealth,
    hunger: player.hunger.value,
    timeOfDay,
    pos: player.pos,
    chunks: world.chunks.size,
  });

  // Sleep and message feedback. Sleep text takes priority over timed messages.
  if (sleep.isSleeping()) {
    hud.setStatus(`Sleeping through the night… ${Math.round(sleep.progress() * 100)}%`);
  } else if (performance.now() < messageUntil) {
    hud.setStatus(messageText);
  } else {
    hud.setStatus('');
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
