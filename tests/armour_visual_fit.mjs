// The armour fits the player as drawn: the helmet's brim is above the eyes, the helmet's visor clears the eyes, and
// the boots' soles are on the feet. All measured in world space, from the model's own parts.
import * as THREE from 'three';
import { buildPlayerModel } from '../src/character-model.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const model = buildPlayerModel();
model.group.updateMatrixWorld(true);
const worldBox = (o) => new THREE.Box3().setFromObject(o);

// The eyes occupy a band of height: from the bottom of the eye to its top. Both eyes share the same band.
const eyeLeft = worldBox(model.parts.head.children[2]);
const eyeRight = worldBox(model.parts.head.children[3]);
const eyeBandTop = Math.max(eyeLeft.max.y, eyeRight.max.y);

model.shells.helmet.visible = true;
model.group.updateMatrixWorld(true);
const brim = model.shells.helmet.children[1];
const visor = model.shells.helmet.children[2];
const brimBox = worldBox(brim);
const visorBox = worldBox(visor);
// The brim and visor must sit wholly above the top of the eyes, so no part of them covers an eye.
check('the helmet brim is wholly above the eyes', brimBox.min.y >= eyeBandTop);
check('the helmet visor is wholly above the eyes', visorBox.min.y >= eyeBandTop);
model.shells.helmet.visible = false;

// The boot's sole must sit on the foot: the bottom of the boot is at the bottom of the leg.
const legBox = worldBox(model.parts.legLeft);
model.shells.bootsLeft.visible = true;
model.group.updateMatrixWorld(true);
const bootBox = worldBox(model.shells.bootsLeft);
check('the boot sole is on the foot', Math.abs(bootBox.min.y - legBox.min.y) < 0.03);
check('the boot is not below the feet', bootBox.min.y > legBox.min.y - 0.03);
model.shells.bootsLeft.visible = false;

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
