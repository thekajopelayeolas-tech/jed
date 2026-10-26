import * as THREE from 'three';
import { PLAYER_SKIN, PLAYER_SHIRT, PLAYER_TROUSERS, PLAYER_HAIR, armourLook } from './character.js';

// Builds the blocky player: head with hair, body, two arms, two legs. Armour is a slightly larger shell
// over the matching part, so it reads as a layer over the clothes. The right hand is a pivot for the held item.
// Returns { group, parts, hand, shells, materials }.
const rgb = (c) => new THREE.Color(c[0], c[1], c[2]);

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

  // Armour shells: one per part, hidden until a piece is worn. Each is a little larger than the body part.
  const shellSpec = {
    helmet: { parent: head, w: 0.56, h: 0.56, d: 0.56, x: 0, y: 0.02, z: 0 },
    chest: { parent: body, w: 0.56, h: 0.74, d: 0.36, x: 0, y: 0, z: 0 },
    legs: { parent: body, w: 0.56, h: 0.36, d: 0.36, x: 0, y: -0.52, z: 0 },
    boots: { parent: group, w: 0.24, h: 0.2, d: 0.24, x: 0, y: 0.1, z: 0 },
  };
  for (const [part, s] of Object.entries(shellSpec)) {
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(s.w, s.h, s.d),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    shell.visible = false;
    shell.position.set(s.x, s.y, s.z);
    s.parent.add(shell);
    shells[part] = shell;
  }
  // Boots sit on the feet: one shell per leg.
  const bootL = shells.boots.clone();
  bootL.position.set(-0.13, 0.04, 0);
  legL.add(bootL);
  const bootR = shells.boots.clone();
  bootR.position.set(0.13, 0.04, 0);
  legR.add(bootR);
  shells.bootsLeft = bootL;
  shells.bootsRight = bootR;
  group.remove(shells.boots);
  delete shells.boots;

  return { group, parts, hand, shells };
}

// Applies the worn armour to the shells: a material's colour shows, and no armour hides the shell.
export function applyArmour(model, worn) {
  const look = armourLook(worn);
  const set = (shell, entry) => {
    if (!shell) return;
    shell.visible = !!entry;
    if (entry) shell.material.color.setRGB(entry.colour[0], entry.colour[1], entry.colour[2]);
  };
  set(model.shells.helmet, look.helmet);
  set(model.shells.chest, look.chest);
  set(model.shells.legs, look.legs);
  set(model.shells.bootsLeft, look.boots);
  set(model.shells.bootsRight, look.boots);
}
