// The look of the game: the sun casts shadows, the sky dome changes with the time of day, and the lights are set.
// Node has no WebGL, so these check the settings and the sky colours that the renderer uses. Exits non-zero on failure.
import * as THREE from 'three';
import { createSky, updateDayNight } from '../src/sky.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const scene = new THREE.Scene();
const sky = createSky(scene);

check('the sun casts shadows', sky.sun.castShadow === true);
check('the shadow map is 2048 pixels square', sky.sun.shadow.mapSize.x === 2048 && sky.sun.shadow.mapSize.y === 2048);
check('the shadow camera covers the area around the player', sky.sun.shadow.camera.right === 40 && sky.sun.shadow.camera.left === -40);
check('there is a hemisphere light for depth', sky.hemi instanceof THREE.HemisphereLight);
check('there is a sky dome', sky.dome instanceof THREE.Mesh && sky.dome.material.side === THREE.BackSide);

// The dome is brighter at the horizon than overhead, by day.
updateDayNight(scene, sky, 0.25, 0, 4);
const colours = sky.dome.geometry.attributes.color;
const pos = sky.dome.geometry.attributes.position;
let high = null;
let low = null;
for (let i = 0; i < pos.count; i++) {
  const y = pos.getY(i);
  if (y > 190 && high === null) high = i;
  if (Math.abs(y) < 5 && low === null) low = i;
}
const lum = (i) => colours.getX(i) + colours.getY(i) + colours.getZ(i);
check('by day the horizon is brighter than the zenith', high !== null && low !== null && lum(low) > lum(high));

// At night the dome is dark.
updateDayNight(scene, sky, 0.75, 0, 4);
let maxNight = 0;
for (let i = 0; i < colours.count; i++) maxNight = Math.max(maxNight, colours.getX(i), colours.getY(i), colours.getZ(i));
check('at night the sky is dark', maxNight < 0.2);

// The sun is brighter by day than at night.
updateDayNight(scene, sky, 0.25, 0, 4);
const dayIntensity = sky.sun.intensity;
updateDayNight(scene, sky, 0.75, 0, 4);
const nightIntensity = sky.sun.intensity;
check('the sun is brighter by day than at night', dayIntensity > nightIntensity);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
