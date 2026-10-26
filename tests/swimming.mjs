import { Player } from '../src/player.js';
import { BLOCK } from '../src/blocks.js';
import { bodyInWater, swimVelocityY, WATER_SINK_CAP, SWIM_UP_SPEED } from '../src/swimming.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A small world: solid stone floor at y=10, water filling y=11..15 across a 9x9 pool, air above.
// Solid walls surround the pool at x=-5 and x=5 so tests can see the edge.
const cells = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
const world = {
  getBlock(x, y, z) {
    if (y <= 10) return BLOCK.STONE;
    if (x >= -4 && x <= 4 && z >= -4 && z <= 4 && y <= 15) return BLOCK.WATER;
    return cells.get(key(x, y, z)) ?? BLOCK.AIR;
  },
  getLight() { return 15; },
};
const fresh = (y) => {
  const p = new Player(world, 0, y, 0);
  p.hunger.value = 9;
  return p;
};
const step = (p, seconds, keys = {}) => {
  p.keys = { ...keys };
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) p.update(dt);
};

// Detection: a body inside the pool is in water, and one on dry ground is not.
check('a body inside the pool is in water', bodyInWater(world, { x: 0, y: 12, z: 0 }, 0.3, 1.8));
check('a body on the stone floor well outside the pool is not in water', !bodyInWater(world, { x: 20, y: 11, z: 20 }, 0.3, 1.8));

// Sinking: with no keys held, the player drops in water but stops at the floor, never falling through.
const sinker = fresh(14);
step(sinker, 3);
check('player sinks in water, but not through the floor', sinker.pos.y >= 10.9 && sinker.pos.y < 14);

// Sink speed is capped, so sinking is slow and steady rather than a fall.
check('sink speed is capped', swimVelocityY(-100, 0.1, 28, false) === -WATER_SINK_CAP);

// Swimming up: holding Space raises the player toward the surface.
const riser = fresh(11.5);
const startY = riser.pos.y;
step(riser, 1, { Space: true });
check('holding Space rises in water', riser.pos.y > startY + 1);
check('rising speed is capped', swimVelocityY(0, 1, 28, true) <= SWIM_UP_SPEED);

// Movement in water is slower than on land.
const onLand = new Player({ ...world, getBlock: (x, y, z) => (y <= 10 ? BLOCK.STONE : BLOCK.AIR) }, 30, 11, 30);
const inWater = fresh(11);
inWater.pos.set(0, 11, 0);
onLand.keys = { KeyW: true };
inWater.keys = { KeyW: true };
onLand.update(0.5);
const landDist = onLand.pos.distanceTo({ x: 30, y: 11, z: 30 });
inWater.update(0.5);
const waterDist = inWater.pos.distanceTo({ x: 0, y: 11, z: 0 });
check('walking in water is slower than on land', waterDist < landDist);

// Landing in water does not hurt: a long fall into the pool costs no health.
const diver = new Player(world, 0, 25, 0);
diver.hunger.value = 9;
diver.health = 20;
for (let t = 0; t < 4; t += 1 / 60) diver.update(1 / 60);
check('falling into water does not hurt the player', diver.health === 20);

// Hunger is unchanged by swimming (no damage was dealt).
check('swimming does not cost hunger', diver.hunger.value === 9);

// Control: the same fall onto dry ground still hurts, so only water is exempt.
const dry = {
  getBlock: (x, y) => (y <= 10 ? BLOCK.STONE : BLOCK.AIR),
  getLight: () => 15,
};
const dryFall = new Player(dry, 0, 25, 0);
dryFall.hunger.value = 9;
dryFall.health = 20;
for (let t = 0; t < 4; t += 1 / 60) dryFall.update(1 / 60);
check('the same fall onto dry ground still costs health', dryFall.health < 20);

// Leaving the water: the player can walk out onto dry ground beside the pool.
const exiter = fresh(11);
exiter.pos.set(4.5, 11, 0);
step(exiter, 2, { KeyD: true });
check('player can swim out of the pool to dry land', exiter.pos.x > 5 && !bodyInWater(world, exiter.pos, 0.3, 1.8));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
