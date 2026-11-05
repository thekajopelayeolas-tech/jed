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
  // Rabbit: warm brown coat, cream underside, pink nose and bright eyes.
  rabbit: { skin: 0xc99a68, shirt: 0xb98555, trousers: 0x795335, eye: 0x20170f },
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
  // Armour stand: a base, a pole, and a crossbar.
  if (kind === 'armour_stand') {
    part(0.6, 0.1, 0.6, 0x5a4a3a, 0, 0.05, 0); // Base
    part(0.1, 1.2, 0.1, 0x5a4a3a, 0, 0.7, 0);   // Pole
    part(0.8, 0.1, 0.1, 0x5a4a3a, 0, 1.2, 0);   // Crossbar
    return { group, legs: [], arms: [], materials, height: 1.8 };
  }

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
    const nostrilL = part(0.025, 0.045, 0.04, 0x66383a, 0.79, 0.61, -0.055);
    const nostrilR = part(0.025, 0.045, 0.04, 0x66383a, 0.79, 0.61, 0.055);
    const earL = part(0.12, 0.16, 0.08, p.skin, 0.44, 0.94, -0.14);
    const earR = part(0.12, 0.16, 0.08, p.skin, 0.44, 0.94, 0.14);
    const innerEarL = part(0.06, 0.09, 0.02, 0xc76c76, 0.47, 0.95, -0.19);
    const innerEarR = part(0.06, 0.09, 0.02, 0xc76c76, 0.47, 0.95, 0.19);
    const legs = [];
    for (const [x, z] of [[-0.25, -0.18], [-0.25, 0.18], [0.25, -0.18], [0.25, 0.18]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.3, z);
      leg.add(part(0.14, 0.3, 0.14, p.trousers, 0, -0.15, 0));
      legs.push(leg);
      group.add(leg);
    }
    // A pig has a short curly tail, and dark eyes on the front of its head.
    // A curled tail is built from short segments instead of a single stub.
    const tail = new THREE.Group();
    tail.position.set(-0.4, 0.66, 0);
    tail.add(part(0.08, 0.08, 0.06, p.skin, -0.06, 0.02, 0));
    tail.add(part(0.06, 0.1, 0.06, p.skin, -0.1, 0.09, 0));
    tail.add(part(0.06, 0.08, 0.06, p.skin, -0.04, 0.16, 0));
    const eyeL = part(0.05, 0.05, 0.02, p.eye, 0.72, 0.72, -0.12);
    const eyeR = part(0.05, 0.05, 0.02, p.eye, 0.72, 0.72, 0.12);
    group.add(body, head, snout, nostrilL, nostrilR, earL, earR, innerEarL, innerEarR, tail, eyeL, eyeR);
    return { group, legs, arms: [], tail, materials, height: 0.9 };
  }

  // Rabbit: compact body, tall separated ears, cheek puffs, whiskers, buck teeth and four feet.
  if (kind === 'rabbit') {
    const body = part(0.48, 0.34, 0.34, p.shirt, -0.02, 0.36, 0);
    const rump = part(0.2, 0.27, 0.35, p.trousers, -0.19, 0.38, 0);
    const belly = part(0.28, 0.09, 0.29, 0xe9d9c1, 0.02, 0.19, 0);
    const head = part(0.31, 0.3, 0.3, p.skin, 0.23, 0.58, 0);
    const earL = new THREE.Group();
    const earR = new THREE.Group();
    earL.position.set(0.16, 0.72, -0.105);
    earR.position.set(0.16, 0.72, 0.105);
    earL.rotation.x = -0.12;
    earR.rotation.x = 0.12;
    earL.add(part(0.075, 0.38, 0.08, p.skin, 0, 0.19, 0));
    earR.add(part(0.075, 0.38, 0.08, p.skin, 0, 0.19, 0));
    const innerEarL = part(0.02, 0.29, 0.035, 0xe7a6a0, 0.045, 0.19, 0);
    const innerEarR = part(0.02, 0.29, 0.035, 0xe7a6a0, 0.045, 0.19, 0);
    earL.add(innerEarL);
    earR.add(innerEarR);
    const legs = [];
    for (const [x, z, hind] of [[-0.14, -0.12, true], [-0.14, 0.12, true], [0.12, -0.12, false], [0.12, 0.12, false]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.23, z);
      leg.add(part(hind ? 0.16 : 0.11, hind ? 0.21 : 0.17, 0.12, p.trousers, 0, -0.08, 0));
      leg.add(part(0.15, 0.07, 0.12, 0xe9d9c1, 0.055, -0.18, 0));
      legs.push(leg);
      group.add(leg);
    }
    // Eyes sit on the side/front of the face with a white glint so they remain readable in dim scenes.
    const eyeL = part(0.035, 0.07, 0.035, 0xf7ead5, 0.34, 0.63, -0.13);
    const eyeR = part(0.035, 0.07, 0.035, 0xf7ead5, 0.34, 0.63, 0.13);
    const pupilL = part(0.025, 0.045, 0.025, p.eye, 0.36, 0.63, -0.14);
    const pupilR = part(0.025, 0.045, 0.025, p.eye, 0.36, 0.63, 0.14);
    const muzzleL = part(0.12, 0.1, 0.12, 0xf1e3cc, 0.39, 0.51, -0.055);
    const muzzleR = part(0.12, 0.1, 0.12, 0xf1e3cc, 0.39, 0.51, 0.055);
    const nose = part(0.05, 0.045, 0.07, 0xe58f98, 0.46, 0.55, 0);
    const mouth = part(0.018, 0.065, 0.018, 0x62463d, 0.455, 0.48, 0);
    const toothL = part(0.035, 0.05, 0.025, 0xfff5dc, 0.45, 0.435, -0.018);
    const toothR = part(0.035, 0.05, 0.025, 0xfff5dc, 0.45, 0.435, 0.018);
    const whiskerL = part(0.012, 0.012, 0.2, 0xe3d5bf, 0.4, 0.51, -0.15);
    const whiskerR = part(0.012, 0.012, 0.2, 0xe3d5bf, 0.4, 0.51, 0.15);
    const cotton = part(0.16, 0.16, 0.16, 0xf7f3e8, -0.29, 0.42, 0);
    group.add(body, rump, belly, head, earL, earR, eyeL, eyeR, pupilL, pupilR, muzzleL, muzzleR, nose, mouth, toothL, toothR, whiskerL, whiskerR, cotton);
    group.scale.y = 0.65;
    return { group, legs, arms: [], ears: [earL, earR], materials, height: 0.72 };
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
    const wattle = part(0.06, 0.1, 0.05, 0xd9342b, 0.24, 0.53, 0);
    const toeL = part(0.1, 0.035, 0.04, p.trousers, 0.035, 0.025, -0.08);
    const toeR = part(0.1, 0.035, 0.04, p.trousers, 0.035, 0.025, 0.08);
    group.add(body, head, comb, beak, wingL, wingR, feathers, eyeL, eyeR, wattle, toeL, toeR);
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
  const isSheep = kind === 'sheep';
  const body = part(0.9, 0.5, 0.5, isSheep ? 0x9b866f : p.shirt, 0, 0.6, 0);
  const patchA = isSheep ? null : part(0.3, 0.3, 0.52, p.patch, -0.2, 0.7, 0);
  const patchB = isSheep ? null : part(0.2, 0.2, 0.52, p.patch, 0.2, 0.55, 0);
  const head = part(0.4, 0.4, 0.4, p.skin, 0.55, 0.75, 0);
  const nose = part(0.1, 0.12, 0.2, p.nose, 0.78, 0.68, 0);
  const eyeL = part(0.025, 0.065, 0.065, p.eye, 0.755, 0.82, -0.13);
  const eyeR = part(0.025, 0.065, 0.065, p.eye, 0.755, 0.82, 0.13);
  const legs = [];
  for (const [x, z] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.35, z);
    leg.add(part(0.15, 0.35, 0.15, p.trousers, 0, -0.17, 0));
    legs.push(leg);
    group.add(leg);
  }
  group.add(body, head, nose, eyeL, eyeR);
  if (!isSheep) group.add(patchA, patchB);
  let wool = null;
  let woolMaterials = [];
  if (isSheep) {
    // Layered fleece rounds out the silhouette. It is independently hidden when the sheep is sheared.
    wool = new THREE.Group();
    wool.name = 'sheep-wool';
    const woolMaterialStart = materials.length;
    wool.add(
      part(0.96, 0.58, 0.56, p.shirt, -0.02, 0.62, 0),
      part(0.3, 0.24, 0.58, p.shirt, -0.32, 0.76, 0),
      part(0.28, 0.25, 0.56, p.shirt, 0.27, 0.72, 0),
      part(0.3, 0.2, 0.42, p.shirt, -0.05, 0.96, 0),
      part(0.3, 0.24, 0.34, p.shirt, 0.43, 0.82, 0),
    );
    woolMaterials = materials.slice(woolMaterialStart);
    group.add(wool);
  }
  // Only cows have horns; giving every catalogue quadruped horns made the shared body look like a cow costume.
  if (kind === 'cow') {
    const hornL = part(0.06, 0.12, 0.06, 0xe8e0c8, 0.5, 0.97, -0.14);
    const hornR = part(0.06, 0.12, 0.06, 0xe8e0c8, 0.5, 0.97, 0.14);
    group.add(hornL, hornR);
    // A small udder and teats under the belly distinguish a cow's silhouette from other quadrupeds.
    group.add(part(0.22, 0.13, 0.2, 0xe7a6a6, -0.05, 0.31, 0));
    for (const z of [-0.07, 0.07]) group.add(part(0.035, 0.1, 0.035, 0xe7a6a6, -0.02, 0.22, z));
  }
  // Catalogue quadrupeds share this body, so each one gets its own features on top of it. The features are placed
  // from the body's centre, so a kind with a tall head, a shell, or a tail reads as itself.
  // Sheep: a woolly top and dark eyes, so it reads as a sheep and not a plain white cow.
  if (kind === 'sheep') {
    group.add(part(0.07, 0.1, 0.06, p.skin, 0.4, 0.84, -0.22), part(0.07, 0.1, 0.06, p.skin, 0.4, 0.84, 0.22));
  }
  const feature = QUAD_FEATURES[kind];
  if (feature) feature(part, group, p);
  return { group, legs, arms: [], wool, woolMaterials, materials, height: 0.9 };
}

// Extra parts for the catalogue quadrupeds. Each adds a feature that sets it apart from the others.
const QUAD_FEATURES = {
  horse: (part, g, p) => {
    g.add(part(0.12, 0.6, 0.14, p.trousers, 0.62, 0.95, 0), part(0.1, 0.12, 0.3, p.trousers, 0.7, 0.9, 0));
    g.add(part(0.08, 0.14, 0.07, p.trousers, 0.55, 1.03, -0.12), part(0.08, 0.14, 0.07, p.trousers, 0.55, 1.03, 0.12));
    g.add(part(0.16, 0.38, 0.32, p.trousers, 0.34, 1.02, 0), part(0.26, 0.08, 0.12, p.trousers, -0.55, 0.58, 0));
    for (const [x, z] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) g.add(part(0.17, 0.1, 0.17, 0x332820, x, 0.03, z));
  },
  donkey: (part, g, p) => { g.add(part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, 0.12), part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, -0.12)); },
  mule: (part, g, p) => { g.add(part(0.12, 0.55, 0.14, p.trousers, 0.62, 0.95, 0), part(0.1, 0.4, 0.08, p.trousers, 0.58, 1.0, 0.12)); },
  llama: (part, g, p) => { g.add(part(0.12, 0.4, 0.12, p.skin, 0.52, 1.1, 0), part(0.14, 0.2, 0.16, p.skin, 0.58, 1.3, 0)); },
  goat: (part, g, p) => { g.add(part(0.05, 0.22, 0.05, 0xd9d4c4, 0.5, 1.0, 0.1), part(0.05, 0.22, 0.05, 0xd9d4c4, 0.5, 1.0, -0.1), part(0.1, 0.16, 0.08, p.trousers, 0.67, 0.58, 0)); },
  camel: (part, g, p) => { g.add(part(0.3, 0.3, 0.3, p.shirt, 0, 1.0, 0)); },
  sniffer: (part, g, p) => { g.add(part(0.3, 0.12, 0.12, p.trousers, 0.85, 0.7, 0)); },
  armadillo: (part, g, p) => { g.add(part(0.85, 0.3, 0.5, 0x8a5a3a, -0.02, 0.85, 0)); },
  ocelot: (part, g, p) => { g.add(part(0.04, 0.3, 0.04, p.trousers, -0.65, 0.7, 0)); },
  cat: (part, g, p) => { g.add(part(0.05, 0.25, 0.05, p.trousers, -0.65, 0.8, 0)); },
  fox: (part, g, p) => { g.add(part(0.08, 0.14, 0.08, p.trousers, 0.5, 1.05, 0.1), part(0.08, 0.14, 0.08, p.trousers, 0.5, 1.05, -0.1), part(0.3, 0.12, 0.12, p.shirt, -0.6, 0.6, 0)); },
  panda: (part, g, p) => {
    g.add(part(0.14, 0.14, 0.14, 0x2a2a2a, 0.55, 1.0, 0.15), part(0.14, 0.14, 0.14, 0x2a2a2a, 0.55, 1.0, -0.15));
    g.add(part(0.04, 0.28, 0.1, 0x2a2a2a, 0.76, 0.76, 0.12), part(0.04, 0.28, 0.1, 0x2a2a2a, 0.76, 0.76, -0.12));
  },
  polar_bear: (part, g, p) => { g.add(part(0.4, 0.4, 0.4, p.skin, 0.1, 0.9, 0)); },
  turtle: (part, g, p) => {
    g.add(part(0.76, 0.2, 0.62, 0x4a6a3a, -0.02, 0.91, 0));
    g.add(part(0.54, 0.1, 0.44, 0x6a8a4a, -0.02, 1.04, 0), part(0.1, 0.22, 0.08, 0x6a8a4a, 0.65, 0.75, 0));
    g.add(part(0.07, 0.07, 0.07, p.eye, 0.69, 0.81, -0.14), part(0.07, 0.07, 0.07, p.eye, 0.69, 0.81, 0.14));
  },
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
