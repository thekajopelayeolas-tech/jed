// Hunters shoot for one heart (2 HP). Creepers blow up for three hearts (6 HP) and break the blocks inside their
// blast. A block that is too hard to break survives the blast.
import * as H from '../src/hostile.js';
import { BLOCK } from '../src/blocks.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

check('a hunter arrow does one heart (2 HP)', H.HUNTER_ARROW_DAMAGE === 2);
check('a creeper blast does three hearts (6 HP) at the centre', H.CREEPER_BLAST_DAMAGE === 6);

// The blast breaks the blocks inside its radius. Soft blocks break, and stone and bedrock survive.
check('a blast breaks a soft block inside its radius', H.blastBreaks(BLOCK.DIRT, 1) === true);
check('a blast breaks a stone block inside its radius', H.blastBreaks(BLOCK.STONE, 1) === true);
check('a blast does not break bedrock', H.blastBreaks(BLOCK.BEDROCK, 1) === false);
check('a blast does not break a block past its radius', H.blastBreaks(BLOCK.DIRT, H.CREEPER_BLAST_RADIUS + 1) === false);
check('a blast does not break air', H.blastBreaks(BLOCK.AIR, 1) === false);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
