import * as THREE from 'three';
import { BIOME } from './biomes.js';
import { CHUNK_HEIGHT, CHUNK_SIZE } from './constants.js';
import { isSolid } from './blocks.js';

const COLD_BIOMES = new Set([
  BIOME.FROZEN_PEAKS, BIOME.SNOWY_SLOPES, BIOME.SNOWY_TAIGA,
  BIOME.FROZEN_RIVER, BIOME.SNOWY_BEACH,
]);
const DRY_BIOMES = new Set([BIOME.DESERT]);
const RAIN_COUNT = 420;
const SNOW_COUNT = 240;
const WEATHER_RADIUS = 24;

// Biomes decide whether precipitation falls as rain, snow, or not at all.
export function precipitationForBiome(biome, altitude = 0) {
  if (DRY_BIOMES.has(biome)) return null;
  if (COLD_BIOMES.has(biome) || (altitude > 64 && biome !== BIOME.DESERT)) return 'snow';
  return 'rain';
}

// Weather cannot pass through a roof or a dense canopy above the player's position.
export function isSkyExposed(world, x, y, z) {
  if (!world?.getBlock) return true;
  for (let by = Math.floor(y) + 1; by < CHUNK_HEIGHT; by++) {
    if (isSolid(world.getBlock(Math.floor(x), by, Math.floor(z)))) return false;
  }
  return true;
}

function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Biome-aware weather with gradual transitions, bounded rain/snow particles, wind, and shelter checks.
export class WeatherSystem {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.random = makeRandom(seed);
    this.clock = 0;
    this.changeTimer = 45 + this.random() * 45;
    this.precipitation = null;
    this.targetIntensity = 0;
    this.intensity = 0;
    this.windX = 0.25;
    this.windZ = 0.15;
    this.exposureTimer = 0;
    this.exposed = true;
    this.lastBiome = BIOME.PLAINS;
    this.lastAltitude = 0;

    const rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainMaterial = new THREE.LineBasicMaterial({ color: 0xb8d8ec, transparent: true, opacity: 0.42, depthWrite: false });
    this.rain = new THREE.LineSegments(this.rainGeometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    const snowPositions = new Float32Array(SNOW_COUNT * 3);
    this.snowGeometry = new THREE.BufferGeometry();
    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    this.snowMaterial = new THREE.PointsMaterial({ color: 0xf4f8ff, size: 0.1, transparent: true, opacity: 0.82, depthWrite: false, sizeAttenuation: true });
    this.snow = new THREE.Points(this.snowGeometry, this.snowMaterial);
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    scene.add(this.snow);

    this.rainDrift = Array.from({ length: RAIN_COUNT }, () => this.random() * 2 - 1);
    this.snowDrift = Array.from({ length: SNOW_COUNT }, () => this.random() * 2 - 1);
    this.resetParticles({ x: 0, y: 64, z: 0 });
  }

  resetParticles(position) {
    const rain = this.rainGeometry.attributes.position.array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = position.x + (this.random() * 2 - 1) * WEATHER_RADIUS;
      const y = position.y + 2 + this.random() * 22;
      const z = position.z + (this.random() * 2 - 1) * WEATHER_RADIUS;
      const n = i * 6;
      rain[n] = x; rain[n + 1] = y; rain[n + 2] = z;
      rain[n + 3] = x - this.windX * 0.12; rain[n + 4] = y - 0.8; rain[n + 5] = z - this.windZ * 0.12;
    }
    this.rainGeometry.attributes.position.needsUpdate = true;
    const snow = this.snowGeometry.attributes.position.array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const n = i * 3;
      snow[n] = position.x + (this.random() * 2 - 1) * WEATHER_RADIUS;
      snow[n + 1] = position.y + 2 + this.random() * 22;
      snow[n + 2] = position.z + (this.random() * 2 - 1) * WEATHER_RADIUS;
    }
    this.snowGeometry.attributes.position.needsUpdate = true;
  }

  chooseWeather(biome, altitude) {
    const kind = precipitationForBiome(biome, altitude);
    if (!kind || this.random() < 0.58) {
      this.precipitation = null;
      this.targetIntensity = 0;
    } else {
      this.precipitation = kind;
      this.targetIntensity = 0.35 + this.random() * 0.55;
    }
    this.changeTimer = 100 + this.random() * 220;
  }

  biomeAt(world, x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = world?.chunkAt?.(cx, cz);
    if (!chunk?.biomeAt) return null;
    return chunk.biomeAt(Math.floor(x - cx * CHUNK_SIZE), Math.floor(z - cz * CHUNK_SIZE));
  }

  update(dt, world, player) {
    this.clock += dt;
    this.changeTimer -= dt;
    this.exposureTimer -= dt;
    const biome = this.biomeAt(world, player.pos.x, player.pos.z);
    if (biome !== null) {
      this.lastBiome = biome;
      this.lastAltitude = player.pos.y;
    }
    if (this.changeTimer <= 0) this.chooseWeather(this.lastBiome, this.lastAltitude);
    if (this.exposureTimer <= 0) {
      this.exposed = isSkyExposed(world, player.pos.x, player.pos.y + 1.5, player.pos.z);
      this.exposureTimer = 0.4;
    }

    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 0.12);
    this.windX = Math.sin(this.clock * 0.035 + 0.7) * 0.55;
    this.windZ = Math.cos(this.clock * 0.027 + 1.4) * 0.4;
    const active = this.exposed && this.intensity > 0.025;
    this.rain.visible = active && this.precipitation === 'rain';
    this.snow.visible = active && this.precipitation === 'snow';
    this.rainMaterial.opacity = 0.22 + this.intensity * 0.32;
    this.snowMaterial.opacity = 0.45 + this.intensity * 0.4;

    const rain = this.rainGeometry.attributes.position.array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const n = i * 6;
      rain[n] += this.windX * dt * 2;
      rain[n + 1] -= dt * (17 + this.intensity * 5);
      rain[n + 2] += this.windZ * dt * 2;
      if (rain[n + 1] < player.pos.y - 2 || Math.abs(rain[n] - player.pos.x) > WEATHER_RADIUS || Math.abs(rain[n + 2] - player.pos.z) > WEATHER_RADIUS) {
        rain[n] = player.pos.x + (this.random() * 2 - 1) * WEATHER_RADIUS;
        rain[n + 1] = player.pos.y + 8 + this.random() * 18;
        rain[n + 2] = player.pos.z + (this.random() * 2 - 1) * WEATHER_RADIUS;
      }
      rain[n + 3] = rain[n] - this.windX * 0.12;
      rain[n + 4] = rain[n + 1] - 0.8;
      rain[n + 5] = rain[n + 2] - this.windZ * 0.12;
    }
    this.rainGeometry.attributes.position.needsUpdate = true;

    const snow = this.snowGeometry.attributes.position.array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const n = i * 3;
      snow[n] += (this.windX * 1.8 + this.snowDrift[i] * Math.sin(this.clock + i) * 0.22) * dt;
      snow[n + 1] -= dt * (1.1 + this.intensity * 1.1);
      snow[n + 2] += (this.windZ * 1.8 + this.snowDrift[i] * Math.cos(this.clock * 0.8 + i) * 0.22) * dt;
      if (snow[n + 1] < player.pos.y - 2 || Math.abs(snow[n] - player.pos.x) > WEATHER_RADIUS || Math.abs(snow[n + 2] - player.pos.z) > WEATHER_RADIUS) {
        snow[n] = player.pos.x + (this.random() * 2 - 1) * WEATHER_RADIUS;
        snow[n + 1] = player.pos.y + 8 + this.random() * 18;
        snow[n + 2] = player.pos.z + (this.random() * 2 - 1) * WEATHER_RADIUS;
      }
    }
    this.snowGeometry.attributes.position.needsUpdate = true;
    this.rain.position.set(0, 0, 0);
    this.snow.position.set(0, 0, 0);
  }

  get state() {
    return { type: this.intensity > 0.05 ? this.precipitation : null, intensity: this.intensity, windX: this.windX, windZ: this.windZ };
  }

  label() {
    if (this.intensity < 0.08 || !this.precipitation) return 'Clear';
    return this.precipitation === 'snow' ? 'Snow' : 'Rain';
  }

  dispose() {
    this.scene.remove(this.rain, this.snow);
    this.rainGeometry.dispose();
    this.snowGeometry.dispose();
    this.rainMaterial.dispose();
    this.snowMaterial.dispose();
  }
}
