import { armourLook, heldLook, MATERIAL_COLOURS } from '../src/character.js';
import { buildPlayerModel, applyArmour } from '../src/character-model.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// No armour: every part shows plain clothing (null).
{
  const look = armourLook({ helmet: 0, chest: 0, legs: 0, boots: 0 });
  check('no armour gives no look on any part', Object.values(look).every((v) => v === null));
}

// Diamond helmet tints the helmet part with the diamond colour, and leaves the other parts bare.
{
  const look = armourLook({ helmet: BLOCK.DIAMOND_HELMET, chest: 0, legs: 0, boots: 0 });
  check('a diamond helmet is recognised as diamond', look.helmet?.material === 'diamond');
  check('the helmet uses the diamond colour', look.helmet && look.helmet.colour.every((c, i) => c === MATERIAL_COLOURS.diamond[i]));
  check('the chest stays bare with no chest armour', look.chest === null);
}

// Iron chest and wood legs get their own materials.
{
  const look = armourLook({ helmet: 0, chest: BLOCK.IRON_CHEST, legs: BLOCK.WOODEN_LEGS, boots: 0 });
  check('iron chest is recognised as iron', look.chest?.material === 'iron');
  check('wooden leggings are recognised as wood', look.legs?.material === 'wood');
}

// Held item: empty hand and empty stack hold nothing.
check('an empty hand holds nothing', heldLook({ id: BLOCK.AIR, count: 0 }) === null);
check('an empty stack holds nothing', heldLook({ id: BLOCK.STONE, count: 0 }) === null);
check('no item holds nothing', heldLook(null) === null);

// Holding a block records that it is a block, with its name.
{
  const h = heldLook({ id: BLOCK.STONE, count: 5 });
  check('holding stone reports the name Stone', h?.name === 'Stone');
  check('stone is held as a block', h?.isBlock === true);
}

// Holding a tool or food: not a block, so it is shown as a flat card.
{
  const sword = heldLook({ id: BLOCK.IRON_SWORD, count: 1 });
  check('holding a sword is not a block (flat card)', sword?.isBlock === false);
  const beef = heldLook({ id: BLOCK.COOKED_BEEF, count: 1 });
  check('holding cooked beef is named', beef?.name === 'Cooked Beef');
}

// The model: applying armour shows exactly the worn pieces.
{
  const m = buildPlayerModel();
  applyArmour(m, { helmet: BLOCK.IRON_HELMET, chest: 0, legs: BLOCK.IRON_LEGS, boots: 0 });
  check('a worn helmet shows its shell', m.shells.helmet.visible === true);
  check('a worn chest is not shown when empty', m.shells.chest.visible === false);
  check('worn leggings show their shell', m.shells.legs.visible === true);
  check('no boots means both boot shells are hidden', m.shells.bootsLeft.visible === false && m.shells.bootsRight.visible === false);
  // A shell is a group of boxes now, so check the colour on every box in it.
  const boxes = [];
  m.shells.helmet.traverse((o) => { if (o.material) boxes.push(o); });
  check('the armour colour is applied to every helmet box', boxes.length > 1 && boxes.every((o) => Math.abs(o.material.color.r - MATERIAL_COLOURS.iron[0]) < 0.01));
}

// Taking armour off hides the shell again.
{
  const m = buildPlayerModel();
  applyArmour(m, { helmet: BLOCK.IRON_HELMET, chest: 0, legs: 0, boots: 0 });
  applyArmour(m, { helmet: 0, chest: 0, legs: 0, boots: 0 });
  check('removing a helmet hides its shell', m.shells.helmet.visible === false);
}

// The model has a hand for holding items.
{
  const m = buildPlayerModel();
  check('the model has a hand to hold items', !!m.hand && !!m.parts.armRight);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
