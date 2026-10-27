import { partOffsets, DOOR, BED_FOOT } from '../src/building.js';
import { BLOCK } from '../src/blocks.js';
import { World } from '../src/world.js';
import { FACING } from '../src/facing.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The bed id used in building.js matches the bed block.
check('the bed id in building.js matches BLOCK.BED', BLOCK.BED === 21);

// A door takes the cell above it. A bed takes the cell beside it, along its facing.
check('a door takes the cell above', partOffsets(DOOR.DOOR, 0).length === 1 && partOffsets(DOOR.DOOR, 0)[0].dy === 1);
check('an open door also takes the cell above', partOffsets(DOOR.OPEN_DOOR, 0)[0].dy === 1);
check('a bed facing south takes the cell to the south', JSON.stringify(partOffsets(BLOCK.BED, FACING.SOUTH)) === JSON.stringify([{ dx: 0, dy: 0, dz: 1 }]));
check('a bed facing east takes the cell to the east', JSON.stringify(partOffsets(BLOCK.BED, FACING.EAST)) === JSON.stringify([{ dx: 1, dy: 0, dz: 0 }]));
check('a stone block takes no other cell', partOffsets(BLOCK.STONE, 0).length === 0);

// Placing a door writes both cells, facing the same way.
const scene = { add() {}, remove() {} };
const w = new World(scene, 1337, {}, {});
w.update(8, 8, 2, 25);
const x = 8, y = 80, z = 8;
w.setBlock(x, y - 1, z, BLOCK.STONE);
w.setBlock(x, y, z, BLOCK.AIR);
w.setBlock(x, y + 1, z, BLOCK.AIR);
check('a door places in an empty two-cell space', w.placeWhole(x, y, z, DOOR.DOOR, FACING.WEST));
check('the lower door cell is a door', w.getBlock(x, y, z) === DOOR.DOOR);
check('the upper door cell is a door', w.getBlock(x, y + 1, z) === DOOR.DOOR);
check('both door cells face the same way', w.facingAt(x, y, z) === FACING.WEST && w.facingAt(x, y + 1, z) === FACING.WEST);

// A door does not place if its upper cell is blocked, and nothing is written.
w.setBlock(x + 2, y + 1, z, BLOCK.STONE);
w.setBlock(x + 2, y, z, BLOCK.AIR);
w.setBlock(x + 2, y + 1, z, BLOCK.STONE);
check('a door does not place when the cell above is blocked', !w.placeWhole(x + 2, y, z, DOOR.DOOR, FACING.SOUTH));
check('a refused door leaves its lower cell empty', w.getBlock(x + 2, y, z) === BLOCK.AIR);

// A bed places across two cells.
w.setBlock(x + 4, y, z, BLOCK.AIR);
w.setBlock(x + 5, y, z, BLOCK.AIR);
check('a bed places across two free cells', w.placeWhole(x + 4, y, z, BLOCK.BED, FACING.EAST));
check('the second half of the bed is the foot, in the next cell', w.getBlock(x + 5, y, z) === BED_FOOT);
check('the bed head is still the bed block', w.getBlock(x + 4, y, z) === BLOCK.BED);

// Breaking either half of a door removes both halves.
const brokenTop = w.breakWhole(x, y + 1, z);
check('breaking the top of a door clears both halves', brokenTop.length === 2);
check('the lower half is gone too', w.getBlock(x, y, z) === BLOCK.AIR);
check('the top half is gone', w.getBlock(x, y + 1, z) === BLOCK.AIR);

// Breaking one bed cell removes both cells.
const brokenBed = w.breakWhole(x + 4, y, z);
check('breaking one half of a bed clears both halves', brokenBed.length === 2);
check('the other bed half is gone', w.getBlock(x + 5, y, z) === BLOCK.AIR);

// A neighbouring block that is not part of the door is left alone.
w.setBlock(x + 7, y, z, BLOCK.STONE);
w.setBlock(x + 7, y + 1, z, DOOR.DOOR, FACING.SOUTH);
const lone = w.breakWhole(x + 7, y, z);
check('breaking a lone stone next to a door does not remove the door', w.getBlock(x + 7, y + 1, z) === DOOR.DOOR);
check('only the stone is cleared', lone.length === 1);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
