// Creative mode: flight (double-tap Space to toggle, no gravity while flying) and the free item list.
// Exits non-zero on failure. Runs in Node, so the DOM is stubbed for the panel.

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const { World } = await import('../src/world.js');
const { Player } = await import('../src/player.js');
const { BLOCK, BLOCK_DEFS } = await import('../src/blocks.js');
const { Inventory } = await import('../src/inventory.js');

const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);

// Flight: double-tap Space within a short window toggles flight. Only in a world that allows it.
{
  const p = new Player(w, 8.5, 80, 8.5);
  p.tapSpace(10.0);
  p.tapSpace(10.1);
  check('flight does nothing unless the world allows it', p.flying === false);

  p.canFly = true;
  p.tapSpace(20.0);
  p.tapSpace(20.2);
  check('a quick double-tap of Space starts flying', p.flying === true);
  p.tapSpace(30.0);
  p.tapSpace(30.1);
  check('a second double-tap stops flying', p.flying === false);
  p.tapSpace(40.0);
  p.tapSpace(41.0);
  check('two taps far apart do not toggle flight', p.flying === false);
}

// No gravity while flying: the player holds height instead of falling.
{
  const p = new Player(w, 8.5, 90, 8.5);
  p.canFly = true;
  p.flying = true;
  const startY = p.pos.y;
  for (let i = 0; i < 60; i++) p.update(1 / 60);
  check('a flying player does not fall', Math.abs(p.pos.y - startY) < 0.01);
}

// Space climbs and Shift descends while flying.
{
  const up = new Player(w, 8.5, 90, 8.5);
  up.canFly = true;
  up.flying = true;
  up.keys.Space = true;
  for (let i = 0; i < 30; i++) up.update(1 / 60);
  check('holding Space climbs while flying', up.pos.y > 90.2);

  const down = new Player(w, 8.5, 90, 8.5);
  down.canFly = true;
  down.flying = true;
  down.keys.ShiftLeft = true;
  for (let i = 0; i < 30; i++) down.update(1 / 60);
  check('holding Shift descends while flying', down.pos.y < 89.8);
}

// A player who cannot fly still falls under gravity (the normal rules are unchanged).
{
  const p = new Player(w, 8.5, 90, 8.5);
  const startY = p.pos.y;
  for (let i = 0; i < 30; i++) p.update(1 / 60);
  check('without flight the player falls', p.pos.y < startY - 0.5);
}

// The free item list: every real block and item is listed, including ones that cannot be crafted.
{
  const realIds = Object.keys(BLOCK_DEFS).map(Number).filter((id) => id !== BLOCK.AIR && BLOCK_DEFS[id]?.name);
  check('there are more than 100 free items', realIds.length > 100);
  check('the list has no air', !realIds.includes(BLOCK.AIR));
}

// Clicking a tile adds one full stack for free. Checked on the real Inventory.
{
  const inv = new Inventory();
  const before = inv.slots.map((s) => ({ ...s }));
  inv.add(BLOCK.STONE, 64);
  const stone = inv.slots.reduce((n, s) => (s.id === BLOCK.STONE ? n + s.count : n), 0);
  check('a free item adds a full stack', stone === 64);
  check('the inventory was empty before the free item', before.every((s) => s.id === BLOCK.AIR));
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
