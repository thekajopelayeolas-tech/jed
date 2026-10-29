// The list of worlds the player has made. Each world has a name, a seed, a game mode, and its own save key.
// The list is kept in localStorage, so the title screen can show it again after a reload.
const LIST_KEY = 'voxelcraft-worlds-v1';

// The game modes a world can use. `normal` is the default.
//   creative: no damage, no hunger, and no hostile mobs.
//   peaceful: no hostile mobs, but the player can still take damage from the environment.
//   hardcore: normal rules, but a death ends the world's play (it cannot be respawned into).
//   normal:   the usual survival rules.
export const MODES = ['normal', 'creative', 'peaceful', 'hardcore'];
export const MODE_NAMES = { normal: 'Normal', creative: 'Creative', peaceful: 'Peaceful', hardcore: 'Hardcore' };

const DEFAULT_SEED = 1337;

// Reads the world list. Returns an empty list if there is none or it cannot be read.
export function listWorlds() {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((w) => w && typeof w.id === 'string') : [];
  } catch (err) {
    console.warn('World list could not be read', err);
    return [];
  }
}

function writeWorlds(worlds) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(worlds));
    return true;
  } catch (err) {
    console.warn('World list could not be saved', err);
    return false;
  }
}

// Turns a typed seed into a number. A number is used as it is. Any other text gives a stable number from its letters.
// An empty seed gives the default seed.
export function seedFromText(text) {
  const t = String(text ?? '').trim();
  if (t === '') return DEFAULT_SEED;
  if (/^-?\d+$/.test(t)) return Number(t);
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return h;
}

// Creates a world and adds it to the list. `options` are { name, mode, seed }. Returns the new world.
export function createWorld({ name, mode, seed }) {
  const cleanName = String(name ?? '').trim() || 'New World';
  const cleanMode = MODES.includes(mode) ? mode : 'normal';
  const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const world = { id, name: cleanName, mode: cleanMode, seed: seedFromText(seed), created: Date.now() };
  const worlds = listWorlds();
  worlds.push(world);
  writeWorlds(worlds);
  return world;
}

// Finds one world by id. Returns null if it is not in the list.
export function getWorld(id) {
  return listWorlds().find((w) => w.id === id) ?? null;
}

// The localStorage key that holds a world's save. Each world has its own.
export function saveKeyFor(id) {
  return `voxelcraft-save-world-${id}`;
}

// Removes a world from the list and deletes its save.
export function deleteWorld(id) {
  const worlds = listWorlds().filter((w) => w.id !== id);
  writeWorlds(worlds);
  try {
    localStorage.removeItem(saveKeyFor(id));
  } catch (err) {
    console.warn('World save could not be removed', err);
  }
}
