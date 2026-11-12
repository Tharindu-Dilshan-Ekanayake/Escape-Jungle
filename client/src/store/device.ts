import { LOW_END_MAX_CORES } from "../config/quality";

/** One-time device classification, done at startup (never per frame). */
function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
  // iPadOS reports itself as a Mac: detect via touch + coarse pointer.
  return navigator.maxTouchPoints > 1 && matchMedia("(pointer: coarse)").matches;
}

const isMobile = detectMobile();
const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;

const isTouch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
const coarsePointer = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

export const DEVICE = {
  isMobile,
  isTouch,
  cores,
  isLowEnd: isMobile || cores <= LOW_END_MAX_CORES,
  /** Show on-screen joystick/look/jump instead of pointer lock. */
  prefersTouchControls: isMobile || (isTouch && coarsePointer),
} as const;
