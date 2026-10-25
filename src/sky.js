import * as THREE from 'three';

// One full day lasts this many seconds of real time.
const DAY_LENGTH = 600;
const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_NIGHT = new THREE.Color(0x0b0b25);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);

// Adds lights to the scene and returns the shared sky state.
export function createSky(scene) {
  scene.add(ambient, sun);
  scene.background = SKY_DAY.clone();
  return { ambient, sun };
}

// Advances the day/night cycle. Returns the new time of day in [0, 1).
export function updateDayNight(scene, sky, timeOfDay, dt, renderDistance) {
  const t = (timeOfDay + dt / DAY_LENGTH) % 1;
  const angle = t * Math.PI * 2;
  const daylight = Math.max(0, Math.sin(angle));
  const color = SKY_NIGHT.clone().lerp(SKY_DAY, Math.min(1, daylight * 2));

  scene.background = color;
  scene.fog = new THREE.Fog(color, renderDistance * 12, renderDistance * 16);
  sky.ambient.intensity = 0.2 + daylight * 0.5;
  sky.sun.intensity = daylight * 0.9;
  sky.sun.position.set(Math.cos(angle), Math.sin(angle), 0.3);
  return t;
}
