import * as THREE from 'three';
import { BLOCK_DEFS, isSolid } from './blocks.js';
import { BLOCK_TILES, TILE_INDEX, tileUV } from './textures.js';
import { itemTexture } from './item-icons.js';

const PICKUP_RADIUS = 1.4;
const GRAVITY = 18;
const SIZE = 0.3;

// Shared geometry for the plain-colour fallback cube.
const dropGeo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
// Flat card for item sprites. It is double-sided so it shows from both directions as it spins.
const cardGeo = new THREE.PlaneGeometry(SIZE, SIZE);

// Brightness per face, matching the world mesher: top 1.0, bottom 0.5, sides 0.85.
const FACE_SHADE = { top: 1.0, bottom: 0.5, side: 0.85 };
// BoxGeometry face order is +x, -x, +y, -y, +z, -z.
const FACE_ORDER = ['side', 'side', 'top', 'bottom', 'side', 'side'];

const blockGeoCache = new Map();
const itemMatCache = new Map();

// Cube geometry for a block, with each face UV-mapped to its atlas tile. Built once per block and shared.
function blockGeometry(id) {
  if (blockGeoCache.has(id)) return blockGeoCache.get(id);
  const g = dropGeo.clone();
  const uvAttr = g.attributes.uv;
  const colors = [];
  FACE_ORDER.forEach((kind, f) => {
    const [u0, v0, u1, v1] = tileUV(TILE_INDEX[BLOCK_TILES[id][kind]]);
    // Each face has four vertices: top-left, top-right, bottom-left, bottom-right.
    const quad = [[u0, v1], [u1, v1], [u0, v0], [u1, v0]];
    const shade = FACE_SHADE[kind];
    for (let k = 0; k < 4; k++) {
      uvAttr.setXY(f * 4 + k, quad[k][0], quad[k][1]);
      colors.push(shade, shade, shade);
    }
  });
  uvAttr.needsUpdate = true;
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  blockGeoCache.set(id, g);
  return g;
}

// Material for an item's sprite card. Returns null when the item has no sprite. Shared per item.
function itemMaterial(id) {
  if (!itemMatCache.has(id)) {
    const tex = itemTexture(THREE, id);
    itemMatCache.set(id, tex ? new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }) : null);
  }
  return itemMatCache.get(id);
}

// A block or item lying in the world. It falls, lands on solid blocks, bobs, and can be picked up.
export class ItemDrop {
  // atlasMaterial is the world's textured material, so block drops use the same tiles as placed blocks.
  constructor(scene, world, id, x, y, z, atlasMaterial) {
    this.scene = scene;
    this.world = world;
    this.id = id;
    this.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
    this.pos = new THREE.Vector3(x, y, z);
    this.age = 0;
    this.ownsMaterial = false;
    this.mesh = this.buildMesh(id, atlasMaterial);
    this.scene.add(this.mesh);
  }

  buildMesh(id, atlasMaterial) {
    if (BLOCK_TILES[id]) return new THREE.Mesh(blockGeometry(id), atlasMaterial);
    const itemMat = itemMaterial(id);
    if (itemMat) return new THREE.Mesh(cardGeo, itemMat);
    // Unknown ids fall back to a plain colour cube, which this drop owns and must dispose.
    const def = BLOCK_DEFS[id];
    const color = new THREE.Color(...(def ? def.side : [1, 1, 1]));
    this.ownsMaterial = true;
    return new THREE.Mesh(dropGeo, new THREE.MeshLambertMaterial({ color }));
  }

  update(dt) {
    this.age += dt;
    this.vel.y -= GRAVITY * dt;
    const next = this.pos.clone().addScaledVector(this.vel, dt);
    // Resting check: stop falling when the block below the next position is solid.
    const below = Math.floor(next.y - 0.15);
    if (isSolid(this.world.getBlock(Math.floor(next.x), below, Math.floor(next.z))) && this.vel.y < 0) {
      this.vel.set(0, 0, 0);
      this.pos.y = below + 1 + 0.15;
    } else {
      this.pos.copy(next);
    }
    this.mesh.position.set(this.pos.x, this.pos.y + 0.15 + Math.sin(this.age * 3) * 0.05, this.pos.z);
    this.mesh.rotation.y = this.age * 2;
  }

  // Returns true if the drop is close enough to the player to be collected.
  canPickUp(playerPos) {
    return this.age > 0.5 && this.pos.distanceTo(playerPos) < PICKUP_RADIUS;
  }

  dispose() {
    this.scene.remove(this.mesh);
    // Shared geometry and materials stay cached for the next drop, so only per-drop materials are freed.
    if (this.ownsMaterial) this.mesh.material.dispose();
  }
}

// Manages all live drops in the world.
export class DropManager {
  constructor(scene, world, atlasMaterial) {
    this.scene = scene;
    this.world = world;
    this.atlasMaterial = atlasMaterial;
    this.items = [];
  }

  spawn(id, x, y, z) {
    this.items.push(new ItemDrop(this.scene, this.world, id, x + 0.5, y + 0.5, z + 0.5, this.atlasMaterial));
  }

  // Updates all drops and returns the list of collected item ids.
  update(dt, playerPos, inventory) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.update(dt);
      if (d.canPickUp(playerPos) && inventory.add(d.id, 1) === 0) {
        d.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
