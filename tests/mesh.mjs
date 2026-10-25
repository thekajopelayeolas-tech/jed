import { World } from '../src/world.js';
import { buildChunkGeometry } from '../src/mesher.js';
const w = new World({ add() {}, remove() {} }, 1337, {}, {});
w.update(8, 8, 2, 25);
let verts = 0, bad = 0, minC = 9, maxC = -9;
for (const chunk of w.chunks.values()) {
  const g = buildChunkGeometry(chunk, w);
  for (const part of [g.opaque, g.trans]) {
    const n = part.pos.length / 3;
    verts += n;
    if (part.uv.length !== n * 2 || part.col.length !== n * 3) bad++;
    for (const v of [...part.uv, ...part.col]) {
      if (!Number.isFinite(v)) bad++;
    }
    for (let i = 0; i < part.col.length; i++) { minC = Math.min(minC, part.col[i]); maxC = Math.max(maxC, part.col[i]); }
  }
}
console.log('vertices:', verts, 'bad arrays:', bad, 'colour range:', minC.toFixed(3), maxC.toFixed(3));
