// Village placement and layout. Pure functions with no DOM or three.js, so tests run in Node.
// The world is split into square regions. Each region gets at most one village, chosen by a seeded hash,
// so every chunk that needs it computes the same answer without storing anything.
import { BLOCK } from './blocks.js';
import { DOOR } from './building.js';
import { valueNoise2D } from './noise.js';

export const REGION = 64;
// Chance that a region contains a village. Villages are rare: most regions have none.
export const VILLAGE_CHANCE = 0.3;
// Half-size of the flat area a village needs around its centre. It is large enough for ten houses.
export const FLAT_RADIUS = 18;
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

// The area around a village centre whose ground is levelled to the village height. It covers every house and road.
// Offsets are relative to the centre: x from x0 to x1, z from z0 to z1.
export const LEVEL_BOX = { x0: -16, x1: 20, z0: -14, z1: 13 };

// The houses in a village, as boxes on the flat ground. Each house is a small plank house with a door.
// Offsets are relative to the centre. Ten houses sit in two rows of five, with a road running between
// the rows and a road along the south edge. `doorZ` is the front wall the door sits in, facing the road.
export const HOUSES = [
  ...[-12, -6, 0, 6, 12].map((x) => ({ x, z: -12, w: 5, d: 5, doorZ: 4 })),
  ...[-12, -6, 0, 6, 12].map((x) => ({ x, z: 6, w: 5, d: 5, doorZ: 0 })),
];

// Every village centre within `radius` blocks of (x, z). Only regions near that point are checked.
export function villagesNear(x, z, seed, radius) {
  const out = [];
  for (let rx = Math.floor((x - radius) / REGION); rx <= Math.floor((x + radius) / REGION); rx++) {
    for (let rz = Math.floor((z - radius) / REGION); rz <= Math.floor((z + radius) / REGION); rz++) {
      const c = villageCentre(rx, rz, seed);
      if (c && Math.hypot(c.x - x, c.z - z) <= radius) out.push(c);
    }
  }
  return out;
}

// Describes how to build one house at a given ground height. Returns a list of { dx, dy, dz, id } cells.
// The walls are cobblestone at the base and planks above, with a glass window, a door gap, and a roof of planks.
// `planks` is the plank block the house is built from. Villages in birch forests pass birch planks, so the houses
// match the trees around them. It defaults to oak.
export function houseCells(house, groundY, planks = BLOCK.PLANKS) {
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
        cells.push({ dx: house.x + dx, dy: y0 + wallHeight, dz: house.z + dz, id: planks });
        continue;
      }
      for (let h = 0; h < wallHeight; h++) {
        // Door: a two-high gap in the middle of the front (z = 0) wall.
        // The doorway is a closed wooden door, so the house can be entered by opening it.
        const isDoor = dz === house.doorZ && dx === Math.floor(house.w / 2) && h < 2;
        if (isDoor) {
          cells.push({ dx: house.x + dx, dy: y0 + h, dz: house.z + dz, id: DOOR.DOOR });
          continue;
        }
        // Windows: glass in the middle of the two side walls (the walls along z), at head height.
        const isSideWall = edgeX && !edgeZ;
        const isWindow = isSideWall && h === 1 && dz === Math.floor(house.d / 2);
        const id = isWindow ? BLOCK.GLASS : h === 0 ? BLOCK.COBBLESTONE : planks;
        cells.push({ dx: house.x + dx, dy: y0 + h, dz: house.z + dz, id });
      }
    }
  }
  return cells;
}

// Farm plots and an animal pen, beside the houses. Offsets are relative to the centre. Each farm plot is a
// row of wheat blocks on a planks base. The pen is a square fence of planks with an open gate on its east side.
// Placed clear of the houses (x -12..16, z -12..10) and the roads (z -7 and z 5), inside the level box.
export const FARM_PLOTS = [
  { x: -16, z: -3, w: 3, d: 6 },
  { x: -16, z: 6, w: 3, d: 5 },
];
export const PEN = { x: 6, z: -4, w: 7, d: 5 };

// Cells for the farm plots at ground level: a planks base, with wheat blocks on top.
export function farmCells(groundY) {
  const cells = [];
  for (const f of FARM_PLOTS) {
    for (let dx = 0; dx < f.w; dx++) {
      for (let dz = 0; dz < f.d; dz++) {
        cells.push({ dx: f.x + dx, dy: groundY, dz: f.z + dz, id: BLOCK.PLANKS });
        cells.push({ dx: f.x + dx, dy: groundY + 1, dz: f.z + dz, id: BLOCK.WHEAT_BLOCK });
      }
    }
  }
  return cells;
}

// Cells for the animal pen: a fence of planks around the edge, with a one-cell gap on the east side for a gate.
export function penCells(groundY) {
  const cells = [];
  for (let dx = 0; dx < PEN.w; dx++) {
    for (let dz = 0; dz < PEN.d; dz++) {
      const edge = dx === 0 || dz === 0 || dx === PEN.w - 1 || dz === PEN.d - 1;
      if (!edge) continue;
      const gate = dx === PEN.w - 1 && dz === Math.floor(PEN.d / 2);
      if (gate) continue;
      cells.push({ dx: PEN.x + dx, dy: groundY + 1, dz: PEN.z + dz, id: BLOCK.PLANKS });
    }
  }
  return cells;
}

// The cobblestone roads at ground level: one between the two rows of houses, and one along the south edge.
export function pathCells(groundY) {
  const cells = [];
  for (const z of [-7, 5]) {
    for (let x = -14; x <= 18; x++) {
      cells.push({ dx: x, dy: groundY, dz: z, id: BLOCK.COBBLESTONE });
    }
  }
  return cells;
}
