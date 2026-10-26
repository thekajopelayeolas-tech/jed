import { World } from '../src/world.js';
import { MobManager, MOB, Mob } from '../src/mobs.js';
import { Inventory } from '../src/inventory.js';
import { Player } from '../src/player.js';
import { saveGame, loadGame } from '../src/save.js';
import { BLOCK } from '../src/blocks.js';
import * as THREE from 'three';

// Minimal localStorage mock for Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const added = [];
const scene = { add: (o) => added.push(o), remove() {} };
const mockMat = {};
const w = new World(scene, 1337, mockMat, mockMat);
w.update(8, 8, 2, 25);

// Mobs: zombies must not spawn in daylight. A surface cell in the open is lit by the sky, so the spawn is refused.
const mm = new MobManager(scene, w);
const spawnPos = new THREE.Vector3(8, 0, 8);
for (let i = 0; i < 200; i++) mm.trySpawn(spawnPos, 0.8);
const zombiesInLight = mm.mobs.filter((m) => m.type === MOB.ZOMBIE).length;
console.log('zombies spawned on open ground at night:', zombiesInLight, '(expect 0)');

// Damage a zombie to death. Built directly, so the test does not depend on where spawns land.
const z = new Mob(scene, w, MOB.ZOMBIE, 0.5, 60, 0.5);
console.log('zombie health:', z.health, 'hostile:', z.def.hostile);
z.takeHit(4, 0, 0);
console.log('after 4 damage:', z.health, 'dead:', z.dead);
const died = z.takeHit(10, 0, 0);
console.log('after lethal damage dead:', z.dead, 'returned:', died);

// Player health and invulnerability.
const p = new Player(w, 8, 80, 8);
console.log('hurt first:', p.hurt(3), 'health', p.health);
console.log('hurt again inside cooldown:', p.hurt(3), 'health', p.health);

// Save and load round trip. Edit a block so the chunk is marked modified.
w.setBlock(8, 80, 8, BLOCK.GLASS);
const inv = new Inventory();
inv.add(BLOCK.STONE, 10);
saveGame(w, p, inv, 0.4);
const loaded = loadGame();
console.log('loaded chunks:', Object.keys(loaded?.edits ? Object.fromEntries(loaded.edits) : {}).length);
console.log('loaded inventory stone count:', loaded.inventory.find((s) => s.id === BLOCK.STONE)?.count);
console.log('loaded timeOfDay:', loaded.timeOfDay, 'player health:', loaded.player.health);

// Reload into a fresh world and check the edited block survives.
const w2 = new World(scene, 1337, mockMat, mockMat);
w2.edits = loaded.edits;
w2.update(8, 8, 2, 25);
console.log('edited block after reload:', w2.getBlock(8, 80, 8) === BLOCK.GLASS ? 'GLASS (ok)' : w2.getBlock(8, 80, 8));
