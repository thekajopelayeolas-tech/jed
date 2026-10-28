import { doorBoxes, rotateBox, bodyHitsBlock, boxesFor, DOOR_BOX, OPEN_DOOR_BOX } from '../src/building.js';
import { DOOR } from '../src/building.js';
import { FACING } from '../src/facing.js';
import { BLOCK_TILES } from '../src/textures.js';
import { World } from '../src/world.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};
const near = (a, b) => Math.abs(a - b) < 1e-9;
const sameBox = (a, b) => a.every((v, i) => near(v, b[i]));

// South-facing (0) is the default, so it matches the original door box exactly.
check('a south door keeps the original closed box', sameBox(doorBoxes(false, FACING.SOUTH)[0], DOOR_BOX[0]));
// An open door is swung 90 degrees on its hinge, so its panel runs across the other axis. A south door's
// closed panel runs along x, so its open panel runs along z, hinged on the west edge of the cell.
check('a south door open box is a panel swung to the west edge', sameBox(doorBoxes(true, FACING.SOUTH)[0], [0, 0, 0, 0.12, 1, 1]));

// A quarter turn swaps the panel between the z axis and the x axis.
const closedSouth = doorBoxes(false, FACING.SOUTH)[0];
const closedWest = doorBoxes(false, FACING.WEST)[0];
check('a closed door facing west is a panel across x, not z', closedWest[0] === 0.4 && closedWest[3] === 0.6 && closedWest[2] === 0);
check('a closed door facing south is a panel across z', closedSouth[2] === 0.4 && closedSouth[5] === 0.6);

// Turning four times returns the box to where it started.
const fourTurns = [0, 1, 2, 3].reduce((box, _, i) => (i === 0 ? box : rotateBox(box, 1)), DOOR_BOX[0]);
check('four quarter turns return the box to its start', sameBox(rotateBox(DOOR_BOX[0], 4), DOOR_BOX[0]));

// The rotated box stays within its own cell.
for (const f of [0, 1, 2, 3]) {
  const [x0, , z0, x1, , z1] = doorBoxes(false, f)[0];
  check(`a closed door facing ${f} stays inside its cell`, x0 >= 0 && x1 <= 1 && z0 >= 0 && z1 <= 1);
}

// An open door is a thin panel on the hinge edge of its cell, running across the closed panel's axis.
// Facing east, the closed panel runs along z, so the open panel runs along x at the z = 0 hinge edge.
const openEast = doorBoxes(true, FACING.EAST)[0];
check('an open door facing east is a panel swung to the south edge', near(openEast[2], 0) && near(openEast[5], 0.12));
const openSouth = doorBoxes(true, FACING.SOUTH)[0];
check('an open door facing south is a panel swung to the west edge', near(openSouth[0], 0) && near(openSouth[3], 0.12));
// The open panel is the full length of the cell, so it reads as a door standing open in the wall's side.
check('an open door panel spans the full cell length', near(openSouth[5] - openSouth[2], 1));

// Collision follows the door's facing. A body on the east side of a closed west-facing door does not hit the
// panel that lies across x near the middle, but a body in the middle of the cell does.
const bodyMid = { minX: 0.45, maxX: 0.55, minY: 0, maxY: 1.8, minZ: 0.45, maxZ: 0.55 };
check('a body in the middle of a closed door collides', bodyHitsBlock(DOOR.DOOR, 0, 0, 0, bodyMid, FACING.SOUTH));
check('a body in the middle of a closed door collides whatever its facing', bodyHitsBlock(DOOR.DOOR, 0, 0, 0, bodyMid, FACING.WEST));
const bodyCorner = { minX: 0.05, maxX: 0.15, minY: 0, maxY: 1.8, minZ: 0.05, maxZ: 0.15 };
check('a body in a corner clear of a south-facing door does not collide', !bodyHitsBlock(DOOR.DOOR, 0, 0, 0, bodyCorner, FACING.SOUTH));

// The open door does not block a body inside the cell's middle, which the closed door does.
check('an open door does not block the middle of its cell', !bodyHitsBlock(DOOR.OPEN_DOOR, 0, 0, 0, bodyMid, FACING.SOUTH));

// boxesFor passes the facing through for doors, and other blocks ignore it.
check('boxesFor turns a door by its facing', sameBox(boxesFor(DOOR.DOOR, FACING.WEST)[0], closedWest));

// The front face of a door shows the handle tile, and other faces show plain planks.
check('a door has a distinct front tile', BLOCK_TILES[DOOR.DOOR].front !== BLOCK_TILES[DOOR.DOOR].side);

// Toggling a door keeps its facing in the world.
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
w.setBlock(8, 80, 8, DOOR.DOOR, FACING.WEST);
w.setBlock(8, 80, 8, DOOR.OPEN_DOOR, w.facingAt(8, 80, 8));
check('an opened door keeps its west facing', w.facingAt(8, 80, 8) === FACING.WEST);
w.setBlock(8, 80, 8, DOOR.DOOR, w.facingAt(8, 80, 8));
check('a closed door again keeps its west facing', w.facingAt(8, 80, 8) === FACING.WEST);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
