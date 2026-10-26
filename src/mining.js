import { BLOCK, TOOL, TOOL_ITEMS } from './blocks.js';

// Hardness: seconds to mine with bare hands. Tool class and minimum tier decide the drop and speed.
// `tool` is the class that mines this block fastest. `tier` is the lowest tool tier that yields its drop.
const HARDNESS = {
  [BLOCK.GRASS]: { hardness: 0.6, tool: null, tier: 0 },
  [BLOCK.DIRT]: { hardness: 0.5, tool: null, tier: 0 },
  [BLOCK.SAND]: { hardness: 0.5, tool: null, tier: 0 },
  [BLOCK.WOOD]: { hardness: 2.0, tool: TOOL.AXE, tier: 0 },
  [BLOCK.LEAVES]: { hardness: 0.2, tool: null, tier: 0 },
  [BLOCK.PLANKS]: { hardness: 2.0, tool: TOOL.AXE, tier: 0 },
  [BLOCK.CRAFTING_TABLE]: { hardness: 2.5, tool: TOOL.AXE, tier: 0 },
  [BLOCK.STONE]: { hardness: 1.5, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.COBBLESTONE]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.COAL_ORE]: { hardness: 3.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.IRON_ORE]: { hardness: 3.0, tool: TOOL.PICKAXE, tier: 2 },
  [BLOCK.DIAMOND_ORE]: { hardness: 4.0, tool: TOOL.PICKAXE, tier: 3 },
  [BLOCK.RAINBOW_ORE]: { hardness: 5.0, tool: TOOL.PICKAXE, tier: 3 },
  [BLOCK.FURNACE]: { hardness: 3.5, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.GLASS]: { hardness: 0.3, tool: null, tier: 0 },
  [BLOCK.WOOL]: { hardness: 0.8, tool: null, tier: 0 },
  [BLOCK.BED]: { hardness: 0.6, tool: null, tier: 0 },
  [BLOCK.TORCH]: { hardness: 0, tool: null, tier: 0 },
  // Building blocks. Wood breaks with an axe, and the stone-based ones with a pickaxe, like their raw materials.
  [BLOCK.STONE_BRICKS]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.POLISHED_STONE]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.BRICKS]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.CONCRETE]: { hardness: 1.8, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.WOOD_SLAB]: { hardness: 2.0, tool: TOOL.AXE, tier: 0 },
  [BLOCK.STONE_SLAB]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.BRICK_SLAB]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.CONCRETE_SLAB]: { hardness: 1.8, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.WOOD_STAIRS]: { hardness: 2.0, tool: TOOL.AXE, tier: 0 },
  [BLOCK.STONE_STAIRS]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.BRICK_STAIRS]: { hardness: 2.0, tool: TOOL.PICKAXE, tier: 1 },
  [BLOCK.CONCRETE_STAIRS]: { hardness: 1.8, tool: TOOL.PICKAXE, tier: 1 },
};

// Bedrock cannot be mined. Unlisted blocks use a default hardness.
const DEFAULT_HARDNESS = { hardness: 1.0, tool: null, tier: 0 };

export function blockInfo(id) {
  return HARDNESS[id] ?? DEFAULT_HARDNESS;
}

// The held item's tool data, or null for an empty hand or a non-tool.
export function toolFor(itemId) {
  return TOOL_ITEMS[itemId] ?? null;
}

// Seconds to break a block with the given held item. Infinity means it cannot be broken.
export function breakTime(blockId, heldId) {
  if (blockId === BLOCK.BEDROCK) return Infinity;
  const info = blockInfo(blockId);
  const tool = toolFor(heldId);
  // Hardness is the base time with bare hands. A matching tool divides it by its speed.
  const matches = tool && info.tool === tool.tool;
  const speed = matches ? tool.speed : 1;
  return info.hardness / speed;
}

// True when a tool is high enough tier to harvest the block's drop. Otherwise the block breaks with no drop.
export function canHarvest(blockId, heldId) {
  const info = blockInfo(blockId);
  if (info.tier === 0) return true;
  const tool = toolFor(heldId);
  return !!tool && tool.tool === info.tool && tool.tier >= info.tier;
}

// Melee damage for the held item. Empty hand deals 1.
export function attackDamage(heldId) {
  return toolFor(heldId)?.damage ?? 1;
}
