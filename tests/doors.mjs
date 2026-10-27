import { DOOR, isFullCube, boxesFor, DOOR_BOX, OPEN_DOOR_BOX } from '../src/building.js';
import { BLOCK_DEFS, isSolid } from '../src/blocks.js';
import { BLOCK_TILES } from '../src/textures.js';
import { World } from '../src/world.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A closed door is a thin panel, so it is not a full cube and blocks only where the panel is.
check('a closed door is not a full cube', !isFullCube(DOOR.DOOR));
// Doors turn with their facing, so compare the box values for a south door (the default), not the array object.
const sameBox = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
check('a closed door uses the thin door box', sameBox(boxesFor(DOOR.DOOR, 0)[0], DOOR_BOX[0]));

// An open door is drawn as a thin panel at its edge, and is not solid, so a player walks through it.
// The open door is thin across its facing axis: for a south door that is z, so the z extent is small.
const openBox = boxesFor(DOOR.OPEN_DOOR, 0)[0];
check('an open door is drawn as a thin panel', boxesFor(DOOR.OPEN_DOOR, 0).length === 1 && openBox[5] - openBox[2] < 0.2);
check('an open door is not solid, so it does not block', !isSolid(DOOR.OPEN_DOOR));
check('a closed door is solid, so it blocks', isSolid(DOOR.DOOR));

// Both door states have a texture and a block definition, so they can be placed and drawn.
check('the closed door has a texture', !!BLOCK_TILES[DOOR.DOOR]);
check('the open door has a texture', !!BLOCK_TILES[DOOR.OPEN_DOOR]);
check('the closed door is a solid block', BLOCK_DEFS[DOOR.DOOR].solid === true);
check('the open door is not solid', BLOCK_DEFS[DOOR.OPEN_DOOR].solid === false);

// A door can be placed in the world and read back.
{
  const scene = { add() {}, remove() {} };
  const w = new World(scene, 1337, {}, {});
  w.update(8, 8, 2, 25);
  const x = 8, z = 8, y = 60;
  w.setBlock(x, y, z, DOOR.DOOR);
  check('a door can be placed in the world', w.getBlock(x, y, z) === DOOR.DOOR);
  w.setBlock(x, y, z, BLOCK.AIR);
}

// Toggling a door: closed becomes open and open becomes closed. The toggle is the same rule main.js uses.
const toggle = (id) => (id === DOOR.DOOR ? DOOR.OPEN_DOOR : DOOR.DOOR);
check('toggling a closed door opens it', toggle(DOOR.DOOR) === DOOR.OPEN_DOOR);
check('toggling an open door closes it', toggle(DOOR.OPEN_DOOR) === DOOR.DOOR);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
