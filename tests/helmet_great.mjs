// The helmet is a knight's great helm: a closed shell that wraps the whole head, with a slit above the eyes, rather
// than a small dome on top. Checked from the model's own helmet boxes, in world units.
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

model.shells.helmet.visible = true;
model.group.updateMatrixWorld(true);
const helmet = model.shells.helmet;
// The whole helm: the union of every plate, so the checks cover all of it, not just one plate.
const helm = new THREE.Box3();
for (const piece of helmet.children) helm.union(worldBox(piece));
const headBox = worldBox(model.parts.head.children[0]);

// A great helm wraps the head: it reaches from the chin line up over the crown, not just the top.
check('the great helm covers the head down to the chin', helm.min.y <= headBox.min.y + 0.12);
check('the great helm reaches over the crown', helm.max.y >= headBox.max.y - 0.02);

// It covers the back and the sides of the head, so it reads as a closed helm.
check('the great helm is as deep as the head, covering the back', (helm.max.z - helm.min.z) >= 0.45);
check('the great helm is as wide as the head, covering the sides', (helm.max.x - helm.min.x) >= 0.45);

// The face is open: no plate covers the middle of the face below the visor, so the eyes and face show.
// The face point sits just in front of the face centre, at the eye height.
const headCentre = new THREE.Vector3();
model.parts.head.getWorldPosition(headCentre);
const facePoint = new THREE.Vector3(headCentre.x, headCentre.y + 0.02, headCentre.z + 0.26);
const coversFace = helmet.children.some((piece) => worldBox(piece).containsPoint(facePoint));
check('no plate covers the middle of the face', !coversFace);

// The front has a slit: the visor sits as a thin bar above the eye line, so the eyes show through below it.
const visor = helmet.children[2];
const visorBox = worldBox(visor);
const eyeLeft = worldBox(model.parts.head.children[2]);
const eyeRight = worldBox(model.parts.head.children[3]);
const eyeBandTop = Math.max(eyeLeft.max.y, eyeRight.max.y);
check('the visor slit is above the eyes', visorBox.min.y >= eyeBandTop);
check('the visor slit is a thin bar', (visorBox.max.y - visorBox.min.y) <= 0.08);

helmet.visible = false;
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
