import { BLOCK } from './blocks.js';
import { valueNoise2D } from './noise.js';
import { REGION } from './village.js';
import { BIOME } from './biomes.js';

// Mansion placement. Similar to villages but rarer and only in dark oak forests.
export const MANSION_CHANCE = 0.05;
const MANSION_RADIUS = 32;

export function mansionCentre(regionX, regionZ, seed) {
  const roll = valueNoise2D(regionX * 12.31 + 0.5, regionZ * 15.17 + 0.5, seed + 801);
  if (roll > MANSION_CHANCE) return null;
  return { x: regionX * REGION + REGION / 2, z: regionZ * REGION + REGION / 2 };
}

// Mansion structure: a large rectangular building of dark oak planks.
export function mansionCells(groundY) {
  const cells = [];
  const width = 15;
  const depth = 15;
  const height = 5;
  
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        // Walls
        const isWall = x === 0 || x === width - 1 || z === 0 || z === depth - 1;
        if (isWall && y < height) {
          cells.push({ dx: x - width / 2, dy: groundY + y, dz: z - depth / 2, id: BLOCK.PLANKS });
        }
        // Floor
        if (y === 0) {
          cells.push({ dx: x - width / 2, dy: groundY + y, dz: z - depth / 2, id: BLOCK.PLANKS });
        }
        // Roof
        if (y === height - 1) {
          cells.push({ dx: x - width / 2, dy: groundY + y, dz: z - depth / 2, id: BLOCK.PLANKS });
export function mansionsNear(x, z, seed, radius) {
  const out = [];
  for (let rx = Math.floor((x - radius) / REGION); rx <= Math.floor((x + radius) / REGION); rx++) {
    for (let rz = Math.floor((z - radius) / REGION); rz <= Math.floor((z + radius) / REGION); rz++) {
      const c = mansionCentre(rx, rz, seed);
      if (c && Math.hypot(c.x - x, c.z - z) <= radius) out.push(c);
    }
  }
  return out;
}
        }
      }
    }
  }
  return cells;
}
