import * as THREE from 'three';
import { EXTRA_MOBS } from './mob-catalogue.js';

// Builds a blocky multi-part model for a mob. Humanoids get head, body, two arms and two legs. Quadrupeds, fish,
// blobs and other shapes get their own body. Parts are grouped so the legs and arms can swing.
// Collision still uses the simple box in mobs.js.
// `palette` gives the colours for skin, shirt, and trousers. The hit flash is applied in mobs.js.
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
  // Salmon: a red-orange body with a darker fin. Without its own palette it fell back to the cow.
  salmon: { skin: 0xd9735a, shirt: 0xe08a6e, trousers: 0xb85a40, eye: 0x111111 },
  // Squid: a dark navy body with darker tentacles.
  squid: { skin: 0x2c3e50, shirt: 0x2c3e50, trousers: 0x1f2d3d, eye: 0x111111 },
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

// Returns { group, legs, arms, materials, height }. legs and arms are pivots for animation, empty if the kind has none.
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
    // A zombie has a dark torn patch on its shirt.
    if (kind === 'zombie') group.add(part(0.2, 0.2, 0.02, 0x1d3d2a, -0.1, 1.0, 0.16));
    // A villager has a brown hat, and a nose on its pale face.
    if (kind === 'villager') group.add(part(0.56, 0.1, 0.56, 0x6b4a2b, 0, 1.85, 0), part(0.1, 0.1, 0.02, 0xc9a07a, 0, 1.5, 0.27));
    // A creeper has a dark, pixelated face: a mouth and two eyes that stand out from the green.
    if (kind === 'creeper') {
      group.add(part(0.2, 0.12, 0.02, 0x1d3d1f, 0, 1.45, 0.26), part(0.08, 0.08, 0.02, 0x1d3d1f, -0.12, 1.6, 0.26));
    }
    // An enderman has a tall dark body with a purple stripe down the front of its head.
    if (kind === 'enderman') {
      group.add(part(0.06, 0.5, 0.02, 0xb026ff, 0, 1.55, 0.26));
    }
    // A hunter carries a rifle: a dark stock and barrel held out in front, so it reads as a gun.
    if (kind === 'hunter') {
      group.add(part(0.08, 0.1, 0.5, 0x3a2a1a, 0.18, 1.05, 0.32), part(0.06, 0.06, 0.4, 0x222222, 0.18, 1.12, 0.6));
    }
    return { group, legs: [legL, legR], arms: [armL, armR], materials, height: 1.9 };
  }

  // Squid: a round mantle with a pair of eyes and eight tentacles hanging below. No legs, so nothing swings.
  if (kind === 'squid') {
    const mantle = part(0.5, 0.6, 0.5, p.shirt, 0, 0.6, 0);
    const eyeL = part(0.1, 0.1, 0.02, p.eye, 0.25, 0.7, -0.12);
    const eyeR = part(0.1, 0.1, 0.02, p.eye, 0.25, 0.7, 0.12);
    group.add(mantle, eyeL, eyeR);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      group.add(part(0.06, 0.4, 0.06, p.trousers, Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15));
    }
    return { group, legs: [], arms: [], materials, height: 0.8 };
  }

  // Fish: a flat body with a tail fin and two side fins. No legs, so nothing swings.
  if (kind === 'fish' || kind === 'salmon' || shape === 'fish') {
    const body = part(0.6, 0.3, 0.3, p.shirt, 0, 0.15, 0);
    const head = part(0.2, 0.25, 0.25, p.skin, 0.36, 0.15, 0);
    const tail = part(0.2, 0.3, 0.05, p.trousers, -0.38, 0.15, 0);
    const finL = part(0.15, 0.04, 0.12, p.trousers, 0, 0.3, 0.12);
    // A fish has a dark eye on each side of its head, and a pale gill stripe behind it.
    const eyeL = part(0.05, 0.05, 0.02, p.eye, 0.44, 0.2, -0.11);
    const eyeR = part(0.05, 0.05, 0.02, p.eye, 0.44, 0.2, 0.11);
    const gill = part(0.03, 0.2, 0.26, p.skin, 0.2, 0.15, 0);
    // A small dorsal fin on the back, so the plain fish reads as more than a box.
    const dorsal = part(0.2, 0.1, 0.04, p.trousers, -0.05, 0.32, 0);
    group.add(body, head, tail, finL, eyeL, eyeR, gill, dorsal);
    // Water kinds from the catalogue add their own marks, so each one reads as itself.
    const water = WATER_FEATURES[kind];
    if (water) water(part, group, p);
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
    // A pig has a short curly tail, and dark eyes on the front of its head.
    const tail = part(0.12, 0.12, 0.06, p.skin, -0.45, 0.7, 0);
    const eyeL = part(0.05, 0.05, 0.02, p.eye, 0.72, 0.72, -0.12);
    const eyeR = part(0.05, 0.05, 0.02, p.eye, 0.72, 0.72, 0.12);
    group.add(body, head, snout, tail, eyeL, eyeR);
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
    // A rabbit has dark eyes, a pink nose, and a small white cotton tail at the back.
    const eyeL = part(0.05, 0.05, 0.02, p.eye, 0.33, 0.6, -0.08);
    const eyeR = part(0.05, 0.05, 0.02, p.eye, 0.33, 0.6, 0.08);
    const nose = part(0.04, 0.04, 0.04, 0xe8a6a6, 0.33, 0.52, 0);
    const cotton = part(0.1, 0.1, 0.1, 0xf4f4f4, -0.22, 0.38, 0);
    group.add(body, head, earL, earR, eyeL, eyeR, nose, cotton);
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
    // Wings on each side of the body, a tail of feathers at the back, and dark eyes beside the beak.
    const wingL = part(0.25, 0.2, 0.04, p.shirt, -0.02, 0.42, -0.2);
    const wingR = part(0.25, 0.2, 0.04, p.shirt, -0.02, 0.42, 0.2);
    const feathers = part(0.12, 0.2, 0.25, p.shirt, -0.26, 0.5, 0);
    const eyeL = part(0.04, 0.04, 0.02, p.eye, 0.2, 0.7, -0.1);
    const eyeR = part(0.04, 0.04, 0.02, p.eye, 0.2, 0.7, 0.1);
    group.add(body, head, comb, beak, wingL, wingR, feathers, eyeL, eyeR);
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
    // A pale belly stripe, a second flipper, a blowhole on top, and a dark stripe along the back.
    const belly = part(0.8, 0.08, 0.3, p.shirt, 0, 0.1, 0);
    const finR = part(0.25, 0.04, 0.12, p.fin, 0.1, 0.12, 0.25);
    const blowhole = part(0.06, 0.04, 0.06, p.eye, 0.2, 0.52, 0);
    const backStripe = part(0.7, 0.04, 0.12, p.fin, 0, 0.5, 0);
    group.add(body, snout, dorsal, tail, finL, eye, belly, finR, blowhole, backStripe);
    return { group, legs: [], arms: [], materials, height: 0.5 };
  }

  // Blob: a round body with a small head on top and no legs, so it bobs rather than walks. Used by the bees,
  // parrots and other round catalogue mobs.
  if (shape === 'blob') {
    const body = part(0.6, 0.6, 0.6, p.shirt, 0, 0.4, 0);
    const top = part(0.3, 0.2, 0.3, p.skin, 0, 0.8, 0);
    const eye = part(0.06, 0.06, 0.02, p.eye, 0.1, 0.45, 0.31);
    group.add(body, top, eye);
    // A bee has two dark stripes, two wings and two antennae. A parrot has a blue tail, green wings, and a beak.
    if (kind === 'bee') {
      group.add(part(0.62, 0.1, 0.62, 0x2a2a2a, 0, 0.3, 0), part(0.62, 0.1, 0.62, 0x2a2a2a, 0, 0.5, 0));
      group.add(part(0.3, 0.02, 0.2, 0xe8f4ff, -0.05, 0.7, -0.22), part(0.3, 0.02, 0.2, 0xe8f4ff, -0.05, 0.7, 0.22));
      group.add(part(0.02, 0.14, 0.02, 0x222222, 0.08, 1.0, 0.06), part(0.02, 0.14, 0.02, 0x222222, 0.08, 1.0, -0.06));
    }
    if (kind === 'parrot') {
      group.add(part(0.3, 0.2, 0.06, 0x2a7ab0, -0.3, 0.35, 0), part(0.08, 0.3, 0.2, 0x2a8a3a, 0, 0.45, -0.3), part(0.06, 0.08, 0.06, 0xe8b33a, 0.2, 0.5, 0));
      // A crest of feathers on top of the head, two dark eyes, and red wing tips.
      group.add(part(0.2, 0.08, 0.06, 0xd9342b, 0.05, 0.75, 0), part(0.04, 0.04, 0.02, p.eye, 0.12, 0.58, -0.1), part(0.04, 0.04, 0.02, p.eye, 0.12, 0.58, 0.1));
      group.add(part(0.08, 0.06, 0.1, 0xd9342b, -0.05, 0.25, -0.3));
    }
    return { group, legs: [], arms: [], materials, height: 0.8 };
  }

  // Wolf: a long lean body, a head with a pointed snout, two upright ears, a bushy tail, and red eyes.
  if (kind === 'wolf') {
    const body = part(0.8, 0.36, 0.4, p.shirt, 0, 0.55, 0);
    const head = part(0.34, 0.32, 0.32, p.skin, 0.52, 0.72, 0);
    const snout = part(0.18, 0.12, 0.18, p.trousers, 0.72, 0.66, 0);
    const nose = part(0.05, 0.05, 0.05, 0x111111, 0.82, 0.68, 0);
    const earL = part(0.08, 0.14, 0.06, p.trousers, 0.5, 0.92, -0.1);
    const earR = part(0.08, 0.14, 0.06, p.trousers, 0.5, 0.92, 0.1);
    // Red eyes, set on the front of the head.
    const eyeL = part(0.05, 0.05, 0.03, 0xff1a1a, 0.7, 0.8, -0.1);
    const eyeR = part(0.05, 0.05, 0.03, 0xff1a1a, 0.7, 0.8, 0.1);
    const tail = part(0.28, 0.1, 0.1, p.shirt, -0.5, 0.7, 0);
    const legs = [];
    for (const [x, z] of [[-0.28, -0.14], [-0.28, 0.14], [0.28, -0.14], [0.28, 0.14]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.3, z);
      leg.add(part(0.1, 0.3, 0.1, p.trousers, 0, -0.15, 0));
      legs.push(leg);
      group.add(leg);
    }
    group.add(body, head, snout, nose, earL, earR, eyeL, eyeR, tail);
    return { group, legs, arms: [], materials, height: 0.9 };
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
  // Cow: two small pale horns on top of the head.
  const hornL = part(0.06, 0.12, 0.06, 0xe8e0c8, 0.5, 0.97, -0.14);
  const hornR = part(0.06, 0.12, 0.06, 0xe8e0c8, 0.5, 0.97, 0.14);
  group.add(body, patchA, patchB, head, nose, hornL, hornR);
  // Catalogue quadrupeds share this body, so each one gets its own features on top of it. The features are placed
  // from the body's centre, so a kind with a tall head, a shell, or a tail reads as itself.
  // Sheep: a woolly top and dark eyes, so it reads as a sheep and not a plain white cow.
  if (kind === 'sheep') {
    group.add(part(0.46, 0.14, 0.46, p.shirt, -0.05, 0.92, 0), part(0.06, 0.06, 0.02, p.eye, 0.76, 0.8, -0.1), part(0.06, 0.06, 0.02, p.eye, 0.76, 0.8, 0.1));
  }
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

// Extra parts for the catalogue water kinds, drawn on the fish body. Each one adds its own mark.
const WATER_FEATURES = {
  salmon: (part, g, p) => { g.add(part(0.5, 0.05, 0.02, 0xb85a40, 0, 0.2, 0.16)); },
  axolotl: (part, g, p) => { g.add(part(0.04, 0.12, 0.04, 0xd9708f, 0.28, 0.2, -0.16), part(0.04, 0.12, 0.04, 0xd9708f, 0.28, 0.2, 0.16), part(0.04, 0.1, 0.04, 0xd9708f, 0.22, 0.24, -0.1), part(0.04, 0.1, 0.04, 0xd9708f, 0.22, 0.24, 0.1)); },
  tadpole: (part, g, p) => { g.add(part(0.4, 0.06, 0.04, p.trousers, -0.1, 0.33, 0)); },
  glow_squid: (part, g, p) => { g.add(part(0.1, 0.1, 0.02, 0x9ff7ff, 0.1, 0.15, -0.16), part(0.1, 0.1, 0.02, 0x9ff7ff, 0.1, 0.15, 0.16)); },
  pufferfish: (part, g, p) => { g.add(part(0.05, 0.05, 0.05, 0x8a7a2a, -0.1, 0.32, 0), part(0.05, 0.05, 0.05, 0x8a7a2a, 0.1, 0.32, 0), part(0.05, 0.05, 0.05, 0x8a7a2a, 0, 0.15, 0.17)); },
  cod: (part, g, p) => { g.add(part(0.1, 0.06, 0.02, 0x5a5a50, 0.05, 0.2, -0.16), part(0.08, 0.05, 0.02, 0x5a5a50, -0.12, 0.12, 0.16)); },
  tropical_fish: (part, g, p) => { g.add(part(0.04, 0.3, 0.32, 0xffffff, 0.12, 0.15, 0), part(0.04, 0.3, 0.32, 0xffffff, -0.14, 0.15, 0)); },
  manta_ray: (part, g, p) => { g.add(part(0.7, 0.04, 1.0, p.shirt, 0, 0.1, 0)); },
  whale: (part, g, p) => { g.add(part(0.3, 0.05, 0.4, p.trousers, -0.4, 0.25, 0), part(0.2, 0.12, 0.2, p.shirt, 0.1, 0.36, 0)); },
  seal: (part, g, p) => { g.add(part(0.14, 0.04, 0.2, p.trousers, 0.15, 0.04, -0.22), part(0.14, 0.04, 0.2, p.trousers, 0.15, 0.04, 0.22)); },
  otter: (part, g, p) => { g.add(part(0.3, 0.06, 0.2, 0xe8dcc0, 0.05, 0.02, 0)); },
  crab: (part, g, p) => { g.add(part(0.12, 0.12, 0.12, p.shirt, 0.34, 0.3, -0.12), part(0.1, 0.1, 0.22, p.shirt, 0.42, 0.1, -0.25), part(0.1, 0.1, 0.22, p.shirt, 0.42, 0.1, 0.25)); },
  sea_turtle: (part, g, p) => { g.add(part(0.6, 0.12, 0.5, 0x4a6a3a, 0, 0.36, 0)); },
  stingray: (part, g, p) => { g.add(part(0.6, 0.02, 0.02, p.trousers, -0.6, 0.05, 0)); },
  narwhal: (part, g, p) => { g.add(part(0.5, 0.04, 0.04, 0xf4f4f0, 0.6, 0.2, 0)); },
  orca: (part, g, p) => { g.add(part(0.08, 0.3, 0.06, p.trousers, 0, 0.45, 0), part(0.4, 0.1, 0.14, 0xf4f4f4, 0, 0.02, 0.16)); },
};
