import * as THREE from 'three';
import { BLOCK_DEFS, isSolid } from './blocks.js';

const PICKUP_RADIUS = 1.4;
const GRAVITY = 18;

// Shared geometry for every dropped item. Each drop gets its own material for its color.
const dropGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

// A block or item lying in the world. It falls, lands on solid blocks, bobs, and can be picked up.
export class ItemDrop {
  constructor(scene, world, id, x, y, z) {
    this.scene = scene;
    this.world = world;
    this.id = id;
    this.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
    this.pos = new THREE.Vector3(x, y, z);
    this.age = 0;
    const def = BLOCK_DEFS[id];
    const color = new THREE.Color(...(def ? def.side : [1, 1, 1]));
    this.mesh = new THREE.Mesh(dropGeo, new THREE.MeshLambertMaterial({ color }));
    this.scene.add(this.mesh);
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
    this.mesh.material.dispose();
  }
}

// Manages all live drops in the world.
export class DropManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.items = [];
  }

  spawn(id, x, y, z) {
    this.items.push(new ItemDrop(this.scene, this.world, id, x + 0.5, y + 0.5, z + 0.5));
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
