import type { CSSProperties } from "react";
import { create } from "zustand";
import { DEVICE } from "../../store/device";

/**
 * Responsive HUD layout. One place decides where every HUD element goes for
 * the current screen: desktop, phone/tablet landscape (short screens) and
 * portrait. Recomputed on resize / rotation (rAF-throttled), never per frame.
 */
export type HudMode = "desktop" | "landscape" | "portrait";

interface Box {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface HudLayout {
  mode: HudMode;
  touch: boolean;
  w: number;
  h: number;
  mini: Box & { size: number };
  clock: Box;
  timer: Box & { font: number };
  tracker: Box & { width: number; compact: boolean };
  clearBar: { top: number; width: number; font: number };
  banner: { top: number; maxWidth: number; font: number };
  topButtons: Box & { size: number };
  upgrades: Box & { compact: boolean };
  bag: Box & { scale: number };
  wood: Box;
  hotbar: { bottom: number; size: number; label: boolean };
  /** "row" = three bars side by side above the hotbar; "stack" = vertical, bottom-left. */
  bars: Box & { kind: "row" | "stack"; barW: number };
  pouch: Box & { center: boolean };
  dialogue: { bottom: number; width: number };
  popupTop: number;
  /** Touch buttons (px from the bottom-right corner; size = diameter). */
  cut: { right: number; bottom: number; size: number };
  jump: { right: number; bottom: number; size: number };
  use: { right: number; bottom: number; size: number };
}

function compute(): HudLayout {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const touch = DEVICE.prefersTouchControls;
  const portrait = h > w * 1.05;
  const mode: HudMode = portrait ? "portrait" : touch || h < 560 ? "landscape" : "desktop";

  if (mode === "desktop") {
    return {
      mode, touch, w, h,
      mini: { size: 176, top: 68, right: 12 },
      clock: { top: 68 + 176 + 18, right: 12 },
      timer: { bottom: 132, right: 16, font: 30 },
      tracker: { top: 12, left: 12, width: 240, compact: false },
      clearBar: { top: 8, width: Math.min(w * 0.86, 460), font: 28 },
      banner: { top: 86, maxWidth: Math.min(w * 0.64, 820), font: 24 },
      topButtons: { top: 12, right: 12, size: 48 },
      upgrades: { bottom: 16, right: 16, compact: false },
      bag: { bottom: 16, left: 16, scale: 1 },
      wood: { bottom: 124, left: 16 },
      hotbar: { bottom: 16, size: 80, label: true },
      bars: { bottom: 124, kind: "row", barW: 112 },
      pouch: { bottom: 172, center: true },
      dialogue: { bottom: 200, width: Math.min(w * 0.92, 620) },
      popupTop: 150,
      cut: { right: 24, bottom: 128, size: 96 },
      jump: { right: 32, bottom: 32, size: 80 },
      use: { right: 140, bottom: 48, size: 76 },
    };
  }
  if (mode === "landscape") {
    // Short screens (phones sideways): everything smaller, tucked into the corners.
    const s = h < 430 ? 1 : 1.2;
    return {
      mode, touch, w, h,
      mini: { size: Math.round(92 * s), top: 8, left: 8 },
      clock: { top: Math.round(92 * s) + 22, left: 8 },
      timer: { top: Math.round(92 * s) + 50, left: 12, font: 17 },
      tracker: { top: Math.round(92 * s) + 76, left: 8, width: 190, compact: true },
      clearBar: { top: 4, width: Math.min(w * 0.42, 380), font: 18 },
      banner: { top: 50, maxWidth: Math.min(w * 0.5, 520), font: 15 },
      topButtons: { top: 8, right: 8, size: 40 },
      upgrades: { top: 56, right: 8, compact: true },
      bag: { bottom: 6, left: 8, scale: 0.68 },
      wood: { bottom: 84, left: 10 },
      hotbar: { bottom: 8, size: 56, label: false },
      bars: { bottom: 70, kind: "row", barW: Math.min(84, w * 0.08) },
      pouch: { bottom: 104, center: true },
      dialogue: { bottom: 70, width: Math.min(w * 0.56, 560) },
      popupTop: 70,
      cut: { right: 22, bottom: 92, size: Math.round(86 * s) },
      jump: { right: 26, bottom: 10, size: Math.round(66 * s) },
      use: { right: 126 * s, bottom: 24, size: Math.round(66 * s) },
    };
  }
  // Portrait: stacked rows, thumb buttons bottom-right, status bottom-left.
  const narrow = w < 430;
  return {
    mode, touch, w, h,
    mini: { size: narrow ? 84 : 120, top: 8, left: 8 },
    clock: { top: (narrow ? 84 : 120) + 22, left: 8 },
    timer: { top: (narrow ? 84 : 120) + 50, left: 12, font: 17 },
    tracker: { top: (narrow ? 84 : 120) + 176, left: 8, width: narrow ? 170 : 220, compact: true },
    clearBar: { top: (narrow ? 84 : 120) + 76, width: w - 24, font: 18 },
    // Under the clear bar (label + bar ~40 px).
    banner: { top: (narrow ? 84 : 120) + 126, maxWidth: w - 24, font: 15 },
    topButtons: { top: 8, right: 8, size: 40 },
    upgrades: { top: 56, right: 8, compact: true },
    bag: { bottom: 8, left: 8, scale: 0.66 },
    // Above the bar stack (3 bars ~100 px tall from bottom 96).
    wood: { bottom: 206, left: 10 },
    hotbar: { bottom: 10, size: 56, label: false },
    bars: { bottom: 96, left: 8, kind: "stack", barW: narrow ? 84 : 110 },
    pouch: { bottom: 244, left: 8, center: false },
    dialogue: { bottom: touch ? 250 : 120, width: w - 24 },
    popupTop: (narrow ? 84 : 120) + 176,
    cut: { right: 16, bottom: 150, size: 86 },
    jump: { right: 22, bottom: 58, size: 66 },
    use: { right: 112, bottom: 58, size: 66 },
  };
}

/** Notch / home-bar insets (CSS env(safe-area-inset-*)), measured once per layout pass. */
function safeInsets() {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const r = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  el.remove();
  return r;
}

/** Push every edge-anchored element inside the safe area. */
function withSafeArea(L: HudLayout): HudLayout {
  if (typeof document === "undefined" || !document.body) return L;
  const si = safeInsets();
  if (!si.t && !si.r && !si.b && !si.l) return L;
  for (const v of Object.values(L)) {
    if (!v || typeof v !== "object") continue;
    const b = v as Box;
    if (typeof b.top === "number") b.top += si.t;
    if (typeof b.bottom === "number") b.bottom += si.b;
    if (typeof b.left === "number") b.left += si.l;
    if (typeof b.right === "number") b.right += si.r;
  }
  return L;
}

export const useHud = create<HudLayout>(() => withSafeArea(compute()));

let raf = 0;
const update = () => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => useHud.setState(withSafeArea(compute())));
};
window.addEventListener("resize", update);
window.addEventListener("orientationchange", () => {
  update();
  // Some phones report the new size a moment after the event.
  window.setTimeout(update, 300);
});

/** Spread a Box into an inline style. */
export const pos = (b: Box): CSSProperties => ({ top: b.top, bottom: b.bottom, left: b.left, right: b.right });
