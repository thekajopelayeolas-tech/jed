import * as THREE from 'three';
import { BLOCK, BLOCK_DEFS, isItem, isSolid } from './blocks.js';
import { DOOR, STORAGE, FURNACE_STATE, BED_FOOT } from './building.js';
import { facingToward } from './facing.js';
import { BOAT_ID, BOAT_TURN_RATE, boatSpotAt, nextBoatPosition } from './boat.js';
import { useBucket } from './utilities.js';
import { waterMerge, flowFrom, removeSourceFlow } from './water.js';
// The flowing water each poured source made, keyed by the source cell. Taking a source clears its own flow.
const sourceFlow = new Map();
const sourceKey = (x, y, z) => `${x},${y},${z}`;
function takeSourceFlow(x, y, z) {
  const key = sourceKey(x, y, z);
  const made = sourceFlow.get(key);
  if (made) removeSourceFlow(world, made);
  sourceFlow.delete(key);
}
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory, HOTBAR_SIZE } from './inventory.js';
import { RENDER_DISTANCE, REACH, SEA_LEVEL, CHUNK_HEIGHT, CHUNK_SIZE } from './constants.js';
import { createHud } from './hud.js';
import { setupInput } from './input.js';
import { updateDayNight, createSky } from './sky.js';
import { DropManager, blockGeometry } from './drops.js';
import { createInventoryUI } from './inventory-ui.js';
import { createFurnaceUI } from './furnace-ui.js';
import { createRecipeBookUI } from './recipe-book-ui.js';
import { createHeldView } from './held-view.js';
import { itemTexture } from './item-icons.js';
import { Furnace, emptyFurnaceInto } from './smelting.js';
import { Chest, emptyChestInto } from './chest.js';
import { createChestUI } from './chest-ui.js';
import { PARTS, armourInfo, defencePoints } from './armour.js';
import { MobManager, MOB } from './mobs.js';
import { saveGame, loadGame } from './save.js';
import { createAtlasTexture } from './textures.js';
import { breakTime, canHarvest, attackDamage } from './mining.js';
import { drawAmount, arrowDamage, damageThroughShield, ARROW_SPEED, ARROW_LIFETIME } from './combat.js';
import { bodyInLava, lavaStep } from './lava.js';
// The lava timer the frame loop keeps: it counts down while the player stands in lava.
const lavaState = { timer: 0 };
import { blastDamage, pearlLanding, PEARL_SPEED, PEARL_LIFETIME } from './hostile.js';
import { createSleep, sleepPose } from './sleep.js';
import { foodPoints } from './hunger.js';
import { spotBesideBed } from './bed-spawn.js';
import { createMultiplayer } from './multiplayer.js';
import { createLobbyUI } from './lobby-ui.js';
import { buildPlayerModel } from './character-model.js';

const SEED = 1337;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
// Shadows from the sun, and a filmic tone curve so bright sky and sunlit faces don't clip to flat white.
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
// The camera is in the scene so the held item, which is attached to it, is drawn.
scene.add(camera);
const sky = createSky(scene);

const atlas = createAtlasTexture(THREE);
const opaqueMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5 });
const transMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });

const world = new World(scene, SEED, opaqueMat, transMat);
const player = new Player(world, 8, 80, 8);
const inventory = new Inventory();
const hud = createHud();
const drops = new DropManager(scene, world, opaqueMat);
// The first-person held item. Sprites for non-block items come from the same textures as the drops.
// Held blocks use the world's atlas material and the same cube geometry as drops, so they look the same as placed blocks.
const heldView = createHeldView(camera, (id) => itemTexture(THREE, id), opaqueMat, blockGeometry);
const mobs = new MobManager(scene, world, SEED);

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

// The bed the player last slept in, which is where they respawn. Null means the default spawn point.
let spawnBed = null;

function respawn() {
  // Respawning ends any sleep, so the player is never left asleep at spawn.
  sleep.stop();
  sleepBed = null;
  // If the player has a bed, respawn beside it. If the bed was broken or is blocked, use the default spawn.
  if (spawnBed) {
    world.update(spawnBed.x, spawnBed.z, 2, 16);
    const spot = spotBesideBed(spawnBed, (x, y, z) => world.getBlock(x, y, z));
    if (spot) {
      player.respawn(spot.x + 0.5, spot.y, spot.z + 0.5);
      return;
    }
  }
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
  // An open door drops a closed door, so breaking it never leaves an open door in the inventory.
  [DOOR.OPEN_DOOR]: DOOR.DOOR,
  // A lit furnace drops a furnace, not its lit state.
  [FURNACE_STATE.LIT]: BLOCK.FURNACE,
};

// Left click: hit a mob in front of the player with the held weapon. Otherwise start mining the block.
// A click on a mob does not start mining. Mining runs in the frame loop while the button is held.
// The placed boat the player is aiming at, within reach, or null. One rule for boarding and picking up.
function boatAimedAt() {
  const eye = player.eye;
  const dir = player.lookDir();
  return boats.find((b) => {
    const to = { x: b.x - eye.x, y: b.y - eye.y, z: b.z - eye.z };
    const along = to.x * dir.x + to.y * dir.y + to.z * dir.z;
    if (along < 0 || along > REACH) return false;
    const px = eye.x + dir.x * along - b.x;
    const pz = eye.z + dir.z * along - b.z;
    return Math.hypot(px, pz) < 0.9;
  }) ?? null;
}

// Left-click on a placed boat picks it up, so a boat is never lost. If you are riding it, you get off first.
function pickUpBoatAimed() {
  const aimed = boatAimedAt();
  if (!aimed) return false;
  if (rideBoat === aimed) rideBoat = null;
  boats.splice(boats.indexOf(aimed), 1);
  inventory.add(BOAT_ID, 1);
  return true;
}

function attack() {
  if (pickUpBoatAimed()) return;
  const eye = player.eye;
  const dir = player.lookDir();
  const blockHit = targetHit();
  // Only mobs closer than the block in front of the player can be hit.
  const blockDist = blockHit
    ? eye.distanceTo(new THREE.Vector3(blockHit.block.x + 0.5, blockHit.block.y + 0.5, blockHit.block.z + 0.5))
    : REACH;
  const mob = mobs.raycastMob(eye, dir, blockDist);
  if (mob) {
    // Shears never kill a sheep: they are for shearing with right-click, so a hit does nothing extra.
    if (inventory.selectedItem.id === BLOCK.SHEARS && mob.type === MOB.SHEEP) return;
    const dmg = attackDamage(inventory.selectedItem.id);
    // Hitting a villager angers its village's iron golem.
    mobs.angerGolemsOf(mob);
    // Any tamed wolf takes the player's target, so it attacks the same mob until it dies.
    for (const w of mobs.mobs) if (w.tamed && w !== mob) w.wolfTarget = mob;
    mob.takeHit(dmg, player.pos.x, player.pos.z);
    if (mob.dead) for (const id of mob.def.drops) drops.spawn(id, mob.pos.x, mob.pos.y, mob.pos.z);
    return;
  }
  mining.start();
}

// Breaks the block at the given cell. The drop only appears if the held tool can harvest it.
function finishBreak(hit) {
  const held = inventory.selectedItem.id;
  const drop = canHarvest(hit.id, held);
  const { x, y, z } = hit.block;
  // Two-part blocks (doors, beds) clear both halves, so breaking either one removes the whole block.
  const cleared = world.breakWhole(x, y, z);
  if (cleared.length > 0) {
    // One item per block, not one per cell, so a two-part block still gives a single door or bed.
    // Breaking the bed's foot gives back a bed, the same as breaking its head.
    if (drop) drops.spawn(DROP_FOR[hit.id] ?? (hit.id === BED_FOOT ? BLOCK.BED : hit.id), x, y, z);
    // A furnace also gives back everything it held, so breaking it never loses items.
    if (hit.id === BLOCK.FURNACE || hit.id === FURNACE_STATE.LIT) {
      const key = furnaceKey(x, y, z);
      const f = furnaces.get(key);
      if (f) {
        dropFurnaceContents(f, x, y, z);
        furnaces.delete(key);
      }
    }
    // A chest gives back everything stored in it, so breaking it never loses items.
    if (hit.id === STORAGE.CHEST) {
      const key = furnaceKey(x, y, z);
      const c = chests.get(key);
      if (c) {
        emptyChestInto(c, (id, dx, dy, dz) => drops.spawn(id, dx, dy, dz), x, y, z);
        chests.delete(key);
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
      // One break per press: holding the button does not carry on into the next block. Press again to mine it.
      this.pressed = false;
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

// A label for the crack overlay: how hard the block is to mine with the held item.
// Easy blocks break in under a second, medium blocks in a few, and hard blocks take longer.
function crackLabel(hit, seconds) {
  if (!hit || !Number.isFinite(seconds)) return '';
  if (seconds < 1) return 'easy';
  if (seconds < 3) return 'medium';
  return 'hard';
}

// Furnaces keep their contents per block position. Each one is created when first opened.
const furnaces = new Map();
const furnaceKey = (x, y, z) => `${x},${y},${z}`;
// Chests keep their contents per block position, the same way. Each one is created when first opened.
const chests = new Map();

function chestAt(x, y, z) {
  const key = furnaceKey(x, y, z);
  if (!chests.has(key)) chests.set(key, new Chest());
  return chests.get(key);
}

// Switches the furnace block at a stored position between unlit and lit, so its fire shows in the world.
// The key is "x,y,z". Only the block changes. Its contents stay in the furnaces map.
function setFurnaceLit(key, lit) {
  const [x, y, z] = key.split(',').map(Number);
  const id = world.getBlock(x, y, z);
  // Keep the furnace's facing when it lights or goes out, so its front stays where it was placed.
  const facing = world.chunkAt(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE))?.getFacing(
    ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE, y, ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE) ?? 0;
  if (lit && id === BLOCK.FURNACE) world.setBlock(x, y, z, FURNACE_STATE.LIT, facing);
  else if (!lit && id === FURNACE_STATE.LIT) world.setBlock(x, y, z, BLOCK.FURNACE, facing);
}

function furnaceAt(x, y, z) {
  const key = furnaceKey(x, y, z);
  if (!furnaces.has(key)) furnaces.set(key, new Furnace());
  return furnaces.get(key);
}

// Right click: sleep if the target is a bed, open a furnace, eat if the held item is food, otherwise place the held block.
// Right-click a sheep while holding shears: take 2 wool, and the sheep lives on. Returns true if a sheep was sheared.
// Right-click a wild wolf while holding a bone: it is tamed, and the bone is used up. Returns true if the click was used.
function tameAimedWolf() {
  if (inventory.selectedItem.id !== BLOCK.BONE) return false;
  const eye = player.eye;
  const dir = player.lookDir();
  const blockHit = targetHit();
  const blockDist = blockHit
    ? eye.distanceTo(new THREE.Vector3(blockHit.block.x + 0.5, blockHit.block.y + 0.5, blockHit.block.z + 0.5))
    : REACH;
  const mob = mobs.raycastMob(eye, dir, blockDist);
  if (!mob || mob.type !== 'wolf') return false;
  if (mob.tamed) {
    showMessage('This wolf is already tamed.');
    return true;
  }
  if (mob.tame()) {
    inventory.consumeSelected(1);
    showMessage('The wolf is tamed!');
  }
  return true;
}

function shearAimedSheep() {
  if (inventory.selectedItem.id !== BLOCK.SHEARS) return false;
  const eye = player.eye;
  const dir = player.lookDir();
  const blockHit = targetHit();
  const blockDist = blockHit
    ? eye.distanceTo(new THREE.Vector3(blockHit.block.x + 0.5, blockHit.block.y + 0.5, blockHit.block.z + 0.5))
    : REACH;
  const mob = mobs.raycastMob(eye, dir, blockDist);
  if (!mob || mob.type !== MOB.SHEEP) return false;
  const wool = mob.shear();
  if (wool === 0) {
    showMessage('This sheep is already sheared.');
    return true;
  }
  for (let i = 0; i < wool; i++) drops.spawn(BLOCK.WOOL, mob.pos.x, mob.pos.y, mob.pos.z);
  return true;
}

// Buckets. Returns true if the click was used by one of them.
function useUtility() {
  const held = inventory.selectedItem.id;
  const hit = targetHit();
  if (held === BLOCK.BUCKET || held === BLOCK.WATER_BUCKET) {
    // An empty bucket looks for water in front of the player, even though normal targeting skips water.
    const waterHit = world.raycast(player.eye, player.lookDir(), REACH, true);
    if (held === BLOCK.BUCKET && waterHit && waterHit.id === BLOCK.WATER) {
      // Filling takes the source out of the world, and the bucket becomes a water bucket.
      const { x, y, z } = waterHit.block;
      const r = useBucket(world, held, x, y, z, null);
      if (r) {
        inventory.consumeSelected(1);
        inventory.add(BLOCK.WATER_BUCKET, 1);
        // Taking the source also takes the flow it fed, so no water is left hanging with nothing behind it.
        takeSourceFlow(x, y, z);
      }
      return true;
    }
    if (held === BLOCK.WATER_BUCKET && hit) {
      const r = useBucket(world, held, 0, 0, 0, hit.place);
      if (r) {
        inventory.consumeSelected(1);
        inventory.add(BLOCK.BUCKET, 1);
        // The poured block stays full water a bucket can take. Water that flows out of it is slabs, which it cannot.
        // Remember the flow this source made, so taking the source later clears exactly that flow.
        sourceFlow.set(sourceKey(hit.place.x, hit.place.y, hit.place.z), flowFrom(world, hit.place.x, hit.place.y, hit.place.z));
        // If the poured water touches enough full water on its level, those pieces merge into a full block.
        waterMerge(world, hit.place.x, hit.place.y, hit.place.z);
      } else {
        showMessage('No room to pour the water here.');
      }
      return true;
    }
    return false;
  }
  return false;
}

// Combat state. The shield is up while the right button is held with a shield in hand. The bow draws while the
// right button is held with a bow, and fires when it is released. Arrows fly and live in `arrows`.
const combat = { shieldUp: false, drawing: false, drawTime: 0 };
const arrows = [];
// Arrows fired by hunters. They fly at the player, and hurt them on a hit (the shield can block them).
const mobArrows = [];

// Each hunter bullet is drawn as a small bright cube, so the shot can be seen travelling at the player.
const bulletGeo = new THREE.BoxGeometry(0.12, 0.12, 0.3);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
function removeBullet(a) {
  if (a.mesh) scene.remove(a.mesh);
}

// Moves hunter arrows, and hurts the player when one reaches them. Removed on a hit, a block, or when they run out.
function updateMobArrows(dt) {
  for (let i = mobArrows.length - 1; i >= 0; i--) {
    const a = mobArrows[i];
    a.life -= dt;
    a.pos.add(a.vel.clone().multiplyScalar(dt));
    if (!a.mesh) {
      a.mesh = new THREE.Mesh(bulletGeo, bulletMat);
      scene.add(a.mesh);
    }
    a.mesh.position.copy(a.pos);
    a.mesh.lookAt(a.pos.clone().add(a.vel));
    const toPlayer = a.pos.distanceTo(new THREE.Vector3(player.pos.x, player.pos.y + 1.0, player.pos.z));
    if (toPlayer < 0.8) {
      // The shield blocks an arrow only when it comes from the front, the same as a melee hit.
      const lookX = -Math.sin(player.yaw);
      const lookZ = -Math.cos(player.yaw);
      const facing = (a.pos.x - player.pos.x) * lookX + (a.pos.z - player.pos.z) * lookZ > 0;
      const taken = damageThroughShield(a.damage, combat.shieldUp && inventory.hasOffhandShield(), facing);
      if (taken > 0) player.hurt(taken);
      removeBullet(a);
      mobArrows.splice(i, 1);
      continue;
    }
    const blockId = world.getBlock(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z));
    if ((blockId !== BLOCK.AIR && blockId !== BLOCK.WATER) || a.life <= 0) {
      removeBullet(a);
      mobArrows.splice(i, 1);
    }
  }
}

// Right-click press with a bow or shield held. Returns true if the click was used.
// Throws an ender pearl: it flies along the look direction and, where it lands, the player is teleported there.
// Only one pearl is in flight at a time, so a second throw is ignored until the first has landed.
let pearlInFlight = null;
function throwPearl() {
  if (pearlInFlight || inventory.countOf(BLOCK.ENDER_PEARL) <= 0) return false;
  inventory.remove(BLOCK.ENDER_PEARL, 1);
  const dir = player.lookDir();
  const from = player.eye;
  // The landing spot is worked out now, from the world, so the teleport goes exactly where the pearl stops.
  const landing = pearlLanding(from, dir, (x, y, z) => isSolid(world.getBlock(x, y, z)));
  pearlInFlight = { pos: from.clone(), vel: dir.clone().multiplyScalar(PEARL_SPEED), life: PEARL_LIFETIME, landing };
  return true;
}

// Each frame, the pearl flies out, and when its time is up (or it hits a block) the player is moved to where it landed.
function updatePearl(dt) {
  if (!pearlInFlight) return;
  pearlInFlight.life -= dt;
  pearlInFlight.pos.add(pearlInFlight.vel.clone().multiplyScalar(dt));
  if (pearlInFlight.life <= 0) {
    if (pearlInFlight.landing) {
      player.pos.set(pearlInFlight.landing.x, pearlInFlight.landing.y, pearlInFlight.landing.z);
      player.vel.set(0, 0, 0);
      showMessage('Teleported!');
    }
    pearlInFlight = null;
  }
}

function combatPress() {
  // Holding an ender pearl throws it on right-click.
  if (inventory.selectedItem.id === BLOCK.ENDER_PEARL && throwPearl()) return true;
  const held = inventory.selectedItem.id;
  // The shield is raised with Shift (see updateShield), not right-click, so right-click does nothing for it here.
  if (inventory.hasOffhandShield() && held !== BLOCK.BOW) return false;
  if (held === BLOCK.BOW && inventory.countOf(BLOCK.ARROW) > 0) {
    combat.drawing = true;
    combat.drawTime = 0;
    return true;
  }
  return false;
}

// The shield is raised while Shift is held and lowered when it is released. Sprinting still uses Shift for movement.
function updateShield() {
  combat.shieldUp = !!(player.keys.ShiftLeft || player.keys.ShiftRight) && inventory.hasOffhandShield();
}

// Right-click release: fire the bow at the draw it reached.
function combatRelease() {
  if (!combat.drawing) return;
  combat.drawing = false;
  if (inventory.countOf(BLOCK.ARROW) <= 0) return;
  const eye = player.eye;
  const dir = player.lookDir();
  // The arrow starts a little in front of the eye, so it does not hit the player.
  const start = eye.clone().add(dir.clone().multiplyScalar(0.8));
  arrows.push({
    pos: start,
    vel: dir.clone().multiplyScalar(ARROW_SPEED),
    damage: arrowDamage(drawAmount(combat.drawTime)),
    life: ARROW_LIFETIME,
  });
  inventory.remove(BLOCK.ARROW, 1);
}

// Each frame: a bow being drawn builds up draw time, and each arrow flies, hits the first mob or block it meets,
// and is removed when it lands or runs out of life.
function updateCombat(dt) {
  // Switching away from the bow while the button is held cancels the draw. The shield stays up in the off-hand.
  const held = inventory.selectedItem.id;
  updateShield();
  if (held !== BLOCK.BOW) combat.drawing = false;
  if (combat.drawing) combat.drawTime += dt;
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.life -= dt;
    const step = a.vel.clone().multiplyScalar(dt);
    const next = a.pos.clone().add(step);
    const hitMob = mobs.raycastMob(a.pos, step.clone().normalize(), step.length());
    if (hitMob && !hitMob.dead) {
      hitMob.takeHit(a.damage, a.pos.x, a.pos.z);
      if (hitMob.dead) for (const id of hitMob.def.drops) drops.spawn(id, hitMob.pos.x, hitMob.pos.y, hitMob.pos.z);
      arrows.splice(i, 1);
      continue;
    }
    const blockId = world.getBlock(Math.floor(next.x), Math.floor(next.y), Math.floor(next.z));
    if (blockId !== BLOCK.AIR && blockId !== BLOCK.WATER) {
      drops.spawn(BLOCK.ARROW, next.x - 0.5, next.y - 0.5, next.z - 0.5);
      arrows.splice(i, 1);
      continue;
    }
    a.pos = next;
    if (a.life <= 0) arrows.splice(i, 1);
  }
}

function useOrPlace() {
  // Shears on a sheep take its wool. Otherwise the held item acts as usual.
  if (shearAimedSheep()) return;
  if (tameAimedWolf()) return;
  if (combatPress()) return;
  if (useUtility()) return;
  const hit = targetHit();
  // Holding a boat: right-click on water places it. Right-click on a placed boat gets in it.
  if (inventory.selectedItem.id === BOAT_ID && inventory.selectedItem.count > 0) {
    if (hit && placeBoat(hit)) return;
    if (hit) showMessage('No room for a boat here.');
    return;
  }
  if (rideBoat === null) {
    const aimed = boatAimedAt();
    if (aimed) {
      rideBoat = aimed;
      return;
    }
  }
  // Either half of a bed starts sleep, so you can sleep from the head or the foot.
  if (hit && (hit.id === BLOCK.BED || hit.id === BED_FOOT)) {
    if (sleep.start(timeOfDay)) {
      // Remember the bed and put the player on it, so the sleeping view lies on the mattress.
      sleepBed = { x: hit.block.x, y: hit.block.y, z: hit.block.z, facing: world.facingAt(hit.block.x, hit.block.y, hit.block.z) };
      // Sleeping in a bed sets it as the respawn point, so death brings the player back here.
      spawnBed = { x: hit.block.x, y: hit.block.y, z: hit.block.z };
      // The feet stand on the top of the bed, so the body is not inside the block.
      player.pos.set(hit.block.x + 0.5, hit.block.y + 1, hit.block.z + 0.5);
      player.vel.set(0, 0, 0);
    } else {
      showMessage('You can only sleep at night.');
    }
    return;
  }
  // A door swaps between closed and open. Opening it lets you through, and closing it blocks you again.
  if (hit && (hit.id === DOOR.DOOR || hit.id === DOOR.OPEN_DOOR)) {
    const { x, y, z } = hit.block;
    // The door keeps its facing when it opens or closes, so it still turns the same way.
    // Both halves change together, so the whole door opens or closes at once.
    const facing = world.facingAt(x, y, z);
    const next = hit.id === DOOR.DOOR ? DOOR.OPEN_DOOR : DOOR.DOOR;
    // Find the lower half: if a door is directly below the hit cell, the hit cell is the upper half.
    // Then toggle both halves, from either side.
    const lowerY = world.getBlock(x, y - 1, z) === hit.id ? y - 1 : y;
    const upperY = lowerY + 1;
    world.setBlock(x, lowerY, z, next, facing);
    world.setBlock(x, upperY, z, next, facing);
    return;
  }
  // A chest opens its storage panel. Only one panel at a time, so the others are closed first.
  if (hit && hit.id === STORAGE.CHEST) {
    const { x, y, z } = hit.block;
    if (crafting.isOpen()) crafting.toggle();
    if (furnaceUI.isOpen()) furnaceUI.close();
    chestUI.open(chestAt(x, y, z));
    document.exitPointerLock();
    return;
  }
  if (hit && (hit.id === BLOCK.FURNACE || hit.id === FURNACE_STATE.LIT)) {
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

// The boat the player is riding, or null. A placed boat is a water cell and a yaw. While riding, the player
// rides on it and steers it, and it stays on the water.
let rideBoat = null;
// Boats placed in the world: each is { x, y, z, yaw }. Placed boats can be boarded with right-click.
const boats = [];

// Right-click with a boat held places one on the water in front of the player.
function placeBoat(hit) {
  // The boat goes in the cell in front of what the player aimed at, the same spot a block would use.
  // It can sit anywhere: on land, on a block, or on water (where it floats).
  const spot = boatSpotAt(world, hit.place.x, hit.place.y, hit.place.z);
  if (!spot) return false;
  boats.push({ x: spot.x + 0.5, y: spot.y, z: spot.z + 0.5, yaw: player.yaw });
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
  // The block faces the player who places it, so its front points back toward them.
  let facing = facingToward(x, z, player.pos.x, player.pos.z);
  // A bed's head must be the cell nearest the player, with its foot further away. The foot is placed along the
  // facing, so a bed faces away from the player (the foot lands behind the head, farther from them).
  if (item.id === BLOCK.BED) facing = (facing + 2) & 3;
  // Doors and beds take two cells. placeWhole writes both, or neither if the second cell is blocked.
  if (world.placeWhole(x, y, z, item.id, facing)) inventory.consumeSelected(1);
}

// Drops one of the held item onto the ground a little in front of the player. It is removed from the
// inventory first, so the same item is never in both places. The drop waits briefly before it can be picked up
// again, so the player does not grab it straight back.
function dropHeldItem() {
  const item = inventory.selectedItem;
  if (item.id === BLOCK.AIR || item.count <= 0) return false;
  // Copy the id before the slot is changed. The slot is the live object, so when this is the last item,
  // consuming it clears the slot to air, and reading the id afterwards would drop air instead of the item.
  const id = item.id;
  const look = player.lookDir();
  const x = Math.floor(player.pos.x + look.x * 1.5);
  const z = Math.floor(player.pos.z + look.z * 1.5);
  const y = Math.floor(player.pos.y);
  inventory.consumeSelected(1);
  // Locked until the player walks away, so the dropped item is not picked straight back up.
  drops.spawn(id, x, y, z).markDropped();
  return true;
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
// The bed the player is sleeping in, or null. Set when sleep starts, cleared when the player wakes.
let sleepBed = null;
const crafting = createInventoryUI(inventory, player, opaqueMat);
const furnaceUI = createFurnaceUI(inventory);
const chestUI = createChestUI(inventory);
const recipeBook = createRecipeBookUI(inventory);

// True while any inventory-style panel is open. Movement and mining pause while one is open.
const anyPanelOpen = () => crafting.isOpen() || furnaceUI.isOpen() || recipeBook.isOpen() || chestUI.isOpen();

// Closes whichever panel is open and grabs the mouse back for play. Returns true if a panel was closed.
function closeAnyPanel() {
  if (chestUI.isOpen()) chestUI.close();
  else if (furnaceUI.isOpen()) furnaceUI.close();
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
  onRightRelease: () => combatRelease(),
  onRespawn: respawn,
  onPauseChange: (paused) => hud.setPaused(paused && !anyPanelOpen()),
  onToggleCrafting: () => {
    // E closes whichever panel is open. Otherwise it opens the crafting panel.
    if (closeAnyPanel()) return;
    // Opening the panel frees the mouse. Closing it grabs the mouse again.
    if (crafting.toggle()) document.exitPointerLock();
    else renderer.domElement.requestPointerLock();
  },
  onTakeAll: () => {
    // F empties the open furnace into the inventory. It does nothing when no furnace is open.
    if (furnaceUI.isOpen()) furnaceUI.takeAll();
  },
  onDropSelected: () => {
    // Q drops one of the held item in front of the player. Nothing happens with an empty hand or a panel open.
    if (anyPanelOpen()) return;
    dropHeldItem();
  },
  onToggleRecipeBook: () => {
    // B closes whichever panel is open. Otherwise it opens the recipe book.
    if (closeAnyPanel()) return;
    recipeBook.toggle();
    document.exitPointerLock();
  },
  isUIOpen: () => anyPanelOpen(),
});

// Multiplayer. The lobby server runs on the host's computer. Set the address in the lobby panel or the page URL.
// The default is the same machine, which is useful for testing with two tabs.
const LOBBY_HOST = new URLSearchParams(location.search).get('server') || `${location.hostname || 'localhost'}:8787`;
// A page served over HTTPS may only talk to secure endpoints. Browsers block plain http:// and ws:// requests
// from it (mixed content). The local lobby server speaks plain HTTP, so on HTTPS it is not reachable from the page.
const SECURE_PAGE = location.protocol === 'https:';
const HTTP_SCHEME = SECURE_PAGE ? 'https' : 'http';
const WS_SCHEME = SECURE_PAGE ? 'wss' : 'ws';
const LOBBY_REACHABLE = !SECURE_PAGE || new URLSearchParams(location.search).has('secureLobby');
const mpUI = createLobbyUI({
  httpUrl: `${HTTP_SCHEME}://${LOBBY_HOST}`,
  reachable: LOBBY_REACHABLE,
  playerName: 'Player',
  onStatus: (text) => hud.setStatus(text),
  onTeleport: (id) => {
    // Move next to the chosen player, one block to the side so you don't stand inside them.
    const target = mp.player(id);
    if (!target) return;
    // Only the position changes. Health and hunger stay as they are.
    player.pos.set(target.x + 1, target.y, target.z);
    player.vel.set(0, 0, 0);
    showMessage(`Teleported to ${target.name}`);
  },
});
hud.mountLobby(mpUI.element);
const mp = createMultiplayer(`${WS_SCHEME}://${LOBBY_HOST}`, (msg) => {
  if (msg.type === 'joined') mpUI.setInLobby(true, msg.lobby);
  if (msg.type === 'closed' || msg.type === 'left') mpUI.renderPlayers();
  if (msg.type === 'players') mpUI.renderPlayers();
}, (text) => mpUI.setStatus(text), { blocked: !LOBBY_REACHABLE });
mpUI.attach(mp);

// Other players drawn as simple blocks, so they can be seen in the world.
// Each placed boat is drawn as a wooden hull (a flat box). Meshes are created once per boat and kept with it.
const boatMeshes = new Map();
const boatGeo = new THREE.BoxGeometry(0.9, 0.25, 0.5);
const boatMat = new THREE.MeshLambertMaterial({ color: 0x9c7a46 });
function syncBoats() {
  for (const b of boats) {
    let mesh = boatMeshes.get(b);
    if (!mesh) {
      mesh = new THREE.Mesh(boatGeo, boatMat);
      scene.add(mesh);
      boatMeshes.set(b, mesh);
    }
    mesh.position.set(b.x, b.y - 0.1, b.z);
    mesh.rotation.y = b.yaw;
  }
  // Drop the mesh of a boat that is no longer in the list (the rider left it or it was removed).
  for (const [b, mesh] of boatMeshes) {
    if (!boats.includes(b)) { scene.remove(mesh); boatMeshes.delete(b); }
  }
}

const remotes = new Map();
// Other players are drawn with the same blocky character as the local player, so you can see who is who.
// Each one is built once and kept, then moved to its last reported position. Feet sit at y, as for the player.
function syncRemotes() {
  const seen = new Set();
  for (const p of mp.others()) {
    seen.add(p.id);
    let model = remotes.get(p.id);
    if (!model) {
      model = buildPlayerModel();
      scene.add(model.group);
      remotes.set(p.id, model);
    }
    model.group.position.set(p.x, p.y, p.z);
    model.group.rotation.y = p.yaw;
  }
  for (const [id, model] of remotes) {
    if (!seen.has(id)) { scene.remove(model.group); remotes.delete(id); }
  }
}

// Clicking Respawn on the death screen puts the player back where they were (beside their bed, or the default
// spawn), with full health, and hides the screen. The mouse is grabbed again by the next click on the game.
// Seconds on the death screen before the player respawns on their own.
const AUTO_RESPAWN_SECONDS = 3;
// Counts down while the death screen is up. Set when the player dies.
let deathCountdown = 0;

// Puts the player back in the world and hides the death screen. Used by the timer and the Respawn button.
function respawnFromDeath() {
  respawn();
  hud.setDead(false);
  deathCountdown = 0;
  renderer.domElement.requestPointerLock();
}

hud.setDeathHandler(respawnFromDeath);

// Restore a saved game if one exists, otherwise start fresh at spawn.
const saved = loadGame();
let timeOfDay = 0.25;
if (saved) {
  world.edits = saved.edits;
  world.facingEdits = saved.facingEdits ?? new Map();
  timeOfDay = saved.timeOfDay ?? timeOfDay;
  spawnBed = saved.spawnBed ?? null;
  inventory.slots.forEach((s, i) => {
    const src = saved.inventory?.[i];
    if (src) { s.id = src.id; s.count = src.count; }
  });
  // The off-hand is only restored if it holds a shield. Older saves have none.
  if (saved.offhand?.id === BLOCK.SHIELD && saved.offhand.count > 0) {
    // The loaded save is the only source here, so the off-hand is restored only from it.
    inventory.offhand = { id: BLOCK.SHIELD, count: 1 };
  }
  const p = saved.player;
  world.update(p.x, p.z, RENDER_DISTANCE, 16);
  player.respawn(p.x, p.y, p.z);
  player.health = p.health ?? player.maxHealth;
  player.hunger.value = Math.max(0, Math.min(player.hunger.max, Math.floor(p.hunger ?? player.hunger.max)));
  player.yaw = p.yaw ?? 0;
  player.pitch = p.pitch ?? 0;
  for (const [key, data] of Object.entries(saved.furnaces ?? {})) furnaces.set(key, Furnace.fromJSON(data));
  for (const [key, data] of Object.entries(saved.chests ?? {})) chests.set(key, Chest.fromJSON(data));
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
  saveGame(world, player, inventory, timeOfDay, furnaces, chests, spawnBed);
}

setInterval(persist, 30000);
window.addEventListener('beforeunload', persist);

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // The player does not move while a panel is open or while asleep.
  // Riding a boat: the boat moves on the water, the player sits on it, and walking keys steer it.
  // Shift gets off. Otherwise the player moves normally on land.
  if (rideBoat) {
    if (player.isSprinting()) {
      rideBoat = null;
    } else {
      const forward = (player.keys.KeyW ? 1 : 0) - (player.keys.KeyS ? 1 : 0);
      if (player.keys.KeyA) player.yaw += BOAT_TURN_RATE * dt;
      if (player.keys.KeyD) player.yaw -= BOAT_TURN_RATE * dt;
      if (forward !== 0) {
        const next = nextBoatPosition(world, rideBoat, player.yaw, dt * forward);
        if (next) {
          rideBoat.x = next.x;
          rideBoat.z = next.z;
        }
      }
      rideBoat.yaw = player.yaw;
      // The rider sits on the boat, so the feet follow the boat's position.
      player.pos.set(rideBoat.x, rideBoat.y, rideBoat.z);
      player.vel.set(0, 0, 0);
    }
  } else if (!anyPanelOpen() && !sleep.isSleeping()) {
    player.update(dt);
  }
  // Standing in lava hurts on a timer. The damage goes through player.hurt, so armour and hunger still apply.
  if (!sleep.isSleeping() && !anyPanelOpen()) {
    const inLava = bodyInLava(world, player.pos, 0.3, 1.8);
    const lavaDmg = lavaStep(lavaState, inLava, dt);
    if (lavaDmg > 0) player.hurt(lavaDmg);
  }
  // Every furnace in the world keeps smelting, even with its panel closed.
  // Every furnace in the world keeps smelting. A furnace shows its fire in the world while it is smelting.
  for (const [key, f] of furnaces) {
    f.update(dt);
    setFurnaceLit(key, f.isSmelting());
  }
  furnaceUI.refresh();
  recipeBook.refresh();
  // While asleep, time stands still until the sleep timer ends. Then it jumps to sunrise.
  const wakeTime = sleep.update(dt, timeOfDay);
  if (wakeTime !== null) {
    timeOfDay = wakeTime;
    showMessage('Good morning!');
    // Getting up puts the player back beside the bed, standing, and clears the sleeping view.
    if (sleepBed) player.pos.set(sleepBed.x + 0.5, sleepBed.y + 1, sleepBed.z - 1.2);
    sleepBed = null;
  }
  // Moving while asleep gets the player up early. The key press is read from the held keys.
  if (sleep.isSleeping() && (player.keys.KeyW || player.keys.KeyA || player.keys.KeyS || player.keys.KeyD || player.keys.Space)) {
    sleep.stop();
    if (sleepBed) player.pos.set(sleepBed.x + 0.5, sleepBed.y + 1, sleepBed.z - 1.2);
    sleepBed = null;
    showMessage('You got up.');
  }
  if (!sleep.isSleeping()) {
    timeOfDay = updateDayNight(scene, sky, timeOfDay, dt, RENDER_DISTANCE);
  } else {
    updateDayNight(scene, sky, timeOfDay, 0, RENDER_DISTANCE);
  }
  world.update(player.pos.x, player.pos.z, RENDER_DISTANCE, 2);
  drops.update(dt, player.pos, inventory);
  updateCombat(dt);
  updatePearl(dt);
  if (!anyPanelOpen()) mining.update(dt);

  if (!anyPanelOpen()) {
    mobs.update(dt, player.pos, timeOfDay, (mob, damage) => {
      // The shield is between the player and the attacker when the attacker is in the direction the player faces.
      const toMob = mob.pos.clone().sub(player.pos);
      const lookX = -Math.sin(player.yaw);
      const lookZ = -Math.cos(player.yaw);
      const facingHit = toMob.x * lookX + toMob.z * lookZ > 0;
      // The shield blocks from the off-hand while the right button holds it up.
      const taken = damageThroughShield(damage, combat.shieldUp && inventory.hasOffhandShield(), facingHit);
      if (taken <= 0) return;
      if (player.hurt(taken)) {
        const away = player.pos.clone().sub(mob.pos);
        player.vel.x += away.x * 4;
        player.vel.z += away.z * 4;
      }
    }, [], false, player.lookDir(), (from, dir, damage) => {
      // A hunter's arrow: a projectile aimed at the player. It hurts the player when it reaches them.
      mobArrows.push({ pos: new THREE.Vector3(from.x, from.y, from.z), vel: new THREE.Vector3(dir.x, dir.y, dir.z).multiplyScalar(18), damage, life: 4 });
    });
    // A creeper that blew up hurts everything near it: the player takes the blast, and so do nearby mobs.
    for (const m of mobs.mobs) {
      if (!m.exploded || m.blasted) continue;
      m.blasted = true;
      const d = player.pos.distanceTo(m.pos);
      const dmg = blastDamage(d);
      if (dmg > 0 && player.hurt(dmg)) showMessage('Boom!');
      for (const other of mobs.mobs) {
        if (other === m || other.dead) continue;
        const od = other.pos.distanceTo(m.pos);
        const odmg = blastDamage(od);
        if (odmg > 0) other.takeHit(odmg, m.pos.x, m.pos.z);
      }
    }
    updateMobArrows(dt);
  }
  player.tickHealth(dt);
  if (!sleep.isSleeping()) player.hunger.update(dt, player.isSprinting());

  // No hearts left: show the death screen. The mouse is freed so the Respawn button can be clicked.
  if (player.health <= 0 && !hud.isDead()) {
    hud.setDead(true);
    deathCountdown = AUTO_RESPAWN_SECONDS;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  // Dead: count down, then respawn automatically. The Respawn button does the same thing straight away.
  if (hud.isDead()) {
    deathCountdown -= dt;
    hud.setDeathCountdown(Math.max(0, Math.ceil(deathCountdown)));
    if (deathCountdown <= 0) respawnFromDeath();
  }

  // Send this player's position to the lobby, and draw the others.
  if (mp.lobby) mp.sendMove(player);
  syncRemotes();
  syncBoats();

  // Asleep, the view lowers to the mattress and tilts onto its side. Awake, it is the usual eye height and level.
  const lying = sleepPose(sleep.isSleeping() ? sleep.progress() : 0);
  camera.position.copy(player.eye);
  // The sky dome follows the camera, so it always surrounds the view.
  sky.dome.position.copy(camera.position);
  camera.position.y -= lying.drop;
  // A shield goes to the off-hand automatically: any shield in the hotbar moves there, and the left hand carries it.
  // The shield rises while the right button holds it up to block.
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    if (inventory.slots[i].id === BLOCK.SHIELD) inventory.equipOffhand(i);
  }
  heldView.update(dt, Math.hypot(player.vel.x, player.vel.z), inventory.selectedItem, inventory.hasOffhandShield(), combat.shieldUp);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = lying.roll;

  const hit = targetHit();
  // Crack overlay: hard blocks show a slower crack build-up, easy ones a fast one. The label names the difficulty.
  const mineFrac = mining.fraction();
  const mineNeed = hit ? breakTime(hit.id, inventory.selectedItem.id) : 0;
  hud.setCrack(mineFrac, crackLabel(hit, mineNeed));
  hud.update({
    inventory,
    target: hit ? BLOCK_DEFS[hit.id]?.name : null,
    health: player.health,
    maxHealth: player.maxHealth,
    hunger: player.hunger.value,
    armour: defencePoints(player.armour),
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
