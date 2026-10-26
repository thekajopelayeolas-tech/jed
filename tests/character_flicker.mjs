import { buildPlayerModel, applyArmour } from '../src/character-model.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The character preview walks every armour shell and reads colours from its boxes. A shell is a group of boxes,
// so reading `.material` on the shell itself throws. This follows the same path as character-ui.js.
const boxesOf = (shell) => {
  const out = [];
  shell.traverse((o) => { if (o.material) out.push(o); });
  return out;
};

const m = buildPlayerModel();
applyArmour(m, {
  helmet: BLOCK.DIAMOND_HELMET, chest: BLOCK.IRON_CHEST, legs: BLOCK.WOODEN_LEGS, boots: BLOCK.STONE_BOOTS,
});

let threw = false;
try {
  for (const shell of Object.values(m.shells)) {
    if (!shell.visible) continue;
    for (const box of boxesOf(shell)) {
      const base = box.material.color.clone();
      box.material.color.setRGB(0.2, 1, 1);
      box.material.color.copy(base);
    }
  }
} catch (err) {
  threw = true;
  console.log(err.message);
}
check('flicker over every worn shell does not throw', !threw);

const helmetBoxes = boxesOf(m.shells.helmet);
check('the helmet is made of several boxes', helmetBoxes.length > 1);
check('every helmet box has a material colour', helmetBoxes.every((b) => b.material?.color !== undefined));

// Every shell is a group, so none has a material of its own that the preview could read by mistake.
check('no shell is a bare mesh with a material', Object.values(m.shells).every((s) => s.material === undefined));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
