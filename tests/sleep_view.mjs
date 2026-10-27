import { sleepPose, LYING_EYE_DROP, LYING_ROLL, createSleep } from '../src/sleep.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Standing (progress 0) has no drop and no roll, so the view is normal.
check('standing has no drop', near(sleepPose(0).drop, 0));
check('standing has no roll', near(sleepPose(0).roll, 0));

// Fully asleep (progress 1) drops the eye to the mattress and rolls the view onto its side.
check('fully asleep drops the eye by the lying drop', near(sleepPose(1).drop, LYING_EYE_DROP));
check('fully asleep rolls the view a quarter turn', near(sleepPose(1).roll, LYING_ROLL));

// The change is smooth: halfway is between the two, and it does not overshoot.
const mid = sleepPose(0.5);
check('halfway through the lie-down is halfway in drop', near(mid.drop, LYING_EYE_DROP * 0.5));
check('the pose never goes past the lying values', sleepPose(2).drop <= LYING_EYE_DROP + 1e-9 && sleepPose(-1).drop >= -1e-9);

// The easing is monotonic: as sleep progresses, the view only moves one way.
let prev = -1;
let monotone = true;
for (let i = 0; i <= 100; i++) {
  const d = sleepPose(i / 100).drop;
  if (d < prev - 1e-12) monotone = false;
  prev = d;
}
check('lying down eases in one direction only', monotone);

// Waking early: a movement key ends sleep, and the sleep state reports awake.
const s = createSleep();
s.start(0.8);
check('asleep after starting at night', s.isSleeping());
s.stop();
check('stop wakes the player', !s.isSleeping() && sleepPose(s.progress()).drop === 0);

// The five-second sleep still reaches sunrise.
const t = createSleep();
t.start(0.8);
let woke = null;
for (let i = 0; i < 5; i++) woke = t.update(1, 0.8);
check('a full sleep still ends at sunrise', woke !== null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
