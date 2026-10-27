// Shields, bows, arrows: the rules and the item setup. Exits non-zero on failure.
import { BLOCK, isItem, BLOCK_DEFS } from '../src/blocks.js';
import { RECIPES } from '../src/inventory.js';
import { itemPixels } from '../src/item-icons.js';
import {
  SHIELD_BLOCK, BOW_FULL_DRAW, ARROW_MIN_DAMAGE, ARROW_MAX_DAMAGE,
  drawAmount, arrowDamage, damageThroughShield, isCombatItem,
} from '../src/combat.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Each new item is an item with a name, a sprite, and a recipe.
for (const [name, id] of [['shield', BLOCK.SHIELD], ['bow', BLOCK.BOW], ['arrow', BLOCK.ARROW]]) {
  check(`${name} is an item with a name and sprite`, isItem(id) && !!BLOCK_DEFS[id]?.name && !!itemPixels(id));
  check(`${name} has a recipe`, RECIPES.some((r) => r.result === id));
  check(`${name} is a combat item`, isCombatItem(id));
}
check('a stick is not a combat item', !isCombatItem(BLOCK.STICK));
check('arrows come out in a stack of four', RECIPES.some((r) => r.result === BLOCK.ARROW && r.count === 4));

// The shield blocks a hit from the front completely, and does nothing against a hit from the side or back.
check('a raised shield blocks a front hit', damageThroughShield(6, true, true) === 6 * (1 - SHIELD_BLOCK));
check('a shield does not block a side or back hit', damageThroughShield(6, true, false) === 6);
check('a lowered shield does not block a front hit', damageThroughShield(6, false, true) === 6);
check('a full shield block takes all the damage', SHIELD_BLOCK === 1 && damageThroughShield(6, true, true) === 0);

// The bow draws over BOW_FULL_DRAW seconds, and the arrow hits harder the longer it was drawn.
check('a fresh draw is at zero', drawAmount(0) === 0);
check('a full draw is at one', drawAmount(BOW_FULL_DRAW) === 1);
check('a draw is capped at one even when held longer', drawAmount(BOW_FULL_DRAW * 5) === 1);
check('a quick tap does the least damage', arrowDamage(0) === ARROW_MIN_DAMAGE);
check('a full draw does the most damage', arrowDamage(1) === ARROW_MAX_DAMAGE);
check('a longer draw does more damage than a short one', arrowDamage(0.8) > arrowDamage(0.2));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
