// Sleeping through the night. Night is when the sun is below the horizon, which is the second
// half of the day cycle used in sky.js (time of day in [0.5, 1)). Sunrise is set to SUNRISE.
export const SLEEP_SECONDS = 5;
export const SUNRISE = 0.25;

// True when the sun is below the horizon.
export function isNight(timeOfDay) {
  return timeOfDay >= 0.5 && timeOfDay < 1;
}

// The sleeping view: the camera drops from standing eye height down to the mattress, and tilts onto its side.
// `progress` is 0 (just lay down) to 1 (fully lying down). The transition eases in and out.
// Returns { drop, roll } in metres and radians. drop is how far the eye lowers, roll is the sideways tilt.
export const LYING_EYE_DROP = 1.2;
export const LYING_ROLL = Math.PI / 2;
export function sleepPose(progress) {
  const t = Math.max(0, Math.min(1, progress));
  // Smoothstep, so the body eases into the bed and back up without a sudden jump.
  const eased = t * t * (3 - 2 * t);
  return { drop: LYING_EYE_DROP * eased, roll: LYING_ROLL * eased };
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
