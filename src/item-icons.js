// Pixel-art item sprites for the inventory and hotbar. Each sprite is built from simple geometry,
// shaded by which side of each stroke a pixel lies on, and given a one-pixel dark outline.
// Pure data with no DOM access, so tests can run it in Node. Geometry uses pixel centres (x + 0.5, y + 0.5).
import { BLOCK } from './blocks.js';

export const SPRITE_SIZE = 16;
const OUTLINE = [0.1, 0.1, 0.1];

const WOOD_HEAD = { light: [0.84, 0.68, 0.44], dark: [0.62, 0.46, 0.27] };
const HANDLE = { light: [0.58, 0.42, 0.22], dark: [0.38, 0.26, 0.12] };
const STONE = { light: [0.72, 0.72, 0.72], dark: [0.46, 0.46, 0.46] };
const IRON = { light: [0.95, 0.95, 0.97], dark: [0.66, 0.66, 0.7] };

// Stable pseudo-random value in [-0.5, 0.5) for a pixel, so sprites look the same on every run.
function grain(px, py) {
  const h = Math.sin(Math.floor(px) * 12.9898 + Math.floor(py) * 78.233) * 43758.5453;
  return h - Math.floor(h) - 0.5;
}

function tint(c, amount) {
  return c.map((v) => Math.min(1, Math.max(0, v + amount)));
}

// Picks the lit or shadowed side of a palette, with a little grain.
function pick(palette, lit, px, py) {
  return tint(lit ? palette.light : palette.dark, grain(px, py) * 0.08);
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// True when a pixel lies left of the stroke's direction, which is treated as the lit side.
function litSide(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax) > 0;
}

// Even-odd point-in-polygon test.
function inPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Parts are checked in order. The first part that covers a pixel decides its colour.
function layered(parts) {
  return {
    inside: (px, py) => parts.some((p) => p.inside(px, py)),
    color: (px, py) => parts.find((p) => p.inside(px, py)).color(px, py),
  };
}

// A thick line segment with a round cap, shaded per side.
function stroke(ax, ay, bx, by, radius, palette) {
  return {
    inside: (px, py) => segDist(px, py, ax, ay, bx, by) < radius,
    color: (px, py) => pick(palette, litSide(ax, ay, bx, by, px, py), px, py),
  };
}

function ellipse(cx, cy, rx, ry, color) {
  return { inside: (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 < 1, color };
}

function poly(points, color) {
  return { inside: (px, py) => inPolygon(px, py, points), color };
}


function swordSprite(blade) {
  return layered([
    stroke(4, 12, 12, 4, 1.3, blade),
    stroke(2.2, 10.2, 5.8, 13.8, 0.9, HANDLE),
    stroke(4, 12, 1.5, 14.5, 1.0, HANDLE),
  ]);
}

// A pickaxe: a long curved head with a point at each end, set across the top of a diagonal handle.
function pickaxeSprite(head) {
  return layered([
    // The head is an arc over the top of the handle, thick enough to read as metal.
    {
      inside: (px, py) => {
        const d = Math.hypot(px - 8, py - 11);
        return d > 4.6 && d < 6.6 && py < 9.5;
      },
      color: (px, py) => pick(head, py < 7, px, py),
    },
    // Pick points: short stubs at each end of the arc, so it reads as a pick and not a bow.
    stroke(2.2, 7.4, 3.8, 9.6, 0.9, head),
    stroke(13.8, 7.4, 12.2, 9.6, 0.9, head),
    // Handle: a diagonal stick from the middle of the head down to the bottom left.
    stroke(8, 10.5, 3, 15, 0.9, HANDLE),
  ]);
}

function axeSprite(head) {
  const edge = [[6.5, 1.5], [12.5, 2.8], [14.5, 6], [12, 8.5], [8.5, 7.5]];
  return layered([
    poly(edge, (px, py) => pick(head, py < 5, px, py)),
    stroke(8, 7.5, 2, 14, 0.9, HANDLE),
  ]);
}


const coalColor = (px, py) => (grain(px, py) > 0.15 ? [0.32, 0.32, 0.32] : [0.1, 0.1, 0.11]);

const DIAMOND = { light: [0.7, 0.98, 1], dark: [0.3, 0.75, 0.85] };
const LEATHER = { light: [0.72, 0.5, 0.3], dark: [0.5, 0.32, 0.18] };

// Armour pieces use the material's colour and a silhouette for the slot: helmet, chestplate, leggings, boots.
function armourSprite(part, palette) {
  if (part === 'helmet') {
    return layered([
      poly([[3, 9], [3, 5], [5, 3], [11, 3], [13, 5], [13, 9]], (px, py) => pick(palette, py < 6, px, py)),
      poly([[5, 8], [11, 8], [11, 10], [5, 10]], () => [0.15, 0.15, 0.15]),
    ]);
  }
  if (part === 'chest') {
    return layered([
      poly([[3, 3], [6, 3], [8, 5], [10, 3], [13, 3], [13, 13], [3, 13]], (px, py) => pick(palette, py < 8, px, py)),
      stroke(6, 6, 10, 6, 0.4, { light: [0.1, 0.1, 0.1], dark: [0.1, 0.1, 0.1] }),
    ]);
  }
  if (part === 'legs') {
    return layered([
      poly([[3, 3], [13, 3], [13, 7], [9, 7], [9, 13], [7, 13], [7, 7], [3, 7]], (px, py) => pick(palette, py < 5, px, py)),
    ]);
  }
  // boots
  return layered([
    poly([[3, 4], [7, 4], [7, 10], [13, 10], [13, 13], [3, 13]], (px, py) => pick(palette, py < 8, px, py)),
    poly([[3, 4], [7, 4], [7, 6], [3, 6]], () => LEATHER.dark),
  ]);
}

  // A spade: a rounded blade at the top that narrows to a point, on a handle.
function shovelSprite(head) {
  return layered([
    {
      inside: (px, py) => {
        if (py < 1 || py > 9.5) return false;
        const half = py < 6 ? 3.2 : 3.2 - ((py - 6) / 3.5) ** 2 * 3.2;
        return Math.abs(px - 8) < Math.max(0.5, half);
      },
      color: (px, py) => pick(head, px < 8, px, py),
    },
    stroke(8, 9, 8, 14.5, 0.9, HANDLE),
  ]);
}

// A hoe: a flat blade set across the top of the handle.
function hoeSprite(head) {
  return layered([
    poly([[3, 3], [13, 3], [13, 6], [8, 6], [8, 5], [3, 5]], (px, py) => pick(head, py < 4.5, px, py)),
    stroke(8, 5, 8, 14.5, 0.9, HANDLE),
  ]);
}


// A bucket: a pail with a rim and a handle over the top.
function bucketSprite(metal) {
  return layered([
    poly([[4, 6], [12, 6], [11, 14], [5, 14]], (px, py) => pick(metal, px < 8, px, py)),
    stroke(4, 4, 12, 4, 0.7, metal),
    stroke(4, 2, 4, 6, 0.5, metal),
    stroke(12, 2, 12, 6, 0.5, metal),
  ]);
}

// A water bucket: the same pail, with blue water showing at the top.
function waterBucketSprite() {
  return layered([
    poly([[4, 8], [12, 8], [11, 14], [5, 14]], (px, py) => pick(IRON, px < 8, px, py)),
    poly([[4, 5], [12, 5], [12, 8], [4, 8]], (px, py) => tint([0.3, 0.55, 0.95], grain(px, py) * 0.08)),
    stroke(4, 3, 12, 3, 0.6, IRON),
  ]);
}

// Shears: two blades crossed at a pivot, with ring handles at the bottom.
function shearsSprite() {
  return layered([
    stroke(4, 3, 11, 12, 0.7, IRON),
    stroke(12, 3, 5, 12, 0.7, IRON),
    ellipse(4.5, 13, 1.8, 1.8, (px, py) => pick(IRON, px < 4, px, py)),
    ellipse(11.5, 13, 1.8, 1.8, (px, py) => pick(IRON, px < 11, px, py)),
  ]);
}

const SPRITES = new Map([
  [BLOCK.STICK, stroke(3, 13, 13, 3, 1.4, HANDLE)],
  [BLOCK.COOKED_BEEF, ellipse(8, 8.5, 6.2, 4.8, (px, py) => {
    if (segDist(px, py, 4, 11, 12, 6) < 1) return tint([0.96, 0.9, 0.86], grain(px, py) * 0.06);
    return tint(py < 6.5 ? [0.62, 0.36, 0.2] : [0.42, 0.22, 0.12], grain(px, py) * 0.1);
  })],
  [BLOCK.DIAMOND, poly([[8, 2], [13, 6], [8, 14], [3, 6]], (px, py) => pick(DIAMOND, px < 8, px, py))],
  [BLOCK.RAINBOW_GEM, poly([[8, 2], [13, 6], [8, 14], [3, 6]], (px, py) => {
    const hue = Math.floor((py + px * 0.5) / 3) % 3;
    return [[1, 0.5, 0.7], [0.6, 0.9, 1], [1, 0.95, 0.5]][hue];
  })],
  [BLOCK.WOODEN_HELMET, armourSprite('helmet', WOOD_HEAD)],
  [BLOCK.WOODEN_CHEST, armourSprite('chest', WOOD_HEAD)],
  [BLOCK.WOODEN_LEGS, armourSprite('legs', WOOD_HEAD)],
  [BLOCK.WOODEN_BOOTS, armourSprite('boots', WOOD_HEAD)],
  [BLOCK.STONE_HELMET, armourSprite('helmet', STONE)],
  [BLOCK.STONE_CHEST, armourSprite('chest', STONE)],
  [BLOCK.STONE_LEGS, armourSprite('legs', STONE)],
  [BLOCK.STONE_BOOTS, armourSprite('boots', STONE)],
  [BLOCK.IRON_HELMET, armourSprite('helmet', IRON)],
  [BLOCK.IRON_CHEST, armourSprite('chest', IRON)],
  [BLOCK.IRON_LEGS, armourSprite('legs', IRON)],
  [BLOCK.IRON_BOOTS, armourSprite('boots', IRON)],
  [BLOCK.DIAMOND_HELMET, armourSprite('helmet', DIAMOND)],
  [BLOCK.DIAMOND_CHEST, armourSprite('chest', DIAMOND)],
  [BLOCK.DIAMOND_LEGS, armourSprite('legs', DIAMOND)],
  [BLOCK.DIAMOND_BOOTS, armourSprite('boots', DIAMOND)],
  [BLOCK.COAL, layered([
    ellipse(5, 6, 2.8, 2.6, coalColor),
    ellipse(10.5, 8.5, 3, 2.8, coalColor),
    ellipse(6.5, 11.5, 2.4, 2.2, coalColor),
  ])],
  [BLOCK.IRON_INGOT, poly([[2, 7], [4.5, 5], [12, 5], [14, 7.5], [12.5, 11], [3.5, 11.5]],
    (px, py) => pick(IRON, py < 7.5, px, py))],
  [BLOCK.WOOL, poly([[2, 3], [14, 3], [14, 13], [2, 13]],
    (px, py) => (grain(px, py) > 0.2 ? [0.82, 0.82, 0.8] : [0.94, 0.94, 0.92]))],
  [BLOCK.BEEF, ellipse(8, 8.5, 6.2, 4.8, (px, py) => {
    if (segDist(px, py, 4, 11, 12, 6) < 1) return tint([0.96, 0.9, 0.86], grain(px, py) * 0.06);
    return tint(py < 6.5 ? [0.86, 0.42, 0.42] : [0.7, 0.2, 0.22], grain(px, py) * 0.1);
  })],
  [BLOCK.RAW_PORK, ellipse(8, 8.5, 6, 4.6, (px, py) => tint([0.95, 0.6, 0.6], grain(px, py) * 0.1))],
  [BLOCK.COOKED_PORK, ellipse(8, 8.5, 6, 4.6, (px, py) => tint([0.7, 0.45, 0.25], grain(px, py) * 0.1))],
  [BLOCK.RAW_RABBIT, ellipse(8, 9, 5.4, 4.2, (px, py) => tint([0.85, 0.7, 0.65], grain(px, py) * 0.1))],
  [BLOCK.COOKED_RABBIT, ellipse(8, 9, 5.4, 4.2, (px, py) => tint([0.7, 0.5, 0.3], grain(px, py) * 0.1))],
  [BLOCK.RAW_FISH, poly([[2, 8], [5, 5], [11, 5], [14, 8], [11, 11], [5, 11]], (px, py) => tint(py < 8 ? [0.6, 0.75, 0.9] : [0.45, 0.6, 0.78], grain(px, py) * 0.08))],
  [BLOCK.COOKED_FISH, poly([[2, 8], [5, 5], [11, 5], [14, 8], [11, 11], [5, 11]], (px, py) => tint(py < 8 ? [0.8, 0.6, 0.35] : [0.6, 0.42, 0.22], grain(px, py) * 0.08))],
  [BLOCK.RAW_MUTTON, ellipse(8, 8.5, 6, 4.6, (px, py) => {
    if (segDist(px, py, 4, 11, 12, 6) < 1) return tint([0.96, 0.9, 0.86], grain(px, py) * 0.06);
    return tint(py < 6.5 ? [0.9, 0.5, 0.5] : [0.75, 0.3, 0.3], grain(px, py) * 0.1);
  })],
  [BLOCK.COOKED_MUTTON, ellipse(8, 8.5, 6, 4.6, (px, py) => {
    if (segDist(px, py, 4, 11, 12, 6) < 1) return tint([0.96, 0.9, 0.86], grain(px, py) * 0.06);
    return tint(py < 6.5 ? [0.66, 0.4, 0.22] : [0.45, 0.25, 0.14], grain(px, py) * 0.1);
  })],
  // Wheat: three golden stalks standing up from the bottom.
  [BLOCK.WHEAT, layered([
    stroke(8, 15, 8, 3, 0.8, { light: [0.95, 0.85, 0.4], dark: [0.7, 0.55, 0.2] }),
    stroke(5, 15, 4, 5, 0.8, { light: [0.95, 0.85, 0.4], dark: [0.7, 0.55, 0.2] }),
    stroke(11, 15, 12, 5, 0.8, { light: [0.95, 0.85, 0.4], dark: [0.7, 0.55, 0.2] }),
  ])],
  // Bread: a golden loaf with a scored top.
  [BLOCK.BREAD, ellipse(8, 9, 6, 4.2, (px, py) => {
    if (segDist(px, py, 5, 7, 11, 7) < 0.6) return [0.6, 0.38, 0.18];
    return tint(py < 8 ? [0.9, 0.65, 0.35] : [0.7, 0.45, 0.22], grain(px, py) * 0.08);
  })],
  // Cake: a cream-topped slice of sponge.
  [BLOCK.CAKE, poly([[2, 6], [14, 6], [14, 12], [2, 12]], (px, py) => {
    if (py < 8) return tint([0.98, 0.95, 0.9], grain(px, py) * 0.05);
    return tint([0.85, 0.65, 0.45], grain(px, py) * 0.08);
  })],
  // Cookies: three round brown cookies with dark chips.
  [BLOCK.COOKIES, layered([
    ellipse(5, 6, 2.6, 2.6, (px, py) => tint([0.75, 0.52, 0.28], grain(px, py) * 0.1)),
    ellipse(11, 6, 2.6, 2.6, (px, py) => tint([0.75, 0.52, 0.28], grain(px, py) * 0.1)),
    ellipse(8, 11, 2.8, 2.6, (px, py) => (grain(px, py) > 0.3 ? [0.2, 0.12, 0.08] : tint([0.72, 0.5, 0.27], grain(px, py) * 0.1))),
  ])],
  // Stew: a bowl of brown broth.
  [BLOCK.STEW, layered([
    poly([[3, 7], [13, 7], [11, 13], [5, 13]], (px, py) => tint([0.82, 0.82, 0.8], grain(px, py) * 0.05)),
    ellipse(8, 7, 5, 1.6, (px, py) => tint([0.55, 0.36, 0.2], grain(px, py) * 0.08)),
  ])],
  // Raw chicken: a pale pink drumstick-shaped piece.
  [BLOCK.RAW_CHICKEN, ellipse(8, 8.5, 5.5, 4.8, (px, py) => tint([0.95, 0.8, 0.75], grain(px, py) * 0.1))],
  // Cooked chicken: the same piece, browned.
  [BLOCK.COOKED_CHICKEN, ellipse(8, 8.5, 5.5, 4.8, (px, py) => tint([0.78, 0.5, 0.25], grain(px, py) * 0.1))],
  // Egg: a plain oval egg.
  [BLOCK.EGG, ellipse(8, 8.5, 4.8, 6, (px, py) => tint([0.96, 0.94, 0.88], grain(px, py) * 0.05))],
  [BLOCK.ROTTEN_FLESH, ellipse(8, 8, 6, 5.5, (px, py) => {
    if (grain(px, py) > 0.2) return [0.3, 0.4, 0.22];
    return py < 7 ? [0.52, 0.64, 0.42] : [0.4, 0.5, 0.32];
  })],
  [BLOCK.WOODEN_PICKAXE, pickaxeSprite(WOOD_HEAD)],
  [BLOCK.WOODEN_AXE, axeSprite(WOOD_HEAD)],
  [BLOCK.WOODEN_SWORD, swordSprite(WOOD_HEAD)],
  [BLOCK.STONE_PICKAXE, pickaxeSprite(STONE)],
  [BLOCK.STONE_AXE, axeSprite(STONE)],
  [BLOCK.STONE_SWORD, swordSprite(STONE)],
  [BLOCK.IRON_PICKAXE, pickaxeSprite(IRON)],
  [BLOCK.IRON_SWORD, swordSprite(IRON)],
// A boat: a wooden hull with a raised bow on the right and an open top.
  [BLOCK.BOAT, poly([[2, 7], [4, 11], [12, 11], [14, 6], [13, 5], [3, 5]], (px, py) => pick(WOOD_HEAD, py < 8, px, py))],
  [BLOCK.WOODEN_SHOVEL, shovelSprite(WOOD_HEAD)],
  [BLOCK.STONE_SHOVEL, shovelSprite(STONE)],
  [BLOCK.IRON_SHOVEL, shovelSprite(IRON)],
  [BLOCK.WOODEN_HOE, hoeSprite(WOOD_HEAD)],
  [BLOCK.STONE_HOE, hoeSprite(STONE)],
  [BLOCK.IRON_HOE, hoeSprite(IRON)],
  [BLOCK.BUCKET, bucketSprite(IRON)],
  [BLOCK.WATER_BUCKET, waterBucketSprite()],
  [BLOCK.SHEARS, shearsSprite()],
  [BLOCK.DIAMOND_PICKAXE, pickaxeSprite(DIAMOND)],
  [BLOCK.DIAMOND_AXE, axeSprite(DIAMOND)],
  [BLOCK.DIAMOND_SWORD, swordSprite(DIAMOND)],
]);

// Builds RGBA bytes for a sprite: covered pixels take their colour, and empty pixels next to them get the outline.
function buildPixels(spec) {
  const n = SPRITE_SIZE;
  const covered = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) covered[y * n + x] = spec.inside(x + 0.5, y + 0.5) ? 1 : 0;
  }
  const at = (x, y) => x >= 0 && y >= 0 && x < n && y < n && covered[y * n + x] === 1;
  const out = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let rgb = null;
      if (covered[y * n + x]) rgb = spec.color(x + 0.5, y + 0.5);
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) rgb = OUTLINE;
      if (!rgb) continue;
      const i = (y * n + x) * 4;
      out[i] = Math.round(rgb[0] * 255);
      out[i + 1] = Math.round(rgb[1] * 255);
      out[i + 2] = Math.round(rgb[2] * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

const pixelCache = new Map();

// RGBA bytes for an item's 16x16 sprite, or null if the item has no sprite. Do not modify the result.
export function itemPixels(id) {
  if (!SPRITES.has(id)) return null;
  if (!pixelCache.has(id)) pixelCache.set(id, buildPixels(SPRITES.get(id)));
  return pixelCache.get(id);
}

// Creates a THREE.DataTexture for one item sprite with nearest-neighbour filtering. Returns null if there is no sprite.
// The pixels are flipped vertically, because texture row 0 is the bottom of the image in UV space.
export function itemTexture(THREE, id) {
  const px = itemPixels(id);
  if (!px) return null;
  const n = SPRITE_SIZE;
  const flipped = new Uint8ClampedArray(px.length);
  for (let y = 0; y < n; y++) {
    flipped.set(px.subarray((n - 1 - y) * n * 4, (n - y) * n * 4), y * n * 4);
  }
  const tex = new THREE.DataTexture(flipped, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
