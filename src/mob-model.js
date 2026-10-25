import * as THREE from 'three';

// Builds a blocky multi-part model for a mob: head, body, two arms, and two legs.
// Parts are grouped so the legs and arms can swing. Collision still uses the simple box in mobs.js.
// `palette` gives the colours for skin, shirt, and trousers. `flash` is the hit colour.
const PALETTES = {
  zombie: { skin: 0x5c8f3e, shirt: 0x2f6f8f, trousers: 0x3b3b8a, eye: 0xa6ff7a },
  cow: { skin: 0xf2f2f2, shirt: 0xe9e9e9, trousers: 0x3a2a1a, eye: 0x111111 },
};

function box(w, h, d, color) {
  const mat = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

// Returns { group, parts, materials } where parts.leftLeg etc. are pivots for animation.
export function buildMobModel(kind) {
  const p = PALETTES[kind] ?? PALETTES.cow;
  const group = new THREE.Group();
  const materials = [];

  // Helper that records each material so the hit flash can recolour all of them.
  const part = (w, h, d, color, x, y, z) => {
    const m = box(w, h, d, color);
    m.position.set(x, y, z);
    materials.push(m.material);
    return m;
  };

  // Zombie: humanoid. Cow: quadruped with a longer body.
  if (kind === 'zombie') {
    const head = part(0.5, 0.5, 0.5, p.skin, 0, 1.55, 0);
    const eyeL = part(0.08, 0.06, 0.02, p.eye, -0.12, 1.6, 0.26);
    const eyeR = part(0.08, 0.06, 0.02, p.eye, 0.12, 1.6, 0.26);
    const body = part(0.5, 0.7, 0.3, p.shirt, 0, 1.0, 0);
    const legL = new THREE.Group();
    const legR = new THREE.Group();
    legL.position.set(-0.13, 0.65, 0);
    legR.position.set(0.13, 0.65, 0);
    legL.add(part(0.2, 0.65, 0.2, p.trousers, 0, -0.32, 0));
    legR.add(part(0.2, 0.65, 0.2, p.trousers, 0, -0.32, 0));
    const armL = new THREE.Group();
    const armR = new THREE.Group();
    armL.position.set(-0.36, 1.3, 0);
    armR.position.set(0.36, 1.3, 0);
    armL.add(part(0.18, 0.6, 0.18, p.skin, 0, -0.28, 0.1));
    armR.add(part(0.18, 0.6, 0.18, p.skin, 0, -0.28, 0.1));
    group.add(head, eyeL, eyeR, body, legL, legR, armL, armR);
    return { group, legs: [legL, legR], arms: [armL, armR], materials, height: 1.9 };
  }

  // Cow: head at the front, body, four legs.
  const body = part(0.9, 0.5, 0.5, p.shirt, 0, 0.6, 0);
  const head = part(0.4, 0.4, 0.4, p.skin, 0.55, 0.75, 0);
  const legs = [];
  for (const [x, z] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.35, z);
    leg.add(part(0.15, 0.35, 0.15, p.trousers, 0, -0.17, 0));
    legs.push(leg);
    group.add(leg);
  }
  group.add(body, head);
  return { group, legs, arms: [], materials, height: 0.9 };
}
