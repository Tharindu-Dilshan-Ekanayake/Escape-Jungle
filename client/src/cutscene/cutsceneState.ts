import { create } from "zustand";
import { INTRO } from "../config/cutscene";

/**
 * Intro cutscene state. `cutscene` is the hot-path copy read inside useFrame
 * (camera, controller freeze); the Zustand store drives UI visibility and is
 * only changed by start/end calls (effects, timers, the Skip button).
 */
export const cutscene = {
  active: false,
  /** performance.now()/1000 when it started. */
  start: 0,
  /** Set when it ended early (Skip) so the 3D side can jump to the wreck pose. */
  ended: true,
};

interface CutsceneUi {
  playing: boolean;
  start: number;
}

export const useCutsceneStore = create<CutsceneUi>(() => ({ playing: false, start: 0 }));

const endListeners = new Set<() => void>();
let endTimer = 0;

/** Seconds since the cutscene started (0 when not playing). */
export const cutsceneTime = () => {
  // Dev only: automated checks can freeze the intro at a chosen second (window.__cutsceneFreeze).
  if (import.meta.env.DEV && cutscene.active) {
    const f = (window as { __cutsceneFreeze?: number }).__cutsceneFreeze;
    if (typeof f === "number") return f;
  }
  return cutscene.active ? performance.now() / 1000 - cutscene.start : 0;
};

export function startCutscene() {
  const now = performance.now() / 1000;
  cutscene.active = true;
  cutscene.ended = false;
  cutscene.start = now;
  useCutsceneStore.setState({ playing: true, start: now });
  window.clearTimeout(endTimer);
  endTimer = window.setTimeout(endCutscene, INTRO.duration * 1000);
}

/** Natural end or Skip. Safe to call twice. */
export function endCutscene() {
  if (!cutscene.active) return;
  window.clearTimeout(endTimer);
  cutscene.active = false;
  cutscene.ended = true;
  useCutsceneStore.setState({ playing: false });
  endListeners.forEach((cb) => cb());
}

/** Abort without firing end listeners (stage unmounted mid-cutscene). */
export function cancelCutscene() {
  window.clearTimeout(endTimer);
  cutscene.active = false;
  cutscene.ended = true;
  useCutsceneStore.setState({ playing: false });
}

export function onCutsceneEnd(cb: () => void) {
  endListeners.add(cb);
  return () => {
    endListeners.delete(cb);
  };
}
