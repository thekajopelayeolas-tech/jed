import * as THREE from 'three';

// One full day lasts this many seconds of real time.
const DAY_LENGTH = 600;
const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_NIGHT = new THREE.Color(0x0b0b25);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
// A hemisphere light: the sky side is lit bluish and the ground side warm, so faces that look down are darker
// than faces that look up. This gives the blocks depth without any extra geometry.
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6b5a3e, 0.4);
// The sun casts shadows. The shadow camera covers the area around the player, so shadows stay sharp nearby.
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 160;
sun.shadow.bias = -0.0005;

// A sky dome: a large sphere around the player with vertex colours that fade from the horizon colour at the
// bottom to the zenith colour at the top. It follows the camera, so the sky never runs out at the edge of view.
const SKY_RADIUS = 200;
function makeSkyDome() {
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
  const count = geo.attributes.position.count;
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -1;
  return dome;
}

// Colours the dome for the given horizon and zenith colours. Called each frame by updateDayNight.
function paintDome(dome, horizon, zenith) {
  const pos = dome.geometry.attributes.position;
  const col = dome.geometry.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // y runs from -radius (below) to +radius (above). Map it to 0 at the horizon and 1 at the top.
    const up = Math.max(0, Math.min(1, pos.getY(i) / SKY_RADIUS));
    c.copy(horizon).lerp(zenith, Math.pow(up, 0.6));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

// Adds lights to the scene and returns the shared sky state.
export function createSky(scene) {
  scene.add(ambient, sun, hemi);
  scene.background = SKY_DAY.clone();
  const dome = makeSkyDome();
  scene.add(dome);
  return { ambient, sun, hemi, dome };
}

// Advances the day/night cycle. Returns the new time of day in [0, 1).
export function updateDayNight(scene, sky, timeOfDay, dt, renderDistance) {
  const t = (timeOfDay + dt / DAY_LENGTH) % 1;
  const angle = t * Math.PI * 2;
  const daylight = Math.max(0, Math.sin(angle));
  const color = SKY_NIGHT.clone().lerp(SKY_DAY, Math.min(1, daylight * 2));

  scene.background = color;
  scene.fog = new THREE.Fog(color, renderDistance * 12, renderDistance * 16);
  // The dome: a pale band at the horizon and a deeper blue overhead by day, and near-black at night.
  const horizon = SKY_NIGHT.clone().lerp(new THREE.Color(0xdbeeff), Math.min(1, daylight * 2));
  const zenith = SKY_NIGHT.clone().lerp(new THREE.Color(0x3a7bd5), Math.min(1, daylight * 2));
  if (sky.dome) paintDome(sky.dome, horizon, zenith);
  sky.ambient.intensity = 0.2 + daylight * 0.5;
  sky.sun.intensity = daylight * 0.9;
  sky.hemi.intensity = 0.1 + daylight * 0.5;
  // The sun is placed far out along its path, so its shadows fall the right way and stay inside the shadow camera.
  sky.sun.position.set(Math.cos(angle) * 60, Math.sin(angle) * 60, 18);
  sky.sun.target.position.set(0, 0, 0);
  if (!sky.sun.target.parent) scene.add(sky.sun.target);
  return t;
}
