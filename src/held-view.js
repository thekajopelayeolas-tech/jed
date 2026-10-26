import * as THREE from 'three';
import { heldLook } from './character.js';

// Resting place of the held item relative to the camera. The bob moves around this point.
const REST = { x: 0.24, y: -0.2, z: -0.7 };

// The held item as seen in first person: a small block or flat card at the bottom-right of the view.
// It is attached to the camera, so it follows the look direction, and it swings a little while walking.
// `itemTexture` builds the sprite texture for items that are not blocks.
export function createHeldView(camera, itemTexture, atlasMaterial, blockCube) {
  const holder = new THREE.Group();
  camera.add(holder);
  // Held near the bottom-right of the view, angled toward the centre so it reads clearly without covering the aim.
  holder.position.set(REST.x, REST.y, REST.z);
  holder.rotation.set(0.25, -0.6, 0.15);

  let mesh = null;
  let key = null;
  // Whether the current mesh is a block (shared geometry and material) rather than an item card (owned).
  let meshIsBlock = false;

  function setItem(item) {
    const look = heldLook(item);
    const k = look ? String(look.id) : 'none';
    if (k === key) return;
    key = k;
    if (mesh) {
      holder.remove(mesh);
      // Only the item card's own geometry and texture are freed. Block geometry and the atlas material are
      // shared with the world and the drops, so they stay alive.
      if (!meshIsBlock) {
        mesh.geometry.dispose();
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
      mesh = null;
    }
    if (!look) return;
    if (look.isBlock) {
      // Blocks are real textured cubes: each face uses the same atlas tile as the placed block.
      mesh = new THREE.Mesh(blockCube(look.id), atlasMaterial);
    } else {
      // Items use their real sprite on a flat card, the same picture the inventory and drops show.
      const tex = itemTexture(look.id);
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.26, 0.26),
        new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }),
      );
    }
    meshIsBlock = !!look.isBlock;
    holder.add(mesh);
  }

  // Swing while walking: a gentle bob that grows with horizontal movement speed.
  let t = 0;
  function update(dt, speed, selectedItem) {
    setItem(selectedItem);
    t += dt;
    const swing = Math.min(1, speed / 4.3);
    holder.position.y = REST.y + Math.sin(t * 8) * 0.012 * swing;
    holder.position.x = REST.x + Math.cos(t * 4) * 0.01 * swing;
  }

  return { update };
}
