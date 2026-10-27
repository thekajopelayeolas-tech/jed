import * as THREE from 'three';
import { heldLook } from './character.js';
import { BLOCK } from './blocks.js';

const SHIELD_ID = BLOCK.SHIELD;

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

  // The left hand. A shield is carried here, not in the right hand: it sits on the left of the view, and rises
  // toward the centre while it is raised to block.
  const leftHolder = new THREE.Group();
  camera.add(leftHolder);
  leftHolder.position.set(-REST.x, REST.y, REST.z);
  leftHolder.rotation.set(0.25, 0.6, -0.15);
  let leftMesh = null;
  let leftKey = null;

  // Shows the shield in the left hand, or nothing. The shield is a flat card with its sprite.
  function setLeftItem(hasShield) {
    const k = hasShield ? 'shield' : 'none';
    if (k === leftKey) return;
    leftKey = k;
    if (leftMesh) {
      leftHolder.remove(leftMesh);
      leftMesh.geometry.dispose();
      if (leftMesh.material.map) leftMesh.material.map.dispose();
      leftMesh.material.dispose();
      leftMesh = null;
    }
    if (!hasShield) return;
    const tex = itemTexture(SHIELD_ID);
    leftMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }),
    );
    leftHolder.add(leftMesh);
  }

  // Swing while walking: a gentle bob that grows with horizontal movement speed.
  let t = 0;
  // `hasShield` puts a shield in the left hand. `shieldUp` raises it in front of the player to block.
  function update(dt, speed, selectedItem, hasShield = false, shieldUp = false) {
    setItem(selectedItem);
    setLeftItem(hasShield);
    t += dt;
    const swing = Math.min(1, speed / 4.3);
    holder.position.y = REST.y + Math.sin(t * 8) * 0.012 * swing;
    holder.position.x = REST.x + Math.cos(t * 4) * 0.01 * swing;
    // The left hand rests low on the left, and rises to the centre when the shield is up.
    leftHolder.position.set(shieldUp ? -0.08 : -REST.x, shieldUp ? -0.02 : REST.y, shieldUp ? -0.55 : REST.z);
    leftHolder.rotation.set(shieldUp ? 0 : 0.25, shieldUp ? 0 : 0.6, shieldUp ? 0 : -0.15);
  }

  return { update };
}
