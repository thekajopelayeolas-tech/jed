// A gun and its bullet. The gun is made from iron and gunpowder, and fires one bullet per shot. A bullet hits harder
// than a full bow draw, and it is used up when fired.
import { BLOCK, BLOCK_DEFS, isItem } from '../src/blocks.js';
import { RECIPES } from '../src/inventory.js';
import { itemPixels } from '../src/item-icons.js';
import { GUN_BULLET_DAMAGE, isCombatItem, ARROW_MAX_DAMAGE } from '../src/combat.js';
// (canFireGun and gunShotDamage are imported further down with the firing checks.)

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Both are items with a name and a sprite.
for (const [name, id] of [['gun', BLOCK.GUN], ['bullet', BLOCK.BULLET]]) {
  check(`${name} is an item with a name and sprite`, isItem(id) && !!BLOCK_DEFS[id]?.name && !!itemPixels(id));
  check(`${name} is a combat item`, isCombatItem(id));
}

// Recipes: the gun is iron and gunpowder; the bullet is iron and gunpowder too, so both use the same materials.
const gunRecipe = RECIPES.find((r) => r.result === BLOCK.GUN);
const bulletRecipe = RECIPES.find((r) => r.result === BLOCK.BULLET);
check('the gun has a recipe', !!gunRecipe);
check('the gun is made from iron and gunpowder', !!gunRecipe && Object.values(gunRecipe.key).includes(BLOCK.IRON_INGOT) && Object.values(gunRecipe.key).includes(BLOCK.GUNPOWDER));
check('the bullet has a recipe', !!bulletRecipe);
check('the bullet is made from iron and gunpowder', !!bulletRecipe && Object.values(bulletRecipe.key).includes(BLOCK.IRON_INGOT) && Object.values(bulletRecipe.key).includes(BLOCK.GUNPOWDER));

// A bullet hits harder than the strongest bow arrow.
check('a bullet hits harder than a full bow draw', GUN_BULLET_DAMAGE > ARROW_MAX_DAMAGE);

// Firing: a gun needs a bullet to fire, uses one per shot, and fires straight away with no draw.
import { canFireGun, gunShotDamage } from '../src/combat.js';
{
  check('a gun with no bullets cannot fire', canFireGun(0) === false);
  check('a gun with a bullet can fire', canFireGun(1) === true);
  check('a shot does the full bullet damage', gunShotDamage() === GUN_BULLET_DAMAGE);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
