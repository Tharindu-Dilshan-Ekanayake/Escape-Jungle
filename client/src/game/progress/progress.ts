import { ZONES1 } from "../../config/zones1";

/**
 * Run progression (mutable; HUD polls `version`): which zone gates are open,
 * the run timer, and whether the player escaped. Reset at every run start.
 */
export const progress = {
  open: ZONES1.map(() => false),
  /** performance.now()/1000 when the timer started (after the intro); 0 = not running. */
  startedAt: 0,
  finished: false,
  /** Seconds the run took (set on escape). */
  finishTime: 0,
  /** Last gate opened (for the "Area cleared!" banner). */
  lastOpened: { index: -1, at: 0 },
  version: 0,
};

export function resetProgress() {
  progress.open = ZONES1.map(() => false);
  progress.startedAt = 0;
  progress.finished = false;
  progress.finishTime = 0;
  progress.lastOpened = { index: -1, at: 0 };
  progress.version++;
}

export function startRunTimer() {
  if (!progress.startedAt) progress.startedAt = performance.now() / 1000;
  progress.version++;
}

export function runSeconds(): number {
  if (progress.finished) return progress.finishTime;
  return progress.startedAt ? performance.now() / 1000 - progress.startedAt : 0;
}

export function markGateOpen(i: number) {
  if (progress.open[i]) return;
  progress.open[i] = true;
  progress.lastOpened = { index: i, at: performance.now() / 1000 };
  progress.version++;
}

export function markFinished() {
  if (progress.finished) return;
  progress.finishTime = runSeconds();
  progress.finished = true;
  progress.version++;
}

/** Index of the first zone whose gate is still closed (the current goal), or -1. */
export function currentZoneIndex(): number {
  return progress.open.findIndex((o) => !o);
}

/** mm:ss.t */
export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(1).padStart(4, "0")}`;
}

// Dev only: automated checks read progression (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __progress: progress });
