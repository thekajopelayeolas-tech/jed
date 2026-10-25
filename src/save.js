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
export function saveGame(world, player, inventory, timeOfDay) {
  const chunks = {};
  for (const [key, data] of world.edits) chunks[key] = toBase64(data);
  for (const chunk of world.chunks.values()) {
    if (chunk.modified) chunks[World.key(chunk.cx, chunk.cz)] = toBase64(chunk.blocks);
  }
  const data = {
    chunks,
    player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, health: player.health, yaw: player.yaw, pitch: player.pitch },
    inventory: inventory.slots.map((s) => ({ id: s.id, count: s.count })),
    timeOfDay,
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
    return { edits, player: data.player, inventory: data.inventory, timeOfDay: data.timeOfDay };
  } catch (err) {
    console.warn('Save could not be read', err);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
