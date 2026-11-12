import { TUTORIAL, type TutorialHighlight } from "../../config/tutorial";

/**
 * First-time guide state (mutable; polled by the HUD, read by the guide path).
 * Runs once per browser: the finished/skipped flag is kept in localStorage.
 */
export const tutorial = {
  active: false,
  step: 0,
  stepStart: 0,
  /** Values when the step started (progress is counted from these). */
  base: { cells: 0, carried: 0, levels: 0 },
  /** Live progress line ("12 / 25 plants") and the last reward popup. */
  progress: "",
  reward: { amount: 0, at: 0 },
  version: 0,
};

const now = () => performance.now() / 1000;

export function tutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL.storageKey) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(TUTORIAL.storageKey, "1");
  } catch {
    /* private mode: it just runs again next time */
  }
}

export function startTutorial() {
  if (tutorialDone()) return;
  tutorial.active = true;
  tutorial.step = 0;
  tutorial.stepStart = now();
  tutorial.version++;
}

export function stopTutorial(finished: boolean) {
  if (!tutorial.active) return;
  tutorial.active = false;
  if (finished) tutorial.reward = { amount: 0, at: now() };
  remember();
  tutorial.version++;
}

/** Highlight wanted right now ("" when the guide is off). */
export function tutorialHighlight(): TutorialHighlight {
  return tutorial.active ? (TUTORIAL.steps[tutorial.step]?.highlight ?? "") : "";
}
