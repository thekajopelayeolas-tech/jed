// Sleeping through the night. Night is when the sun is below the horizon, which is the second
// half of the day cycle used in sky.js (time of day in [0.5, 1)). Sunrise is set to SUNRISE.
export const SLEEP_SECONDS = 5;
export const SUNRISE = 0.25;

// True when the sun is below the horizon.
export function isNight(timeOfDay) {
  return timeOfDay >= 0.5 && timeOfDay < 1;
}

// Sleep state machine. Call start() from a bed click, update(dt) each frame, and stop() to wake early.
export function createSleep() {
  let sleeping = false;
  let elapsed = 0;
  return {
    isSleeping: () => sleeping,
    // Returns the new time of day after waking, or null if not woken this frame.
    update(dt, timeOfDay) {
      if (!sleeping) return null;
      elapsed += dt;
      if (elapsed >= SLEEP_SECONDS) {
        sleeping = false;
        elapsed = 0;
        return SUNRISE;
      }
      return null;
    },
    // Only allowed at night, so a bed click in daylight does nothing.
    start(timeOfDay) {
      if (!isNight(timeOfDay) || sleeping) return false;
      sleeping = true;
      elapsed = 0;
      return true;
    },
    stop() {
      sleeping = false;
      elapsed = 0;
    },
    progress: () => (sleeping ? elapsed / SLEEP_SECONDS : 0),
  };
}
