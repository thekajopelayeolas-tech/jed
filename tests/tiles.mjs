import { BLOCK_TILES, TILE_INDEX } from '../src/textures.js';
import { BLOCK, isItem } from '../src/blocks.js';

// Every placeable block id needs an atlas tile, or the mesher has nothing to draw.
// Placeable means not an item, so new blocks are covered without editing this list.
const placeable = Object.entries(BLOCK).filter(([, id]) => id !== BLOCK.AIR && !isItem(id));
const missing = placeable.filter(([, id]) => !BLOCK_TILES[id]).map(([n]) => n);
const badName = placeable.filter(([, id]) => BLOCK_TILES[id] && [BLOCK_TILES[id].top, BLOCK_TILES[id].side, BLOCK_TILES[id].bottom].some((t) => TILE_INDEX[t] === undefined)).map(([n]) => n);
console.log('placeable blocks:', placeable.length);
console.log('missing tiles:', missing.length ? missing.join(', ') : 'none');
console.log('unknown tile names:', badName.length ? badName.join(', ') : 'none');
