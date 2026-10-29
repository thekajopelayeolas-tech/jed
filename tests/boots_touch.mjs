// The two boots stand together: their inner edges touch, so there is no gap between the feet, and each boot still
// covers its own foot (the left boot on the left leg, the right boot on the right leg).
import * as THREE from 'three';
import { buildPlayerModel } from '../src/character-model.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const model = buildPlayerModel();
model.group.updateMatrixWorld(true);
model.shells.bootsLeft.visible = true;
model.shells.bootsRight.visible = true;
model.group.updateMatrixWorld(true);
const box = (o) => new THREE.Box3().setFromObject(o);
const L = box(model.shells.bootsLeft);
const R = box(model.shells.bootsRight);

// The inner edges (the left boot's right side and the right boot's left side) meet, with no gap between the feet.
const gap = R.min.x - L.max.x;
check('the two boots touch: no gap between the inner edges', Math.abs(gap) < 0.01);
check('the boots do not overlap by much', gap > -0.03);

// Each boot stays on its own side of the body.
check('the left boot is on the left side', L.max.x <= 0.02);
check('the right boot is on the right side', R.min.x >= -0.02);

// The boot is a child of its leg, so the trouser is measured with the boot taken off it.
const trouserBox = (leg, boot) => {
  leg.remove(boot);
  model.group.updateMatrixWorld(true);
  const b = box(leg);
  leg.add(boot);
  model.group.updateMatrixWorld(true);
  return b;
};
const legL = trouserBox(model.parts.legLeft, model.shells.bootsLeft);
const legR = trouserBox(model.parts.legRight, model.shells.bootsRight);

// Each boot is flush with its trouser's outer edge, so it does not stick out on the outside.
check('the left boot is flush with the left trouser on the outside', Math.abs(L.min.x - legL.min.x) < 0.01);
check('the right boot is flush with the right trouser on the outside', Math.abs(R.max.x - legR.max.x) < 0.01);

// Each boot's sole reaches the bottom of its trouser, so the boot covers the foot.
check('the left boot covers the left foot', L.min.y <= legL.min.y + 0.01);
check('the right boot covers the right foot', R.min.y <= legR.min.y + 0.01);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
