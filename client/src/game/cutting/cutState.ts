import type { GrassField } from "../../grass/GrassField";
import type { ZoneDef } from "../../config/zones1";

/**
 * Hot-path cutting state (mutable, read by the viewmodel and polled by the HUD).
 * Never stored in React/Zustand: it changes inside useFrame.
 */
export const cutState = {
  /** Seconds since the current swing started, or -1 when idle. */
  swingT: -1,
  swingDuration: 0.5,
  hitDone: false,
  /** performance.now()/1000 until which "need a better tool" shows. */
  needToolUntil: 0,
  /** performance.now()/1000 until which "bag full" flashes (a swing was blocked). */
  bagFullUntil: 0,
};

/** Run totals (objectives in Phase 4). */
export const runStats = {
  blades: 0,
  cellsCut: 0,
};

/** Themed zones of the active stage (empty outside a run), for HUD polling. */
export const activeZones: { list: { zone: ZoneDef; field: GrassField }[] } = { list: [] };

// Dev only: automated checks read cut totals (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __zones: activeZones, __runStats: runStats });
