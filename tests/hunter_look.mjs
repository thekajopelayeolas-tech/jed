// The hunter replaces the skeleton, carries a rifle, and the catalogue quadrupeds each get their own features.
import { buildMobModel } from '../src/mob-model.js';
import { EXTRA_MOBS } from '../src/mob-catalogue.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

check('the hunter is in the catalogue', EXTRA_MOBS.some((r) => r[0] === 'hunter'));
check('no skeleton is left in the catalogue', !EXTRA_MOBS.some((r) => r[0] === 'skeleton'));

const hunter = buildMobModel('hunter');
const zombie = buildMobModel('zombie');
check('the hunter has more parts than a plain biped (the rifle)', hunter.group.children.length > zombie.group.children.length);

const quads = EXTRA_MOBS.filter((r) => r[4] === 'quad').map((r) => r[0]);
const plain = buildMobModel('cow').group.children.length;
const featured = quads.filter((k) => buildMobModel(k).group.children.length > plain);
check('each quadruped with a feature has more parts than the plain body', featured.length >= 14);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
