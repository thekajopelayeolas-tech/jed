import { BLOCK } from '../src/blocks.js';
import { Inventory } from '../src/inventory.js';
import { ARMOUR_SETS, armourInfo } from '../src/armour.js';
import { VILLAGER_TRADES, canMakeTrade, executeTrade } from '../src/trading.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

const wheatOffer = VILLAGER_TRADES.find((offer) => offer.id === 'wheat');
const seller = new Inventory();
seller.add(BLOCK.WHEAT, 10);
check('a farmer trade exchanges wheat for emeralds', canMakeTrade(seller, wheatOffer) && executeTrade(seller, wheatOffer) && seller.countOf(BLOCK.EMERALD) === 1 && seller.countOf(BLOCK.WHEAT) === 0);
const buyer = new Inventory();
buyer.add(BLOCK.EMERALD, 1);
const breadOffer = VILLAGER_TRADES.find((offer) => offer.id === 'bread');
check('villagers sell goods for emeralds', executeTrade(buyer, breadOffer) && buyer.countOf(BLOCK.BREAD) === 3 && buyer.countOf(BLOCK.EMERALD) === 0);

const full = new Inventory();
full.slots.forEach((slot) => { slot.id = BLOCK.STONE; slot.count = 64; });
full.slots[0].id = BLOCK.EMERALD;
full.slots[0].count = 20;
const rainbowOffer = VILLAGER_TRADES.find((offer) => offer.id === 'rainbow-gem');
check('a full inventory cannot consume payment without fitting the reward', !canMakeTrade(full, rainbowOffer) && !executeTrade(full, rainbowOffer) && full.countOf(BLOCK.EMERALD) === 20);
check('insufficient emeralds reject a purchase without changing stock', !executeTrade(buyer, breadOffer) && buyer.countOf(BLOCK.BREAD) === 3);

check('emerald armor is registered and wearable', Object.values(ARMOUR_SETS.emerald.ids).every((id) => armourInfo(id)));
check('rainbow ore armor is stronger than emerald armor', Object.values(ARMOUR_SETS.rainbow.defence).reduce((a, b) => a + b, 0) > Object.values(ARMOUR_SETS.emerald.defence).reduce((a, b) => a + b, 0));
check('villagers offer emerald gear and rainbow ore rewards', VILLAGER_TRADES.some((offer) => offer.output.id === BLOCK.EMERALD_HELMET) && VILLAGER_TRADES.some((offer) => offer.output.id === BLOCK.RAINBOW_GEM));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
