import * as THREE from 'three';
import { PLAYER_SKIN, PLAYER_SHIRT, PLAYER_TROUSERS, PLAYER_HAIR, armourLook } from './character.js';

// Builds the blocky player: head with hair, body, two arms, two legs. Armour is a slightly larger shell
// over the matching part, so it reads as a layer over the clothes. The right hand is a pivot for the held item.
// Returns { group, parts, hand, shells, materials }.
const rgb = (c) => new THREE.Color(c[0], c[1], c[2]);
// How far a boot sits below the leg's origin so its sole meets the foot. Measured from the model (see
// tests/armour_fit.mjs).
const BOOT_DROP = -0.555;

function box(w, h, d, colour, x, y, z, parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: rgb(colour) }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function buildPlayerModel() {
  const group = new THREE.Group();
  const parts = {};
  const shells = {};

  // Head with hair on top.
  const head = new THREE.Group();
  head.position.set(0, 1.55, 0);
  box(0.5, 0.5, 0.5, PLAYER_SKIN, 0, 0, 0, head);
  box(0.52, 0.12, 0.52, PLAYER_HAIR, 0, 0.2, 0, head);
  box(0.08, 0.06, 0.02, [0.1, 0.1, 0.12], -0.12, 0.02, 0.26, head);
  box(0.08, 0.06, 0.02, [0.1, 0.1, 0.12], 0.12, 0.02, 0.26, head);
  group.add(head);
  parts.head = head;

  // Body.
  const body = new THREE.Group();
  body.position.set(0, 1.0, 0);
  box(0.5, 0.7, 0.3, PLAYER_SHIRT, 0, 0, 0, body);
  group.add(body);
  parts.body = body;

  // Arms swing from the shoulders. The right arm holds the item.
  const armL = new THREE.Group();
  armL.position.set(-0.36, 1.3, 0);
  box(0.18, 0.6, 0.18, PLAYER_SKIN, 0, -0.28, 0, armL);
  group.add(armL);
  parts.armLeft = armL;

  const armR = new THREE.Group();
  armR.position.set(0.36, 1.3, 0);
  box(0.18, 0.6, 0.18, PLAYER_SKIN, 0, -0.28, 0, armR);
  group.add(armR);
  parts.armRight = armR;

  // The right hand is at the end of the right arm. Held items attach here.
  const hand = new THREE.Group();
  hand.position.set(0, -0.6, 0.12);
  armR.add(hand);

  // Legs.
  const legL = new THREE.Group();
  legL.position.set(-0.13, 0.65, 0);
  box(0.2, 0.65, 0.2, PLAYER_TROUSERS, 0, -0.32, 0, legL);
  group.add(legL);
  parts.legLeft = legL;

  const legR = new THREE.Group();
  legR.position.set(0.13, 0.65, 0);
  box(0.2, 0.65, 0.2, PLAYER_TROUSERS, 0, -0.32, 0, legR);
  group.add(legR);
  parts.legRight = legR;

  // Armour shells: one per part, hidden until a piece is worn. Each shell is a group of boxes shaped like the
  // real piece (a helmet with a visor, a chestplate with shoulders, leggings with a belt, boots with a cuff),
  // so it reads as armour and not as a block. All boxes in one shell share a colour, set by applyArmour.
  const shellSpec = {
    helmet: { parent: head, y: 0, build: buildHelmet },
    chest: { parent: body, y: 0, build: buildChestplate },
    legs: { parent: body, y: -0.52, build: buildLeggings },
  };
  for (const [part, s] of Object.entries(shellSpec)) {
    const shell = s.build();
    shell.visible = false;
    shell.position.set(0, s.y, 0);
    s.parent.add(shell);
    shells[part] = shell;
  }
  // Boots sit on the feet: one shell per leg.
  // The boot's sole sits on the foot, which is the bottom of the leg (the leg group's origin is 0.65 above the body,
  // and the leg reaches 0.645 below it). The boot is placed so its bottom edge matches the foot.
  const bootL = buildBoots();
  bootL.visible = false;
  bootL.position.set(-0.13, BOOT_DROP, 0);
  legL.add(bootL);
  const bootR = buildBoots();
  bootR.visible = false;
  bootR.position.set(0.13, BOOT_DROP, 0);
  legR.add(bootR);
  shells.bootsLeft = bootL;
  shells.bootsRight = bootR;

  return { group, parts, hand, shells };
}

// Armour pieces. Each returns a group of boxes. Sizes are a little larger than the body part they cover.
// A box with a material for the armour colour, added to a group.
function piece(group, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

// Helmet: a domed cap sitting on the head, a brim at the front that stays above the eyes, and a visor slot.
// Heights are relative to the head centre: the eyes are at 0.02, the head top is at 0.25.
function buildHelmet() {
  const g = new THREE.Group();
  // The dome is 0.2 tall and sits on the top of the head: its bottom is at the head top (0.25), so its top is at 0.45.
  piece(g, 0.58, 0.2, 0.58, 0, 0.35, 0);
  // The brim is a thin band across the forehead, above the eyes.
  piece(g, 0.6, 0.06, 0.2, 0, 0.1, 0.2);
  // The visor slot is a thin strip above the eyes.
  piece(g, 0.46, 0.06, 0.02, 0, 0.14, 0.3);
  return g;
}

// Chestplate: a front and back plate, shoulder pads on each side, and a waist band.
function buildChestplate() {
  const g = new THREE.Group();
  piece(g, 0.58, 0.72, 0.38, 0, 0, 0);
  piece(g, 0.2, 0.16, 0.4, -0.38, 0.28, 0);
  piece(g, 0.2, 0.16, 0.4, 0.38, 0.28, 0);
  piece(g, 0.6, 0.08, 0.4, 0, -0.34, 0);
  return g;
}

// Leggings: a waist band and two leg plates, with a seam down the middle.
function buildLeggings() {
  const g = new THREE.Group();
  piece(g, 0.58, 0.12, 0.38, 0, 0.14, 0);
  piece(g, 0.26, 0.36, 0.38, -0.14, -0.1, 0);
  piece(g, 0.26, 0.36, 0.38, 0.14, -0.1, 0);
  return g;
}

// One boot: a shaft over the ankle, a wider sole, and a cuff at the top.
function buildBoots() {
  const g = new THREE.Group();
  piece(g, 0.26, 0.2, 0.26, 0, 0.0, 0);
  piece(g, 0.28, 0.06, 0.3, 0, -0.1, 0.02);
  piece(g, 0.28, 0.04, 0.28, 0, 0.1, 0);
  return g;
}

// Applies the worn armour to the shells: a material's colour shows, and no armour hides the shell.
// A shell is a group, so the colour goes to every box in it.
export function applyArmour(model, worn) {
  const look = armourLook(worn);
  const set = (shell, entry) => {
    if (!shell) return;
    shell.visible = !!entry;
    if (!entry) return;
    shell.traverse((o) => {
      if (o.material) o.material.color.setRGB(entry.colour[0], entry.colour[1], entry.colour[2]);
    });
  };
  set(model.shells.helmet, look.helmet);
  set(model.shells.chest, look.chest);
  set(model.shells.legs, look.legs);
  set(model.shells.bootsLeft, look.boots);
  set(model.shells.bootsRight, look.boots);
}
