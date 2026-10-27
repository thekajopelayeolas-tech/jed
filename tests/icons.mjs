import { tileImageData, TILE } from '../src/textures.js';

// Inventory icons read tile pixels top-down. The torch flame (like tor.png) is opaque and warm at (x=7, y=2):
// the red channel is full, and it is not a dark or blue colour.
const torch = tileImageData('torch');
const i = (2 * TILE + 7) * 4;
const flame = [torch[i], torch[i + 1], torch[i + 2], torch[i + 3]];
const sizeOk = torch.length === TILE * TILE * 4;
const flameOk = flame[0] === 255 && flame[2] < flame[1] && flame[3] === 255;
console.log(sizeOk ? 'PASS tile has 16x16 RGBA bytes' : 'FAIL tile size');
console.log(flameOk ? 'PASS torch flame is warm and opaque at (7,2)' : `FAIL torch flame ${flame.join(',')}`);
if (!sizeOk || !flameOk) process.exitCode = 1;
