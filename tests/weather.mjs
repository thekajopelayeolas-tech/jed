import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { BIOME } from '../src/biomes.js';
import { createSky, updateDayNight } from '../src/sky.js';
import { WeatherSystem, isSkyExposed, precipitationForBiome } from '../src/weather.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

check('deserts stay dry', precipitationForBiome(BIOME.DESERT) === null);
check('frozen biomes get snow', precipitationForBiome(BIOME.FROZEN_PEAKS) === 'snow');
check('high elevations turn rain into snow', precipitationForBiome(BIOME.PLAINS, 70) === 'snow');
check('temperate plains get rain', precipitationForBiome(BIOME.PLAINS, 20) === 'rain');
check('open sky is exposed to weather', isSkyExposed({ getBlock: () => BLOCK.AIR }, 0, 20, 0));
check('a solid roof shelters the player', !isSkyExposed({ getBlock: (_x, y) => y === 24 ? BLOCK.STONE : BLOCK.AIR }, 0, 20, 0));

const scene = new THREE.Scene();
const weather = new WeatherSystem(scene, 42);
const player = { pos: new THREE.Vector3(8, 64, 8) };
const world = {
  chunkAt: () => ({ biomeAt: () => BIOME.PLAINS }),
  getBlock: () => BLOCK.AIR,
};
weather.precipitation = 'rain';
weather.intensity = 0.8;
weather.targetIntensity = 0.8;
weather.changeTimer = 50;
weather.update(0.1, world, player);
check('rain particles show outdoors during rain', weather.rain.visible && !weather.snow.visible);
check('rain particles stay within a bounded particle buffer', weather.rainGeometry.attributes.position.array.length === 420 * 2 * 3);

world.getBlock = (_x, y) => y > 66 ? BLOCK.STONE : BLOCK.AIR;
weather.exposureTimer = 0;
weather.update(0.1, world, player);
check('a roof hides precipitation particles indoors', !weather.rain.visible);

const sky = createSky(scene);
updateDayNight(scene, sky, 0.25, 0, 4);
const clearSun = sky.sun.intensity;
const clearFog = scene.fog.far;
updateDayNight(scene, sky, 0.25, 0, 4, { intensity: 1 });
check('storm clouds soften the sunlight', sky.sun.intensity < clearSun);
check('storm weather brings mist closer', scene.fog.far < clearFog);
weather.dispose();

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
