// Character look: which colours and held item the player model shows. Pure data with no DOM or three.js,
// so tests run in Node. The model itself is built in character-model.js.
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { armourInfo, PARTS, ARMOUR_SETS } from './armour.js';

// Base skin and clothing for the player.
export const PLAYER_SKIN = [0.93, 0.76, 0.6];
export const PLAYER_SHIRT = [0.25, 0.55, 0.85];
export const PLAYER_TROUSERS = [0.22, 0.22, 0.45];
export const PLAYER_HAIR = [0.25, 0.16, 0.08];

// Colour of each armour material, taken from the block definitions so the character matches the items.
export const MATERIAL_COLOURS = {
  wood: [0.7, 0.55, 0.3],
  stone: [0.55, 0.55, 0.55],
  iron: [0.85, 0.85, 0.9],
  diamond: [0.4, 0.9, 0.95],
};

// Returns, for each body part the armour covers, the colour and material it should be drawn with.
// Parts without armour are null, so the model shows the plain clothing underneath.
export function armourLook(worn) {
  const look = {};
  for (const part of PARTS) {
    const info = armourInfo(worn[part]);
    if (!info) { look[part] = null; continue; }
    const material = Object.keys(ARMOUR_SETS).find((m) => ARMOUR_SETS[m].ids[part] === worn[part]);
    look[part] = { material, colour: MATERIAL_COLOURS[material] };
  }
  return look;
}

// What the player is holding: the selected hotbar item, or nothing. `name` is for the label and tests.
export function heldLook(item) {
  if (!item || item.id === BLOCK.AIR || item.count <= 0) return null;
  const def = BLOCK_DEFS[item.id];
  if (!def) return null;
  return { id: item.id, name: def.name, isBlock: !!def.solid, colour: def.side };
}
