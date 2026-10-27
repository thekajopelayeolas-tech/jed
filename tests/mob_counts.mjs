// The mob roster: 49 kinds in total, 5 of them hostile. Hostile mobs are the zombie, hunter, creeper, spider and
// enderman. All other hostile kinds were removed. Exits non-zero on failure.
import { EXTRA_MOBS } from '../src/mob-catalogue.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const EXISTING_HOSTILE = 1; // the zombie
const EXISTING_PEACEFUL = 11; // cow, sheep, pig, rabbit, chicken, fish, salmon, dolphin, squid, villager, iron golem

const hostile = EXTRA_MOBS.filter((r) => r[2]);
const peaceful = EXTRA_MOBS.filter((r) => !r[2]);
const ids = EXTRA_MOBS.map((r) => r[0]);

check('the new hostile mobs are hunter, creeper, spider and enderman', ['hunter', 'creeper', 'spider', 'enderman'].every((id) => hostile.some((r) => r[0] === id)) && hostile.length === 4);
check('with the zombie there are 5 hostile mobs', hostile.length + EXISTING_HOSTILE === 5);
check('there are 33 new peaceful mobs', peaceful.length === 33);
check('with the existing peaceful mobs there are 44 peaceful mobs', peaceful.length + EXISTING_PEACEFUL === 44);
check('the total is 49 mobs', hostile.length + peaceful.length + EXISTING_HOSTILE + EXISTING_PEACEFUL === 49);
check('every new mob has a unique id', new Set(ids).size === ids.length);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
