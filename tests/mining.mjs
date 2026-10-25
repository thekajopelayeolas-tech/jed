import { breakTime, canHarvest, attackDamage } from '../src/mining.js';
import { BLOCK } from '../src/blocks.js';

const WOOD_PICK = BLOCK.WOODEN_PICKAXE;
const STONE_PICK = BLOCK.STONE_PICKAXE;
const IRON_PICK = BLOCK.IRON_PICKAXE;
const IRON_SWORD = BLOCK.IRON_SWORD;

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Break times: a matching tool divides hardness by its speed. Bare hands and wrong tools use speed 1.
check('stone bare hand takes 1.5s', breakTime(BLOCK.STONE, 0) === 1.5);
check('stone with wooden pickaxe is 2x faster (0.75s)', breakTime(BLOCK.STONE, WOOD_PICK) === 0.75);
check('stone with stone pickaxe is 4x faster (0.375s)', breakTime(BLOCK.STONE, STONE_PICK) === 0.375);
check('dirt with pickaxe is not faster (wrong tool class)', breakTime(BLOCK.DIRT, WOOD_PICK) === 0.5);
check('bedrock never breaks', breakTime(BLOCK.BEDROCK, IRON_PICK) === Infinity);

// Harvest tiers: a block only drops with a tool of high enough tier.
check('stone needs a pickaxe (bare hand: no drop)', canHarvest(BLOCK.STONE, 0) === false);
check('stone drops with wooden pickaxe', canHarvest(BLOCK.STONE, WOOD_PICK) === true);
check('coal needs a wooden pickaxe (bare hand: no drop)', canHarvest(BLOCK.COAL_ORE, 0) === false);
check('iron ore needs a stone pickaxe (wood: no drop)', canHarvest(BLOCK.IRON_ORE, WOOD_PICK) === false);
check('iron ore drops with stone pickaxe', canHarvest(BLOCK.IRON_ORE, STONE_PICK) === true);
check('dirt drops bare-handed', canHarvest(BLOCK.DIRT, 0) === true);

// Weapon damage: bare hand 1, and the held sword sets the value.
check('bare hand deals 1', attackDamage(0) === 1);
check('iron sword deals 7', attackDamage(IRON_SWORD) === 7);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
