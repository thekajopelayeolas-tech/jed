// The shield is worn in the armour column, in the slot under the boots. Only a shield goes there, and the shield
// still blocks attacks from the front when it is raised.
import { emptyArmour, PARTS, armourInfo } from '../src/armour.js';
import { BLOCK } from '../src/blocks.js';
import { damageThroughShield } from '../src/combat.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// The armour column has a shield slot under the boots.
check('the armour column has a shield part', PARTS.includes('shield'));
check('the shield part comes after the boots', PARTS.indexOf('shield') === PARTS.indexOf('boots') + 1);
check('an empty armour column has an empty shield slot', emptyArmour().shield === BLOCK.AIR);

// A shield is the only item that goes in the shield slot, and it counts as defence for that slot.
check('a shield is recognised as the shield part', armourInfo(BLOCK.SHIELD)?.part === 'shield');
check('a stone is not accepted as a shield', armourInfo(BLOCK.STONE) === null);

// The shield is worn in the armour column: putting one in the shield slot is what makes the shield raisable.
import { Inventory } from '../src/inventory.js';
{
  const inv = new Inventory();
  // The game links the worn armour once, so a shield in the shield slot is the worn shield.
  inv.wornArmour = { helmet: BLOCK.AIR, chest: BLOCK.AIR, legs: BLOCK.AIR, boots: BLOCK.AIR, shield: BLOCK.AIR };
  check('no shield is worn at the start', !inv.hasOffhandShield());
  inv.slots[2] = { id: BLOCK.SHIELD, count: 1 };
  check('a shield from the hotbar goes into the shield slot', inv.equipOffhand(2) === true);
  check('the worn shield is read from the shield slot', inv.hasOffhandShield() === true);
  check('the shield is also worn in the armour column', inv.wornArmour?.shield === BLOCK.SHIELD);
  check('a second shield does not go in the full shield slot', (inv.slots[4] = { id: BLOCK.SHIELD, count: 1 }) && inv.equipOffhand(4) === false);
  inv.slots = inv.slots.map(() => ({ id: BLOCK.AIR, count: 0 }));
  check('the shield returns to the inventory', inv.unequipOffhand() === true && !inv.hasOffhandShield());
}

// The shield still stops a hit from the front, and does nothing from the side or back.
check('a raised shield blocks a front hit', damageThroughShield(6, true, true) === 0);
check('a shield does not block a side hit', damageThroughShield(6, true, false) === 6);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
