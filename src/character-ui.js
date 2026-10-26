import * as THREE from 'three';
import { buildPlayerModel, applyArmour } from './character-model.js';
import { heldLook } from './character.js';
import { iconCanvas } from './icons.js';
import { BLOCK } from './blocks.js';
import { blockGeometry } from './drops.js';
import { itemTexture } from './item-icons.js';

// A small 3D preview of the player, placed beside the armour column. It shows the worn armour and the
// held item, with a glitch effect: short bursts of body-part jitter, colour flicker, and scanlines.
// The preview has its own renderer and scene, so it does not affect the game's view.
// `atlasMaterial` is the world's textured material, so held blocks in the preview match the placed blocks.
export function createCharacterPreview(inventory, player, atlasMaterial, width = 150, height = 220) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:' + width + 'px;height:' + height + 'px;background:#0b0d12;border:2px solid #000;';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  wrap.appendChild(canvas);

  const scanlines = document.createElement('div');
  scanlines.style.cssText = 'position:absolute;inset:0;pointer-events:none;' +
    'background:repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.35) 3px);';
  wrap.appendChild(scanlines);

  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:6px;bottom:4px;font-size:11px;color:#7CFFB2;font-family:monospace;text-shadow:0 0 4px #0f0;';
  wrap.appendChild(label);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  // The model stands with its feet at y=0 and its head near y=1.9. The camera looks at its middle,
  // from far enough back that the whole figure, head to feet, fits the frame.
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
  camera.position.set(0, 1.0, 4.6);
  camera.lookAt(0, 0.95, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  const model = buildPlayerModel();
  scene.add(model.group);
  // Feet stay at y=0 so the camera framing above matches the model.
  model.group.position.y = 0;

  // Held item: a small block or sprite in the right hand. Rebuilt when the held item changes.
  let heldMesh = null;
  let heldKey = null;
  // The held item uses the same textures as the first-person view: a textured block cube, or the item's sprite.
  // Only the item card's own texture and geometry are freed; block geometry and the atlas are shared.
  let heldOwned = false;
  function setHeld(look) {
    const key = look ? `${look.id}` : 'none';
    if (key === heldKey) return;
    heldKey = key;
    if (heldMesh) {
      model.hand.remove(heldMesh);
      if (heldOwned) {
        heldMesh.geometry.dispose();
        if (heldMesh.material.map) heldMesh.material.map.dispose();
        heldMesh.material.dispose();
      }
      heldMesh = null;
    }
    if (!look) return;
    if (look.isBlock) {
      heldMesh = new THREE.Mesh(blockGeometry(look.id), atlasMaterial);
      heldMesh.scale.setScalar(0.3);
      heldOwned = false;
    } else {
      heldMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshLambertMaterial({ map: itemTexture(THREE, look.id), alphaTest: 0.5, side: THREE.DoubleSide }),
      );
      heldOwned = true;
    }
    heldMesh.position.set(0, -0.18, 0.1);
    model.hand.add(heldMesh);
  }

  // Glitch state: each frame may start a short burst where parts jitter and the colour flickers.
  let glitchUntil = 0;
  let nextGlitch = 0;
  const baseColours = new Map();
  for (const shell of Object.values(model.shells)) baseColours.set(shell, shell.material.color.clone());

  function glitchStep(t) {
    if (t > nextGlitch && t > glitchUntil) {
      glitchUntil = t + 0.12 + Math.random() * 0.25;
      nextGlitch = glitchUntil + 0.8 + Math.random() * 2.5;
    }
    const active = t < glitchUntil;
    const jitter = (amount) => (active ? (Math.random() - 0.5) * amount : 0);
    // Parts shift a little during a burst, and the body splits horizontally.
    for (const key of ['head', 'body', 'armLeft', 'armRight', 'legLeft', 'legRight']) {
      const p = model.parts[key];
      p.position.x = (p.userData.baseX ?? (p.userData.baseX = p.position.x)) + jitter(0.12);
    }
    model.group.position.x = jitter(0.08);
    // Flicker: during a burst, shell colours swap toward cyan or magenta for a frame at a time.
    for (const [shell, base] of baseColours) {
      if (!shell.visible) continue;
      if (active && Math.random() < 0.35) {
        const flick = Math.random() < 0.5 ? [0.2, 1, 1] : [1, 0.2, 0.9];
        shell.material.color.setRGB(flick[0], flick[1], flick[2]);
      } else {
        shell.material.color.copy(base);
      }
    }
    // The label flashes during bursts.
    label.style.opacity = active && Math.random() < 0.5 ? '0.3' : '1';
    return active;
  }

  let rotation = 0;
  let last = performance.now();
  let running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    rotation += dt * 0.6;
    model.group.rotation.y = Math.sin(rotation) * 0.5;

    // Held item and armour follow the inventory and the worn gear every frame, so changes show at once.
    applyArmour(model, player.armour);
    const held = inventory.selectedItem;
    const look = heldLook(held);
    setHeld(look);
    label.textContent = look ? `HOLDING ${look.name.toUpperCase()}` : 'HOLDING NOTHING';

    // The armour's real colour comes from applyArmour, so it is the base for the flicker. Record it before
    // the glitch changes it, so a flicker never becomes the new base colour.
    for (const shell of Object.values(model.shells)) {
      if (shell.visible) baseColours.set(shell, shell.material.color.clone());
    }
    glitchStep(now / 1000);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    element: wrap,
    dispose() {
      running = false;
      renderer.dispose();
    },
  };
}
