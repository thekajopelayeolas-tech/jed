// Block registry. id 0 is air. Colors are per face: [top, side, bottom].
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  WATER: 7,
  COBBLESTONE: 8,
  PLANKS: 9,
  BEDROCK: 10,
  GLASS: 11,
  COAL_ORE: 12,
  IRON_ORE: 13,
  TORCH: 14,
  CRAFTING_TABLE: 15,
  // Items (not placeable) start at 16.
  BEEF: 16,
  ROTTEN_FLESH: 17,
  STICK: 18,
  COAL: 19,
  WOOL: 20,
  BED: 21,
  WOODEN_PICKAXE: 22,
  WOODEN_AXE: 23,
  WOODEN_SWORD: 24,
  STONE_PICKAXE: 25,
  STONE_AXE: 26,
  STONE_SWORD: 27,
  IRON_INGOT: 28,
  IRON_PICKAXE: 29,
  IRON_SWORD: 30,
};

// Tool classes and tiers. Used by mining speed and weapon damage.
// `tool` is the class a block is best mined with; `tier` is the minimum tier to harvest drops.
export const TOOL = { PICKAXE: 'pickaxe', AXE: 'axe', SWORD: 'sword' };
export const TOOL_ITEMS = {
  [BLOCK.WOODEN_PICKAXE]: { tool: TOOL.PICKAXE, tier: 1, speed: 2, damage: 2, item: true },
  [BLOCK.WOODEN_AXE]: { tool: TOOL.AXE, tier: 1, speed: 2, damage: 3, item: true },
  [BLOCK.WOODEN_SWORD]: { tool: TOOL.SWORD, tier: 1, speed: 1, damage: 4, item: true },
  [BLOCK.STONE_PICKAXE]: { tool: TOOL.PICKAXE, tier: 2, speed: 4, damage: 3, item: true },
  [BLOCK.STONE_AXE]: { tool: TOOL.AXE, tier: 2, speed: 4, damage: 4, item: true },
  [BLOCK.STONE_SWORD]: { tool: TOOL.SWORD, tier: 2, speed: 1.5, damage: 5, item: true },
  [BLOCK.IRON_PICKAXE]: { tool: TOOL.PICKAXE, tier: 3, speed: 6, damage: 4, item: true },
  [BLOCK.IRON_SWORD]: { tool: TOOL.SWORD, tier: 3, speed: 1.5, damage: 7, item: true },
};

// Items are things that cannot be placed in the world. Placeable blocks are everything else.
// The definition is the source of truth, so ids can be added without changing ranges.
export function isItem(id) {
  return BLOCK_DEFS[id]?.item === true;
}

export const BLOCK_DEFS = {
  [BLOCK.GRASS]: { name: 'Grass', top: [0.36, 0.7, 0.25], side: [0.45, 0.32, 0.18], bottom: [0.45, 0.32, 0.18], solid: true, transparent: false },
  [BLOCK.DIRT]: { name: 'Dirt', top: [0.45, 0.32, 0.18], side: [0.45, 0.32, 0.18], bottom: [0.45, 0.32, 0.18], solid: true, transparent: false },
  [BLOCK.STONE]: { name: 'Stone', top: [0.5, 0.5, 0.5], side: [0.5, 0.5, 0.5], bottom: [0.5, 0.5, 0.5], solid: true, transparent: false },
  [BLOCK.SAND]: { name: 'Sand', top: [0.86, 0.82, 0.6], side: [0.86, 0.82, 0.6], bottom: [0.86, 0.82, 0.6], solid: true, transparent: false },
  [BLOCK.WOOD]: { name: 'Wood', top: [0.65, 0.5, 0.3], side: [0.4, 0.28, 0.14], bottom: [0.65, 0.5, 0.3], solid: true, transparent: false },
  [BLOCK.LEAVES]: { name: 'Leaves', top: [0.2, 0.5, 0.15], side: [0.2, 0.5, 0.15], bottom: [0.2, 0.5, 0.15], solid: true, transparent: true },
  [BLOCK.WATER]: { name: 'Water', top: [0.2, 0.4, 0.9], side: [0.2, 0.4, 0.9], bottom: [0.2, 0.4, 0.9], solid: false, transparent: true, alpha: 0.6 },
  [BLOCK.COBBLESTONE]: { name: 'Cobblestone', top: [0.4, 0.4, 0.4], side: [0.4, 0.4, 0.4], bottom: [0.4, 0.4, 0.4], solid: true, transparent: false },
  [BLOCK.PLANKS]: { name: 'Planks', top: [0.75, 0.6, 0.38], side: [0.75, 0.6, 0.38], bottom: [0.75, 0.6, 0.38], solid: true, transparent: false },
  [BLOCK.BEDROCK]: { name: 'Bedrock', top: [0.15, 0.15, 0.15], side: [0.15, 0.15, 0.15], bottom: [0.15, 0.15, 0.15], solid: true, transparent: false },
  [BLOCK.GLASS]: { name: 'Glass', top: [0.8, 0.9, 0.95], side: [0.8, 0.9, 0.95], bottom: [0.8, 0.9, 0.95], solid: true, transparent: true, alpha: 0.4 },
  [BLOCK.COAL_ORE]: { name: 'Coal Ore', top: [0.3, 0.3, 0.3], side: [0.3, 0.3, 0.3], bottom: [0.3, 0.3, 0.3], solid: true, transparent: false },
  [BLOCK.IRON_ORE]: { name: 'Iron Ore', top: [0.6, 0.45, 0.35], side: [0.6, 0.45, 0.35], bottom: [0.6, 0.45, 0.35], solid: true, transparent: false },
  [BLOCK.TORCH]: { name: 'Torch', top: [1.0, 0.8, 0.2], side: [1.0, 0.8, 0.2], bottom: [1.0, 0.8, 0.2], solid: false, transparent: true },
  [BLOCK.CRAFTING_TABLE]: { name: 'Crafting Table', top: [0.6, 0.4, 0.2], side: [0.5, 0.35, 0.2], bottom: [0.75, 0.6, 0.38], solid: true, transparent: false },
  [BLOCK.BEEF]: { name: 'Raw Beef', top: [0.8, 0.3, 0.3], side: [0.8, 0.3, 0.3], bottom: [0.8, 0.3, 0.3], solid: false, transparent: true, item: true },
  [BLOCK.ROTTEN_FLESH]: { name: 'Rotten Flesh', top: [0.4, 0.5, 0.3], side: [0.4, 0.5, 0.3], bottom: [0.4, 0.5, 0.3], solid: false, transparent: true, item: true },
  [BLOCK.STICK]: { name: 'Stick', top: [0.55, 0.4, 0.22], side: [0.55, 0.4, 0.22], bottom: [0.55, 0.4, 0.22], solid: false, transparent: true, item: true },
  [BLOCK.COAL]: { name: 'Coal', top: [0.12, 0.12, 0.12], side: [0.12, 0.12, 0.12], bottom: [0.12, 0.12, 0.12], solid: false, transparent: true, item: true },
  [BLOCK.WOOL]: { name: 'Wool', top: [0.92, 0.92, 0.9], side: [0.92, 0.92, 0.9], bottom: [0.92, 0.92, 0.9], solid: true, transparent: false },
  [BLOCK.BED]: { name: 'Bed', top: [0.8, 0.15, 0.15], side: [0.6, 0.12, 0.12], bottom: [0.5, 0.4, 0.3], solid: true, transparent: false },
  [BLOCK.WOODEN_PICKAXE]: { name: 'Wooden Pickaxe', top: [0.7, 0.55, 0.3], side: [0.7, 0.55, 0.3], bottom: [0.7, 0.55, 0.3], solid: false, transparent: true },
  [BLOCK.WOODEN_AXE]: { name: 'Wooden Axe', top: [0.7, 0.55, 0.3], side: [0.7, 0.55, 0.3], bottom: [0.7, 0.55, 0.3], solid: false, transparent: true },
  [BLOCK.WOODEN_SWORD]: { name: 'Wooden Sword', top: [0.7, 0.55, 0.3], side: [0.7, 0.55, 0.3], bottom: [0.7, 0.55, 0.3], solid: false, transparent: true },
  [BLOCK.STONE_PICKAXE]: { name: 'Stone Pickaxe', top: [0.55, 0.55, 0.55], side: [0.55, 0.55, 0.55], bottom: [0.55, 0.55, 0.55], solid: false, transparent: true },
  [BLOCK.STONE_AXE]: { name: 'Stone Axe', top: [0.55, 0.55, 0.55], side: [0.55, 0.55, 0.55], bottom: [0.55, 0.55, 0.55], solid: false, transparent: true },
  [BLOCK.STONE_SWORD]: { name: 'Stone Sword', top: [0.55, 0.55, 0.55], side: [0.55, 0.55, 0.55], bottom: [0.55, 0.55, 0.55], solid: false, transparent: true },
  [BLOCK.IRON_INGOT]: { name: 'Iron Ingot', top: [0.8, 0.8, 0.8], side: [0.8, 0.8, 0.8], bottom: [0.8, 0.8, 0.8], solid: false, transparent: true, item: true },
  [BLOCK.IRON_PICKAXE]: { name: 'Iron Pickaxe', top: [0.85, 0.85, 0.9], side: [0.85, 0.85, 0.9], bottom: [0.85, 0.85, 0.9], solid: false, transparent: true },
  [BLOCK.IRON_SWORD]: { name: 'Iron Sword', top: [0.85, 0.85, 0.9], side: [0.85, 0.85, 0.9], bottom: [0.85, 0.85, 0.9], solid: false, transparent: true },
};

export function isSolid(id) {
  return id !== BLOCK.AIR && BLOCK_DEFS[id]?.solid !== false;
}
