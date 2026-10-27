import * as THREE from 'three';

// Builds a blocky multi-part model for a mob: head, body, two arms, and two legs.
// Parts are grouped so the legs and arms can swing. Collision still uses the simple box in mobs.js.
// `palette` gives the colours for skin, shirt, and trousers. `flash` is the hit colour.
const PALETTES = {
  zombie: { skin: 0x5c8f3e, shirt: 0x2f6f8f, trousers: 0x3b3b8a, eye: 0xa6ff7a },
  // Cow, like co.png: a brown and white patched hide with a white face and pink nose.
  cow: { skin: 0xf4f4f4, shirt: 0x6b4426, trousers: 0x4a2e1a, eye: 0x111111, patch: 0xf4f4f4, nose: 0xe8a6a6 },
  // Sheep: a woolly white body with a darker grey face and legs.
  sheep: { skin: 0x4a4a4a, shirt: 0xf4f4ee, trousers: 0x3c3c3c, eye: 0x111111 },
  // Pig: pink body and snout, short legs.
  pig: { skin: 0xf0a0a8, shirt: 0xf0a0a8, trousers: 0xd98890, eye: 0x111111 },
  // Rabbit: soft brown body with a pale belly and long ears.
  rabbit: { skin: 0xb08a62, shirt: 0xc9a77c, trousers: 0x8a6a48, eye: 0x111111 },
  // Chicken: white body with a red comb and yellow legs.
  chicken: { skin: 0xf5f5f5, shirt: 0xf5f5f5, trousers: 0xe8b33a, eye: 0x111111 },
  // Villager: brown robe over pale skin.
  villager: { skin: 0xd9b48f, shirt: 0x6b4a2b, trousers: 0x3a2a1a, eye: 0x111111 },
  // Iron golem: grey iron body with darker legs.
  // Iron golem, like iron.png: pale iron body with a red-eyed grey head and green vine patches.
  iron_golem: { skin: 0xd8d4cc, shirt: 0xd8d4cc, trousers: 0xc9c4ba, eye: 0xe8291c, vine: 0x6aa84f, nose: 0x9a9a9a },
  // Dolphin, like dolo.png: a light blue-grey body, a tall back fin, and a pale belly.
  dolphin: { skin: 0xa9bfd6, shirt: 0xb9cce0, trousers: 0x8799b0, eye: 0x222222, fin: 0x8799b0 },
  // Fish: blue-grey body with a darker fin.
  fish: { skin: 0x5c8fc4, shirt: 0x7aa9d6, trousers: 0x3d6e9c, eye: 0x111111 },
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
  if (['zombie', 'villager', 'iron_golem'].includes(kind)) {
    const head = part(0.5, 0.5, 0.5, p.skin, 0, 1.55, 0);
    const eyeL = part(0.08, 0.06, 0.02, p.eye, -0.12, 1.6, 0.26);
    const eyeR = part(0.08, 0.06, 0.02, p.eye, 0.12, 1.6, 0.26);
    const body = part(0.5, 0.7, 0.3, p.shirt, 0, 1.0, 0);
    // An iron golem gets green vine patches down its chest and one shoulder, like iron.png.
    if (kind === 'iron_golem') {
      group.add(part(0.12, 0.5, 0.04, p.vine, -0.1, 1.0, 0.17), part(0.1, 0.1, 0.1, p.vine, 0.3, 1.35, 0));
    }
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

  // Fish: a flat body with a tail fin and two side fins. No legs, so nothing swings.
  if (kind === 'fish') {
    const body = part(0.6, 0.3, 0.3, p.shirt, 0, 0.15, 0);
    const head = part(0.2, 0.25, 0.25, p.skin, 0.36, 0.15, 0);
    const tail = part(0.2, 0.3, 0.05, p.trousers, -0.38, 0.15, 0);
    const finL = part(0.15, 0.04, 0.12, p.trousers, 0, 0.3, 0.12);
    group.add(body, head, tail, finL);
    return { group, legs: [], arms: [], materials, height: 0.3 };
  }

  // Pig: a short round body with a snout and four short legs.
  if (kind === 'pig') {
    const body = part(0.8, 0.5, 0.5, p.shirt, 0, 0.55, 0);
    const head = part(0.4, 0.4, 0.4, p.skin, 0.5, 0.65, 0);
    const snout = part(0.1, 0.12, 0.2, p.trousers, 0.73, 0.6, 0);
    const legs = [];
    for (const [x, z] of [[-0.25, -0.18], [-0.25, 0.18], [0.25, -0.18], [0.25, 0.18]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.3, z);
      leg.add(part(0.14, 0.3, 0.14, p.trousers, 0, -0.15, 0));
      legs.push(leg);
      group.add(leg);
    }
    group.add(body, head, snout);
    return { group, legs, arms: [], materials, height: 0.9 };
  }

  // Rabbit: small body, round head with long ears, two hind legs.
  if (kind === 'rabbit') {
    const body = part(0.4, 0.35, 0.35, p.shirt, 0, 0.35, 0);
    const head = part(0.25, 0.25, 0.25, p.skin, 0.2, 0.55, 0);
    const earL = part(0.06, 0.25, 0.08, p.skin, 0.2, 0.8, -0.07);
    const earR = part(0.06, 0.25, 0.08, p.skin, 0.2, 0.8, 0.07);
    const legs = [];
    for (const z of [-0.1, 0.1]) {
      const leg = new THREE.Group();
      leg.position.set(-0.1, 0.2, z);
      leg.add(part(0.12, 0.2, 0.12, p.trousers, 0, -0.1, 0));
      legs.push(leg);
      group.add(leg);
    }
    group.add(body, head, earL, earR);
    return { group, legs, arms: [], materials, height: 0.6 };
  }

  // Chicken: a small round body, a head with a red comb, and two thin legs.
  if (kind === 'chicken') {
    const body = part(0.4, 0.35, 0.35, p.shirt, 0, 0.4, 0);
    const head = part(0.22, 0.22, 0.22, p.skin, 0.12, 0.66, 0);
    const comb = part(0.06, 0.08, 0.06, 0xd9342b, 0.12, 0.8, 0);
    const beak = part(0.08, 0.05, 0.05, 0xe8b33a, 0.25, 0.64, 0);
    const legs = [];
    for (const z of [-0.08, 0.08]) {
      const leg = new THREE.Group();
      leg.position.set(0, 0.22, z);
      leg.add(part(0.04, 0.22, 0.04, p.trousers, 0, -0.11, 0));
      legs.push(leg);
      group.add(leg);
    }
    group.add(body, head, comb, beak);
    return { group, legs, arms: [], materials, height: 0.7 };
  }

  // Dolphin: a long streamlined body, a tall dorsal fin, a tail, and two flippers. Nothing swings, so no legs.
  if (kind === 'dolphin') {
    const body = part(0.9, 0.4, 0.4, p.shirt, 0, 0.3, 0);
    const snout = part(0.3, 0.22, 0.22, p.skin, 0.6, 0.27, 0);
    const dorsal = part(0.08, 0.3, 0.06, p.fin, -0.05, 0.6, 0);
    const tail = part(0.25, 0.3, 0.05, p.fin, -0.55, 0.3, 0);
    const finL = part(0.25, 0.04, 0.12, p.fin, 0.1, 0.12, -0.25);
    const eye = part(0.04, 0.04, 0.02, p.eye, 0.45, 0.36, 0.12);
    group.add(body, snout, dorsal, tail, finL, eye);
    return { group, legs: [], arms: [], materials, height: 0.5 };
  }

  // Cow: head at the front, body, four legs. The body is patched brown and white, with a white face and pink nose.
  const body = part(0.9, 0.5, 0.5, p.shirt, 0, 0.6, 0);
  const patchA = part(0.3, 0.3, 0.52, p.patch, -0.2, 0.7, 0);
  const patchB = part(0.2, 0.2, 0.52, p.patch, 0.2, 0.55, 0);
  const head = part(0.4, 0.4, 0.4, p.skin, 0.55, 0.75, 0);
  const nose = part(0.1, 0.12, 0.2, p.nose, 0.78, 0.68, 0);
  const legs = [];
  for (const [x, z] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.35, z);
    leg.add(part(0.15, 0.35, 0.15, p.trousers, 0, -0.17, 0));
    legs.push(leg);
    group.add(leg);
  }
  group.add(body, patchA, patchB, head, nose);
  return { group, legs, arms: [], materials, height: 0.9 };
}
