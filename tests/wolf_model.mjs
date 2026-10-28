// The wolf has its own model (not the generic body), with four legs and red eyes.
import * as THREE from 'three';
import { buildMobModel } from '../src/mob-model.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const wolf = buildMobModel('wolf');
const cow = buildMobModel('cow');
check('the wolf has four legs', wolf.legs.length === 4);
check('the wolf is not the same model as the cow', wolf.group.children.length !== cow.group.children.length);
// Shaded boxes carry their colour in the vertices, scaled by face shade (sides are 0.82 of the colour). So a red
// eye is red-dominant on its vertices, while no other part of the wolf is.
const isRed = (o) => {
  const c = o.geometry.attributes.color;
  return !!c && c.getX(0) > 0.5 && c.getY(0) < 0.2 && c.getZ(0) < 0.2;
};
let red = 0;
wolf.group.traverse((o) => { if (o.isMesh && isRed(o)) red++; });
check('the wolf has two red eyes', red === 2);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
