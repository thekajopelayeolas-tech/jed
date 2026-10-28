// Lava: a liquid block that pools in some caves. Pools are uncommon: most chunks have none, and they only
// appear underground.
import { BLOCK, BLOCK_DEFS, isSolid } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import { Chunk } from '../src/chunk.js';
import { CHUNK_HEIGHT, CHUNK_SIZE, SEA_LEVEL } from '../src/constants.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Lava is a block with a name, a texture, and a definition, and it is not solid, so a player walks into it.
check('lava is a registered block', BLOCK.LAVA !== undefined && BLOCK.LAVA === 128);
check('lava has a name', BLOCK_DEFS[BLOCK.LAVA]?.name === 'Lava');
check('lava has a texture', !!BLOCK_TILES[BLOCK.LAVA]);
check('lava is not solid', isSolid(BLOCK.LAVA) === false);

// Lava pools are rare: over many chunks, only a small share contain any lava.
const SEED = 1337;
let withLava = 0;
let lavaCells = 0;
let lavaAboveSea = 0;
const CHUNKS = 400;
for (let i = 0; i < CHUNKS; i++) {
  const cx = (i % 20) - 10;
  const cz = Math.floor(i / 20) - 10;
  const c = new Chunk(cx, cz);
  c.generate(SEED);
  let any = false;
  for (let y = 0; y < CHUNK_HEIGHT; y++) for (let z = 0; z < CHUNK_SIZE; z++) for (let x = 0; x < CHUNK_SIZE; x++) {
    if (c.get(x, y, z) === BLOCK.LAVA) {
      any = true;
      lavaCells++;
      if (y > SEA_LEVEL) lavaAboveSea++;
    }
  }
  if (any) withLava++;
}
const share = withLava / CHUNKS;
check('some lava exists in the world', lavaCells > 0);
check('lava pools are uncommon: under 15% of chunks have any', share < 0.15);
check('lava is never placed above sea level', lavaAboveSea === 0);

// Touching lava hurts: standing in it costs health on a timer, not every frame, and clear air costs nothing.
import { Player } from '../src/player.js';
import { bodyInLava, lavaStep, LAVA_DAMAGE, LAVA_INTERVAL } from '../src/lava.js';
{
  const pool = {
    getBlock(x, y, z) {
      if (y <= 10) return BLOCK.STONE;
      if (x >= 0 && x <= 2 && z >= 0 && z <= 2 && y === 11) return BLOCK.LAVA;
      return BLOCK.AIR;
    },
    getLight() { return 15; },
    facingAt() { return 0; },
  };
  check('a body standing in lava is in lava', bodyInLava(pool, { x: 1.5, y: 11, z: 1.5 }, 0.3, 1.8));
  check('a body on clear ground is not in lava', !bodyInLava(pool, { x: 8.5, y: 11, z: 8.5 }, 0.3, 1.8));

  // Standing in lava for two seconds: the timer hurts on each interval, not every frame.
  const state = { timer: 0 };
  let taken = 0;
  let hits = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) {
    const dmg = lavaStep(state, true, dt);
    if (dmg > 0) { hits++; taken += dmg; }
  }
  check('standing in lava hurts', taken > 0);
  check('lava hurts on a timer, about once per interval', hits >= 3 && hits <= 5);
  check('each hit does the lava damage', taken === hits * LAVA_DAMAGE);
  // Leaving the lava stops it, and the timer resets, so the next touch hurts at once.
  check('leaving lava does not hurt', lavaStep(state, false, dt) === 0);
  check('touching lava again hurts straight away', lavaStep(state, true, dt) === LAVA_DAMAGE);
  check('the interval is half a second', LAVA_INTERVAL === 0.5);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
