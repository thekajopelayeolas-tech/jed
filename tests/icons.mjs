import { tileImageData, TILE } from '../src/textures.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

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

// Slabs and stairs get their own icon shape, not a full cube. The shape comes from building.js, which is DOM-free.
import { iconShape } from '../src/building.js';
import { BUILD } from '../src/building.js';
check('a slab icon is the slab shape', iconShape(BUILD.STONE_SLAB) === 'slab');
check('a stairs icon is the stairs shape', iconShape(BUILD.STONE_STAIRS) === 'stairs');
check('a wood slab icon is the slab shape', iconShape(BUILD.WOOD_SLAB) === 'slab');
check('a wood stairs icon is the stairs shape', iconShape(BUILD.WOOD_STAIRS) === 'stairs');
check('a plain block keeps the full cube icon', iconShape(BUILD.STONE_BRICKS) === 'cube');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
