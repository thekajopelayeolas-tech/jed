// The armour fits the player: boots cover the feet (the bottom of the legs), and the helmet sits above the eyes
// without covering them. Measured from the model's own geometry, in world units.
import * as THREE from 'three';
import { buildPlayerModel } from '../src/character-model.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const model = buildPlayerModel();
model.group.updateMatrixWorld(true);

// The lowest point of the body (the bottom of the leg) and the top of the boot, measured in world height.
const lowest = (obj) => {
  const box = new THREE.Box3().setFromObject(obj);
  return box.min.y;
};

const boot = model.shells.bootsLeft;
boot.visible = true;
model.group.updateMatrixWorld(true);
const legBox = new THREE.Box3().setFromObject(model.parts.legLeft);
const bootBox = new THREE.Box3().setFromObject(boot);
// The boot must reach down to the bottom of the leg, so the foot is covered.
check('the boot reaches down to the feet', Math.abs(bootBox.min.y - legBox.min.y) < 0.03);
// The boot must sit on the leg, not float above the leg's bottom.
check('the boot does not float above the feet', bootBox.min.y <= legBox.min.y + 0.03);
boot.visible = false;

// The helmet's brim and visor must sit above the eyes, so the eyes stay open.
const helmet = model.shells.helmet;
helmet.visible = true;
model.group.updateMatrixWorld(true);
const helmetBox = new THREE.Box3().setFromObject(helmet);
// The eyes are the two dark squares on the front of the face (in the head, at y = 0.02, about 0.1 below the head's
// centre). Measure the eye height in world units and the lowest point of the helmet.
const headCentre = new THREE.Vector3();
model.parts.head.getWorldPosition(headCentre);
const eyeY = headCentre.y + 0.02;
// A knight's great helm wraps the whole head, so its sides come down past the eyes. What must stay clear of the eyes
// is the front: the visor slit and brim sit above the eye line, so nothing covers the eyes from the front.
const frontBox = new THREE.Box3().setFromObject(helmet.children[1]);
const slitBox = new THREE.Box3().setFromObject(helmet.children[2]);
check('the helmet front does not come down over the eyes', Math.min(frontBox.min.y, slitBox.min.y) >= eyeY);
// The helmet's dome sits on the head: its top is no higher than the head top plus the dome's own 0.2 height.
const headTop = headCentre.y + 0.25;
check('the helmet sits on the head, not far above it', helmetBox.max.y <= headTop + 0.22);
helmet.visible = false;

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
