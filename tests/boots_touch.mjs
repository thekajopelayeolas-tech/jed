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

// Each boot still sits on its foot.
const legL = box(model.parts.legLeft);
const legR = box(model.parts.legRight);
check('the left boot sits on the left foot', Math.abs(L.min.y - legL.min.y) < 0.03);
check('the right boot sits on the right foot', Math.abs(R.min.y - legR.min.y) < 0.03);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
