// The armour covers the player properly: the helmet is no wider than the head, so it does not hang out past it, and
// the boots cover the feet, so no trouser leg shows below them.
import * as THREE from 'three';
import { buildPlayerModel } from '../src/character-model.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const model = buildPlayerModel();
model.group.updateMatrixWorld(true);
const box = (o) => new THREE.Box3().setFromObject(o);

// The head is 0.5 wide. The helmet dome must not be wider than the head, or it reads as a hat floating over it.
model.shells.helmet.visible = true;
model.group.updateMatrixWorld(true);
const helmetBox = box(model.shells.helmet);
const headBox = box(model.parts.head.children[0]);
const helmetWidth = helmetBox.max.x - helmetBox.min.x;
const headWidth = headBox.max.x - headBox.min.x;
check('the helmet is no wider than the head', helmetWidth <= headWidth + 0.01);
model.shells.helmet.visible = false;

// The boot must cover the bottom of the leg: the leg's lowest point is at or above the boot's sole, so no trouser
// shows below the boot.
model.shells.bootsLeft.visible = true;
model.group.updateMatrixWorld(true);
const legBox = box(model.parts.legLeft);
const bootBox = box(model.shells.bootsLeft);
check('no trouser shows below the boot', legBox.min.y >= bootBox.min.y - 0.01);
// The boot is also as wide as the leg on the inner side, so no trouser shows beside the foot.
check('no trouser shows beside the boot on the inner side', bootBox.max.x >= legBox.max.x - 0.01);
// And the boot is at least as tall as the leg's lower part, so it actually covers the foot.
check('the boot covers the foot (its sole is at the leg bottom)', Math.abs(bootBox.min.y - legBox.min.y) < 0.02);
model.shells.bootsLeft.visible = false;

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
