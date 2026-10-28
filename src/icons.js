import { BLOCK } from './blocks.js';
import { BLOCK_TILES, TILE, tileImageData } from './textures.js';
import { itemPixels, SPRITE_SIZE } from './item-icons.js';
import { iconShape } from './building.js';

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

// The parts of each icon shape, as [yLow, yHigh, zLow, zHigh] bands of the cube (see drawPart). A slab is the lower
// half. Stairs are that lower half plus an upper step on the back half (the high-z side).
const ICON_PARTS = {
  cube: [[0, 1, 0, 1]],
  slab: [[0, 0.5, 0, 1]],
  stairs: [[0, 0.5, 0, 1], [0.5, 1, 0.5, 1]],
};

// Draws a part of a block in the isometric icon. A full cube is the whole cube. A slab or stair part is the same
// cube, clipped to the part's region: a band of height for a slab, and the back half of the upper band for stairs.
// Clipping the full cube faces keeps every texture the original way up, so only the cut changes.
//
// `band` is [yLow, yHigh, zLow, zHigh] in cube units (0 to 1), the part of the cube to keep. The full cube is
// [0, 1, 0, 1]. Points are on the top face's plane, so the band is cut by height and by depth.
function drawPart(ctx, tiles, band) {
  const [yLow, yHigh, zLow, zHigh] = band;
  ctx.save();
  // Clip to the part's silhouette. Each corner of the part's box is projected with the top face's matrix, lowered
  // by its height, so the clip follows the isometric outline of the part.
  const proj = (x, y, z) => {
    const [a, b, c, d, e, f] = FACE_TOP;
    return [a * x * TILE + c * z * TILE + e, b * x * TILE + d * z * TILE + f + (1 - y) * TILE];
  };
  const corners = [];
  for (const y of [yLow, yHigh]) for (const z of [zLow, zHigh]) for (const x of [0, 1]) corners.push(proj(x, y, z));
  const hull = convexHull(corners);
  ctx.beginPath();
  hull.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  drawFace(ctx, tileCanvas(tiles.top), FACE_TOP, 0);
  drawFace(ctx, tileCanvas(tiles.side), FACE_LEFT, 0.2);
  drawFace(ctx, tileCanvas(tiles.side), FACE_RIGHT, 0.4);
  ctx.restore();
}

// The convex outline of a set of 2D points, in order around the hull. Used to clip a part's silhouette.
function convexHull(points) {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// A placeable block as a shaded isometric cube, or a flat sprite for torches. Slabs and stairs are drawn as
// their own shapes (see iconShape in building.js), so they do not look like a full cube.
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
    for (const band of ICON_PARTS[iconShape(id)] ?? ICON_PARTS.cube) drawPart(ctx, tiles, band);
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
