import { createSleep, isNight, SUNRISE, SLEEP_SECONDS } from '../src/sleep.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// Night is the second half of the day cycle.
check('noon is not night', !isNight(0.25));
check('midnight is night', isNight(0.75));
check('dusk boundary (0.5) is night', isNight(0.5));

// Sleeping is refused in daytime.
{
  const s = createSleep();
  check('bed refused in daytime', s.start(0.25) === false && !s.isSleeping());
}

// Sleeping at night: wakes after 5 seconds and returns sunrise.
{
  const s = createSleep();
  check('bed accepted at night', s.start(0.75) === true && s.isSleeping());
  let wake = null;
  for (let i = 0; i < 4; i++) wake = s.update(1, 0.75);
  check('still asleep at 4s', wake === null && s.isSleeping());
  wake = s.update(1, 0.75);
  check('wakes at 5s with sunrise', wake === SUNRISE && !s.isSleeping());
  check('sleep length is 5 seconds', SLEEP_SECONDS === 5);
}

// Starting sleep twice does not restart the timer.
{
  const s = createSleep();
  s.start(0.8);
  s.update(3, 0.8);
  check('second start while asleep refused', s.start(0.8) === false);
  check('timer keeps running after refused start', s.progress() > 0.5);
}

// Stop cancels sleep early.
{
  const s = createSleep();
  s.start(0.8);
  s.stop();
  check('stop cancels sleep', !s.isSleeping() && s.progress() === 0);
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
