// Village placement and layout. Pure functions with no DOM or three.js, so tests run in Node.
// The world is split into square regions. Each region gets at most one village, chosen by a seeded hash,
// so every chunk that needs it computes the same answer without storing anything.
import { BLOCK } from './blocks.js';
import { valueNoise2D } from './noise.js';

export const REGION = 64;
// Chance that a region contains a village.
export const VILLAGE_CHANCE = 0.35;
// Half-size of the flat area a village needs around its centre.
const FLAT_RADIUS = 9;
// Maximum height difference allowed across the flat area.
const MAX_SLOPE = 2;

// A village's centre within a region, and whether the region has one at all.
// Returns { x, z } in world coordinates, or null.
export function villageCentre(regionX, regionZ, seed) {
  const roll = valueNoise2D(regionX * 7.31 + 0.5, regionZ * 5.17 + 0.5, seed + 401);
  if (roll > VILLAGE_CHANCE) return null;
  // Keep the centre away from the region edge so the whole village fits inside the region.
  const margin = FLAT_RADIUS + 4;
  const span = REGION - margin * 2;
  const ox = margin + Math.floor(valueNoise2D(regionX * 3.7 + 1.5, regionZ * 9.1 + 2.5, seed + 403) * span);
  const oz = margin + Math.floor(valueNoise2D(regionX * 8.3 + 3.5, regionZ * 2.9 + 4.5, seed + 405) * span);
  return { x: regionX * REGION + ox, z: regionZ * REGION + oz };
}

// True if the ground around a candidate centre is flat enough and above water.
// `heightAt(x, z)` returns the surface y of the ground at that column.
export function isFlatEnough(centre, heightAt, seaLevel) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let dx = -FLAT_RADIUS; dx <= FLAT_RADIUS; dx += 3) {
    for (let dz = -FLAT_RADIUS; dz <= FLAT_RADIUS; dz += 3) {
      const h = heightAt(centre.x + dx, centre.z + dz);
      if (h <= seaLevel) return false;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  return hi - lo <= MAX_SLOPE;
}

// The houses in a village, as boxes on the flat ground. Each house is a small plank house with a door.
// Offsets are relative to the centre. Two houses and a path keep the village readable.
export const HOUSES = [
  { x: -6, z: -4, w: 5, d: 5 },
  { x: 2, z: -4, w: 5, d: 5 },
  { x: -2, z: 3, w: 5, d: 4 },
];

// Describes how to build one house at a given ground height. Returns a list of { dx, dy, dz, id } cells.
// The walls are cobblestone at the base and planks above, with a glass window, a door gap, and a roof of planks.
export function houseCells(house, groundY) {
  const cells = [];
  const y0 = groundY + 1;
  const wallHeight = 3;
  for (let dx = 0; dx < house.w; dx++) {
    for (let dz = 0; dz < house.d; dz++) {
      const edgeX = dx === 0 || dx === house.w - 1;
      const edgeZ = dz === 0 || dz === house.d - 1;
      const onWall = edgeX || edgeZ;
      if (!onWall) {
        // Floor inside the house, and a roof on top.
        cells.push({ dx: house.x + dx, dy: y0 + wallHeight, dz: house.z + dz, id: BLOCK.PLANKS });
        continue;
      }
      for (let h = 0; h < wallHeight; h++) {
        // Door: a two-high gap in the middle of the front (z = 0) wall.
        const isDoor = dz === 0 && dx === Math.floor(house.w / 2) && h < 2;
        if (isDoor) continue;
        // Windows: glass in the middle of the two side walls (the walls along z), at head height.
        const isSideWall = edgeX && !edgeZ;
        const isWindow = isSideWall && h === 1 && dz === Math.floor(house.d / 2);
        const id = isWindow ? BLOCK.GLASS : h === 0 ? BLOCK.COBBLESTONE : BLOCK.PLANKS;
        cells.push({ dx: house.x + dx, dy: y0 + h, dz: house.z + dz, id });
      }
    }
  }
  return cells;
}

// The cobblestone path from the door of one house toward the village centre, at ground level.
export function pathCells(groundY) {
  const cells = [];
  for (let z = -1; z <= 4; z++) {
    cells.push({ dx: 0, dy: groundY, dz: z, id: BLOCK.COBBLESTONE });
  }
  return cells;
}
