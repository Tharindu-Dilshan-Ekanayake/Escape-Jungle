import { Color } from "three";
import { CYCLE, LIGHT_KEYS, type LightKey } from "../../config/night";

/**
 * Day/night clock (mutable, advanced inside useFrame by <DayNight/>; HUD polls).
 * `dark` is 0 in daylight and 1 at full night. `light` holds the current
 * lighting so other render passes (the viewmodel) can match it.
 */
export type Phase = "day" | "dusk" | "night" | "dawn";

const TOTAL = CYCLE.day + CYCLE.dusk + CYCLE.night + CYCLE.dawn;

interface LightState {
  hemiSky: Color;
  hemiGround: Color;
  hemi: number;
  sun: Color;
  sunI: number;
  fog: Color;
  sky: Color;
}

const parse = (k: LightKey): LightState => ({
  hemiSky: new Color(k.hemiSky),
  hemiGround: new Color(k.hemiGround),
  hemi: k.hemi,
  sun: new Color(k.sun),
  sunI: k.sunI,
  fog: new Color(k.fog),
  sky: new Color(k.sky),
});

// Pre-parsed key colours (no allocations while blending).
const KEYS = { day: parse(LIGHT_KEYS.day), dusk: parse(LIGHT_KEYS.dusk), night: parse(LIGHT_KEYS.night) };

export const dayNight = {
  t: 0,
  dark: 0,
  phase: "day" as Phase,
  /** Seconds until the current phase ends. */
  phaseLeft: CYCLE.day,
  /** Nights started so far this run. */
  nights: 0,
  /** Run seconds the clock was last synced to. */
  elapsed: 0,
  light: parse(LIGHT_KEYS.day),
};

// Dev only: automated checks read the clock (fast-forward via __runNet.startedAt).
if (import.meta.env.DEV) Object.assign(window, { __dayNight: dayNight });

const smooth = (x: number) => x * x * (3 - 2 * x);

function blend(a: LightState, b: LightState, t: number) {
  const L = dayNight.light;
  L.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
  L.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
  L.sun.copy(a.sun).lerp(b.sun, t);
  L.fog.copy(a.fog).lerp(b.fog, t);
  L.sky.copy(a.sky).lerp(b.sky, t);
  L.hemi = a.hemi + (b.hemi - a.hemi) * t;
  L.sunI = a.sunI + (b.sunI - a.sunI) * t;
}

/** Advance the clock by dt seconds and recompute darkness + lighting. Zero allocations. */
export function advanceDayNight(dt: number) {
  const prevPhase = dayNight.phase;
  dayNight.t = (dayNight.t + dt) % TOTAL;
  let t = dayNight.t;
  let phase: Phase;
  let dark: number;
  if (t < CYCLE.day) {
    phase = "day";
    dark = 0;
    dayNight.phaseLeft = CYCLE.day - t;
  } else if ((t -= CYCLE.day) < CYCLE.dusk) {
    phase = "dusk";
    dark = smooth(t / CYCLE.dusk);
    dayNight.phaseLeft = CYCLE.dusk - t;
  } else if ((t -= CYCLE.dusk) < CYCLE.night) {
    phase = "night";
    dark = 1;
    dayNight.phaseLeft = CYCLE.night - t;
  } else {
    t -= CYCLE.night;
    phase = "dawn";
    dark = 1 - smooth(t / CYCLE.dawn);
    dayNight.phaseLeft = CYCLE.dawn - t;
  }
  if (phase === "dusk" && prevPhase === "day") dayNight.nights++;
  dayNight.phase = phase;
  dayNight.dark = dark;
  // Orange dusk on the way down; dawn goes straight from night to the cool morning.
  if (phase === "dawn") blend(KEYS.day, KEYS.night, dark);
  else if (dark < 0.5) blend(KEYS.day, KEYS.dusk, dark * 2);
  else blend(KEYS.dusk, KEYS.night, dark * 2 - 1);
}

/** Set the clock from the run's elapsed seconds (the same on every client in a party). */
export function syncDayNight(elapsed: number) {
  dayNight.elapsed = elapsed;
  dayNight.t = ((elapsed % TOTAL) + TOTAL) % TOTAL;
  advanceDayNight(0);
}

export function resetDayNight() {
  dayNight.elapsed = 0;
  dayNight.t = 0;
  dayNight.nights = 0;
  dayNight.phase = "day";
  advanceDayNight(0);
}

/** "night falls in 1:20" style helper for the HUD. */
export function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
