import * as THREE from 'three';
import { EXTRA_MOBS } from './mob-catalogue.js';

// Builds a blocky multi-part model for a mob: head, body, two arms, and two legs.
// Parts are grouped so the legs and arms can swing. Collision still uses the simple box in mobs.js.
// `palette` gives the colours for skin, shirt, and trousers. `flash` is the hit colour.
const PALETTES = {
  zombie: { skin: 0x5c8f3e, shirt: 0x2f6f8f, trousers: 0x3b3b8a, eye: 0xa6ff7a },
  // Cow, like co.png: a brown and white patched hide with a white face and pink nose.
  cow: { skin: 0xf4f4f4, shirt: 0x6b4426, trousers: 0x4a2e1a, eye: 0x111111, patch: 0xf4f4f4, nose: 0xe8a6a6 },
  // Sheep: a woolly white body with a darker grey face and legs.
  // The patch and nose colours are used by the quadruped body, so the sheep sets them too, to its own white and grey.
  sheep: { skin: 0x4a4a4a, shirt: 0xf4f4ee, trousers: 0x3c3c3c, eye: 0x111111, patch: 0xf4f4ee, nose: 0x3a3a3a },
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

// A box with light from above: the top face is the mob's colour, the sides are a little darker, and the bottom is
// darkest. Vertex colours carry this, so the one material still takes the hit flash and the mob keeps its colour.
function shadedBox(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const base = new THREE.Color(color);
  const count = geo.attributes.position.count;
  const colours = new Float32Array(count * 3);
  const normal = geo.attributes.normal;
  for (let i = 0; i < count; i++) {
    // Normals point out of each face: +y is up (lit), -y is down (dark), the others are sides.
    const ny = normal.getY(i);
    const k = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.6 : 0.82;
    colours[i * 3] = base.r * k;
    colours[i * 3 + 1] = base.g * k;
    colours[i * 3 + 2] = base.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  return new THREE.Mesh(geo, mat);
}

function box(w, h, d, color) {
  return shadedBox(w, h, d, color);
}

// Returns { group, parts, materials } where parts.leftLeg etc. are pivots for animation.
// The catalogue mobs (mob-catalogue.js) draw with one of four body shapes. Each row there names its shape and colour,
// so a new kind gets its own colours here and the shape picks its body. The existing kinds keep their palettes.
const SHAPE_OF = Object.fromEntries(EXTRA_MOBS.map((r) => [r[0], { shape: r[4], colour: r[8] }]));
function catalogueKind(kind) {
  const row = SHAPE_OF[kind];
  if (!row) return null;
  const c = row.colour;
  // Body colour from the catalogue, with a darker trim for limbs and a light eye. Used by every shape.
  // The enderman's eyes glow purple. Every other catalogue mob keeps the dark eye.
  const eye = kind === 'enderman' ? 0xb026ff : 0x111111;
  return { skin: c, shirt: c, trousers: c, eye, patch: c, nose: c, fin: c, vine: c, shape: row.shape };
}

export function buildMobModel(kind) {
  const cat = catalogueKind(kind);
  const p = cat ?? PALETTES[kind] ?? PALETTES.cow;
  // A catalogue kind uses the body of its shape: biped is humanoid, fish is a fish, blob is a round body, and quad
  // is a four-legged beast. The original kinds keep their own branches below.
  const shape = cat?.shape ?? null;
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
  // Catalogue biped: the humanoid body, so the branch below serves it.
  if (['zombie', 'villager', 'iron_golem'].includes(kind) || shape === 'biped') {
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
    // A hunter carries a rifle: a dark stock and barrel held out in front, so it reads as a gun.
    if (kind === 'hunter') {
      group.add(part(0.08, 0.1, 0.5, 0x3a2a1a, 0.18, 1.05, 0.32), part(0.06, 0.06, 0.4, 0x222222, 0.18, 1.12, 0.6));
    }
    return { group, legs: [legL, legR], arms: [armL, armR], materials, height: 1.9 };
  }

  // Fish: a flat body with a tail fin and two side fins. No legs, so nothing swings.
  if (kind === 'fish' || shape === 'fish') {
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

  // Blob: a round body with a small head on top and no legs, so it bobs rather than walks. Used by the slimes,
  // ghasts, bees and other round catalogue mobs.
  if (shape === 'blob') {
    const body = part(0.6, 0.6, 0.6, p.shirt, 0, 0.4, 0);
    const top = part(0.3, 0.2, 0.3, p.skin, 0, 0.8, 0);
    const eye = part(0.06, 0.06, 0.02, p.eye, 0.1, 0.45, 0.31);
    group.add(body, top, eye);
    return { group, legs: [], arms: [], materials, height: 0.8 };
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
  // Catalogue quadrupeds share this body, so each one gets its own features on top of it. The features are placed
  // from the body's centre, so a kind with a tall head, a shell, or a tail reads as itself.
  const feature = QUAD_FEATURES[kind];
  if (feature) feature(part, group, p);
  return { group, legs, arms: [], materials, height: 0.9 };
}

// Extra parts for the catalogue quadrupeds. Each adds a feature that sets it apart from the others.
const QUAD_FEATURES = {
  horse: (part, g, p) => { g.add(part(0.12, 0.6, 0.14, p.trousers, 0.62, 0.95, 0), part(0.1, 0.12, 0.3, p.trousers, 0.7, 0.9, 0)); },
  donkey: (part, g, p) => { g.add(part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, 0.12), part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, -0.12)); },
  mule: (part, g, p) => { g.add(part(0.12, 0.55, 0.14, p.trousers, 0.62, 0.95, 0), part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, 0.12)); },
  llama: (part, g, p) => { g.add(part(0.12, 0.4, 0.12, p.skin, 0.52, 1.1, 0), part(0.14, 0.2, 0.16, p.skin, 0.58, 1.3, 0)); },
  goat: (part, g, p) => { g.add(part(0.05, 0.22, 0.05, 0xd9d4c4, 0.5, 1.0, 0.1), part(0.05, 0.22, 0.05, 0xd9d4c4, 0.5, 1.0, -0.1)); },
  camel: (part, g, p) => { g.add(part(0.3, 0.3, 0.3, p.shirt, 0, 1.0, 0)); },
  sniffer: (part, g, p) => { g.add(part(0.3, 0.12, 0.12, p.trousers, 0.85, 0.7, 0)); },
  armadillo: (part, g, p) => { g.add(part(0.85, 0.3, 0.5, 0x8a5a3a, -0.02, 0.85, 0)); },
  ocelot: (part, g, p) => { g.add(part(0.04, 0.3, 0.04, p.trousers, -0.65, 0.7, 0)); },
  cat: (part, g, p) => { g.add(part(0.05, 0.25, 0.05, p.trousers, -0.65, 0.8, 0)); },
  fox: (part, g, p) => { g.add(part(0.08, 0.14, 0.08, p.trousers, 0.5, 1.05, 0.1), part(0.08, 0.14, 0.08, p.trousers, 0.5, 1.05, -0.1), part(0.3, 0.12, 0.12, p.shirt, -0.6, 0.6, 0)); },
  panda: (part, g, p) => { g.add(part(0.14, 0.14, 0.14, 0x2a2a2a, 0.62, 0.95, 0.14), part(0.14, 0.14, 0.14, 0x2a2a2a, 0.62, 0.95, -0.14)); },
  polar_bear: (part, g, p) => { g.add(part(0.4, 0.4, 0.4, p.skin, 0.1, 0.9, 0)); },
  turtle: (part, g, p) => { g.add(part(0.9, 0.1, 0.7, 0x4a6a3a, 0, 0.92, 0)); },
  spider: (part, g, p) => { g.add(part(0.5, 0.4, 0.4, p.shirt, -0.5, 0.7, 0), part(0.25, 0.25, 0.25, 0xd01010, 0.7, 0.85, 0.12), part(0.25, 0.25, 0.25, 0xd01010, 0.7, 0.85, -0.12)); },
  frog: (part, g, p) => { g.add(part(0.2, 0.1, 0.2, p.skin, 0.5, 0.95, 0.12), part(0.2, 0.1, 0.2, p.skin, 0.5, 0.95, -0.12)); },
};
