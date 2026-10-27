import { World } from './world.js';

const KEY = 'voxelcraft-save-v1';

// Encodes a Uint8Array as base64 so it fits in a JSON string.
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Saves edited chunks, player state, inventory, and time of day to localStorage.
// Chunks that are loaded now are included, so the current state is saved too.
// `furnaces` is an optional Map from "x,y,z" to Furnace. Each furnace's contents are kept.
// `chests` is an optional Map from "x,y,z" to Chest. Each chest's 27 slots are kept.
export function saveGame(world, player, inventory, timeOfDay, furnaces = new Map(), chests = new Map(), spawnBed = null) {
  const chunks = {};
  const facing = {};
  for (const [key, data] of world.edits) chunks[key] = toBase64(data);
  for (const [key, data] of world.facingEdits) facing[key] = toBase64(data);
  for (const chunk of world.chunks.values()) {
    if (!chunk.modified) continue;
    const key = World.key(chunk.cx, chunk.cz);
    chunks[key] = toBase64(chunk.blocks);
    facing[key] = toBase64(chunk.facing);
  }
  const furnaceData = {};
  for (const [key, f] of furnaces) furnaceData[key] = f.toJSON();
  const chestData = {};
  for (const [key, c] of chests) chestData[key] = c.toJSON();
  const data = {
    chests: chestData,
    chunks,
    facing,
    player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, health: player.health, hunger: player.hunger.value, yaw: player.yaw, pitch: player.pitch },
    inventory: inventory.slots.map((s) => ({ id: s.id, count: s.count })),
    armour: { ...player.armour },
    furnaces: furnaceData,
    timeOfDay,
    // The bed the player respawns beside, or null for the default spawn point.
    spawnBed: spawnBed ? { x: spawnBed.x, y: spawnBed.y, z: spawnBed.z } : null,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Save failed', err);
    return false;
  }
}

// Returns the saved game or null if there is none or it cannot be read.
export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const edits = new Map();
    for (const [key, b64] of Object.entries(data.chunks ?? {})) edits.set(key, fromBase64(b64));
    // Facing is optional. Saves from before facing existed have none, so their blocks keep the default.
    const facingEdits = new Map();
    for (const [key, b64] of Object.entries(data.facing ?? {})) facingEdits.set(key, fromBase64(b64));
    return { edits, facingEdits, player: data.player, inventory: data.inventory, armour: data.armour ?? null, furnaces: data.furnaces ?? {}, chests: data.chests ?? {}, timeOfDay: data.timeOfDay, spawnBed: data.spawnBed ?? null };
  } catch (err) {
    console.warn('Save could not be read', err);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
