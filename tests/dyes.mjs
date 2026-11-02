import { World } from '../src/world.js';
import { BLOCK } from '../src/blocks.js';
import { BED_COLORS, bedVariantForDye, isBedId } from '../src/building.js';
import { Mob, MOB } from '../src/mobs.js';

let failed = 0;
const check = (name, condition) => {
  if (!condition) failed++;
  console.log(condition ? 'PASS' : 'FAIL', name);
};

const scene = { add() {}, remove() {} };
const world = new World(scene, 1337, {}, {});
world.update(8, 8, 1, 25);
const sheep = new Mob(scene, world, MOB.SHEEP, 8.5, 60, 8.5);
const faceMaterial = sheep.model.materials.find((material) => !sheep.model.woolMaterials.includes(material));
check('sheep fleece accepts a dye', sheep.dyeFleece(0x365bd8) && sheep.fleeceColor === 0x365bd8);
check('dye changes wool without recoloring the face', sheep.model.woolMaterials.every((material) => material.color.getHex() === 0x365bd8) && faceMaterial.color.getHex() !== 0x365bd8);
check('dyed sheep shear and drop matching blue wool', sheep.shear() === 2 && sheep.fleeceWoolId === BLOCK.BLUE_WOOL && sheep.dropIds().includes(BLOCK.BLUE_WOOL));
check('dyeing with the same color is a no-op', sheep.dyeFleece(0x365bd8) === false);

const bed = BED_COLORS.blue;
check('flower dye selects its matching bed color', bedVariantForDye(BLOCK.BLUE_DYE) === bed);
check('both colored bed halves are recognized as beds', isBedId(bed.head) && isBedId(bed.foot));
check('colored bed head and foot IDs are distinct', bed.head !== bed.foot && bed.foot === BLOCK.BLUE_BED_FOOT);
check('colored beds can be placed and broken as one two-cell block', world.placeWhole(8, 70, 8, bed.head, 0) && world.getBlock(8, 70, 9) === bed.foot && world.breakWhole(8, 70, 9).length === 2);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
