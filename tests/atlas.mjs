import { buildAtlasPixels, tileUV, TILE_INDEX, TILE } from '../src/textures.js';

const { data, width, height } = buildAtlasPixels();
// Sample the torch flame (tile pixel x=7, y=2, which is yellow) through the UV mapping.
const [u0, v0, u1, v1] = tileUV(TILE_INDEX.torch);
const u = u0 + ((7 + 0.5) / TILE) * (u1 - u0);
const v = v1 - ((2 + 0.5) / TILE) * (v1 - v0);
const px = Math.floor(u * width);
const py = Math.floor((1 - v) * height);
const row = height - 1 - py;
const i = (row * width + px) * 4;
console.log('flame rgb:', data[i], data[i + 1], data[i + 2], '(expect yellow ~255,217,51)');
const [g0, gv0, g1, gv1] = tileUV(TILE_INDEX.grassTop);
console.log('grassTop uv:', [g0, gv0, g1, gv1].map((n) => n.toFixed(3)).join(' '));
