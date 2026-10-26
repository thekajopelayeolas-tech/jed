import { BLOCK } from './blocks.js';
import { BLOCK_TILES, TILE, tileImageData } from './textures.js';
import { itemPixels, SPRITE_SIZE } from './item-icons.js';

// Shared picture for blocks and items in the inventory, the held stack, and the hotbar.
export const ICON = 32;

// Isometric cube faces for a 16-texel block drawn 1 texel per pixel: [a, b, c, d, e, f] for ctx.setTransform.
// Texture x steps by (a, b) and texture y by (c, d); (e, f) is the screen position of texel (0, 0).
const COS30 = Math.cos(Math.PI / 6);
const FACE_TOP = [COS30, 0.5, -COS30, 0.5, 16, 0];
const FACE_LEFT = [COS30, 0.5, 0, 1, 16 - TILE * COS30, 8];
const FACE_RIGHT = [COS30, -0.5, 0, 1, 16, 16];

// Copies a procedural tile into its own canvas so it can be drawn with transforms.
function tileCanvas(name) {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  c.getContext('2d').putImageData(new ImageData(tileImageData(name), TILE, TILE), 0, 0);
  return c;
}

// Draws one textured face, then darkens only the pixels it painted so transparent texels stay transparent.
function drawFace(ctx, img, matrix, shade) {
  ctx.setTransform(...matrix);
  ctx.drawImage(img, 0, 0, TILE, TILE);
  if (shade > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${shade})`;
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// A placeable block as a shaded isometric cube, or a flat sprite for torches.
function renderBlock(id) {
  const tiles = BLOCK_TILES[id];
  const c = document.createElement('canvas');
  c.width = ICON;
  c.height = ICON;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (id === BLOCK.TORCH) {
    ctx.drawImage(tileCanvas(tiles.side), 0, 0, ICON, ICON);
  } else {
    drawFace(ctx, tileCanvas(tiles.top), FACE_TOP, 0);
    drawFace(ctx, tileCanvas(tiles.side), FACE_LEFT, 0.2);
    drawFace(ctx, tileCanvas(tiles.side), FACE_RIGHT, 0.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return c;
}

// An item's 16x16 sprite, scaled up to the icon size without smoothing.
function renderItem(id) {
  const src = document.createElement('canvas');
  src.width = SPRITE_SIZE;
  src.height = SPRITE_SIZE;
  const px = itemPixels(id);
  if (px) src.getContext('2d').putImageData(new ImageData(px, SPRITE_SIZE, SPRITE_SIZE), 0, 0);
  const c = document.createElement('canvas');
  c.width = ICON;
  c.height = ICON;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, ICON, ICON);
  return c;
}

// Rendered icons keyed by id, so the pixel work runs once per block or item.
const baseCache = new Map();

function baseIcon(id) {
  if (!baseCache.has(id)) baseCache.set(id, BLOCK_TILES[id] ? renderBlock(id) : renderItem(id));
  return baseCache.get(id);
}

// A new canvas showing a block or item, displayed at `size` CSS pixels. Each call gives its own element.
export function iconCanvas(id, size = ICON) {
  const c = document.createElement('canvas');
  c.width = ICON;
  c.height = ICON;
  c.style.cssText = `width:${size}px;height:${size}px;image-rendering:pixelated;flex:none;`;
  c.getContext('2d').drawImage(baseIcon(id), 0, 0);
  return c;
}
