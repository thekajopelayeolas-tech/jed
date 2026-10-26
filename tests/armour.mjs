import { BLOCK } from '../src/blocks.js';
import { ARMOUR_SETS, armourInfo, emptyArmour, defencePoints, damageReduction, MAX_REDUCTION } from '../src/armour.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Every material has all four pieces, and each piece is recognised as armour for the right part.
const parts = ['helmet', 'chest', 'legs', 'boots'];
const materials = Object.keys(ARMOUR_SETS);
check('four materials: wood, stone, iron, diamond', materials.join(',') === 'wood,stone,iron,diamond');
const complete = materials.every((m) => parts.every((p) => armourInfo(ARMOUR_SETS[m].ids[p])?.part === p));
check('every material has all four pieces recognised by part', complete);

// A non-armour item is not armour.
check('a stick is not armour', armourInfo(BLOCK.STICK) === null);
check('iron ingot is not armour', armourInfo(BLOCK.IRON_INGOT) === null);

// Empty armour gives no protection.
const none = emptyArmour();
check('no armour gives 0 defence', defencePoints(none) === 0);
check('no armour gives 0% reduction', damageReduction(none) === 0);

// Full diamond set: 3 + 4 + 3 + 2 = 12 defence, 48% reduction.
const diamond = { helmet: BLOCK.DIAMOND_HELMET, chest: BLOCK.DIAMOND_CHEST, legs: BLOCK.DIAMOND_LEGS, boots: BLOCK.DIAMOND_BOOTS };
check('full diamond set gives 12 defence', defencePoints(diamond) === 12);
check('full diamond set reduces damage by 48%', Math.abs(damageReduction(diamond) - 0.48) < 1e-9);

// Better materials protect more than worse ones (full set comparison).
const full = (m) => ({ helmet: ARMOUR_SETS[m].ids.helmet, chest: ARMOUR_SETS[m].ids.chest, legs: ARMOUR_SETS[m].ids.legs, boots: ARMOUR_SETS[m].ids.boots });
const d = (m) => defencePoints(full(m));
check('defence rises wood < stone < iron < diamond', d('wood') < d('stone') && d('stone') < d('iron') && d('iron') < d('diamond'));

// Reduction is capped so the player always takes some damage.
check('reduction is capped at 80%', damageReduction(diamond) <= MAX_REDUCTION);

// Mixed set: wood helmet and iron chest only.
const mixed = { ...emptyArmour(), helmet: BLOCK.WOODEN_HELMET, chest: BLOCK.IRON_CHEST };
check('mixed set counts each piece (1 + 4 = 5 defence)', defencePoints(mixed) === 5);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
