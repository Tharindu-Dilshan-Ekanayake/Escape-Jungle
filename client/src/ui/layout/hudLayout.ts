import type { CSSProperties } from "react";
import { create } from "zustand";
import { DEVICE } from "../../store/device";

/**
 * Responsive HUD layout. One place decides where every HUD element goes for
 * the current screen: desktop, phone/tablet landscape (short screens) and
 * portrait. Recomputed on resize / rotation (rAF-throttled), never per frame.
 * The top-left corner stays empty everywhere: Boxity puts its toolbar there
 * (docs/SDK.md).
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
  tracker: Box & { width: number; compact: boolean; scale: number };
  clearBar: { top: number; width: number; font: number };
  banner: { top: number; maxWidth: number; font: number };
  /** The grinder arrow badge under the banner. */
  arrow: { top: number; scale: number };
  /** Team / upgrades (phones) / settings row. */
  topButtons: Box & { size: number };
  /** Desktop only: the big UPGRADES button (phones put a small one in the top row). */
  upgrades: Box & { compact: boolean };
  /** Status card: bag, cash and firewood. */
  bag: Box & { scale: number };
  hotbar: { bottom: number; size: number; label: boolean };
  /** "row" = three bars side by side above the hotbar; "stack" = vertical, bottom-left. */
  bars: Box & { kind: "row" | "stack"; barW: number; scale: number };
  pouch: Box & { center: boolean };
  dialogue: { bottom: number; width: number };
  popupTop: number;
  /** Tap-able action prompt ("Talk to ...", "Buy ...") above the crosshair area. */
  prompt: { top: number; font: number };
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
    // Right column: buttons, minimap, clock, adventures. Bottom-left: the status card.
    return {
      mode, touch, w, h,
      mini: { size: 176, top: 68, right: 12 },
      clock: { top: 68 + 176 + 14, right: 12 },
      timer: { bottom: 132, right: 16, font: 30 },
      tracker: { top: 68 + 176 + 54, right: 12, width: 240, compact: false, scale: 1 },
      clearBar: { top: 8, width: Math.min(w * 0.86, 460), font: 28 },
      banner: { top: 86, maxWidth: Math.min(w * 0.6, 760), font: 22 },
      arrow: { top: 86 + 44, scale: 1 },
      topButtons: { top: 12, right: 12, size: 48 },
      upgrades: { bottom: 16, right: 16, compact: false },
      bag: { bottom: 16, left: 16, scale: 1 },
      hotbar: { bottom: 16, size: 80, label: true },
      bars: { bottom: 124, kind: "row", barW: 112, scale: 1 },
      pouch: { bottom: 172, center: true },
      dialogue: { bottom: 200, width: Math.min(w * 0.92, 620) },
      popupTop: 150,
      prompt: { top: Math.round(h * 0.6), font: 18 },
      cut: { right: 24, bottom: 128, size: 96 },
      jump: { right: 32, bottom: 32, size: 80 },
      use: { right: 140, bottom: 48, size: 76 },
    };
  }
  if (mode === "landscape") {
    // Phones sideways. Top-right: button row, the small minimap under it, then clock and
    // timer. The top-left ~60% stays empty (Boxity's logos); adventures sit lower on the
    // left, the clear bar and banner start below the logo strip. Thumbs bottom-right.
    const s = h < 430 ? 1 : 1.2;
    const btn = Math.round(36 * s);
    const mini = Math.round(66 * s);
    const mTop = 8 + btn + 6;
    const under = mTop + mini + 14 + 4; // below the minimap frame
    return {
      mode, touch, w, h,
      mini: { size: mini, top: mTop, right: 8 },
      clock: { top: under, right: 8 },
      timer: { top: under + 26, right: 12, font: 14 },
      tracker: { top: 64, left: 8, width: 170, compact: true, scale: 0.85 },
      clearBar: { top: 6, width: Math.min(w * 0.32, 280), font: 12 },
      banner: { top: 42, maxWidth: Math.min(w * 0.42, 440), font: 11 },
      arrow: { top: 42 + 34, scale: 0.7 },
      topButtons: { top: 8, right: 8, size: btn },
      upgrades: { top: 8, right: 8, compact: true },
      bag: { bottom: 8, left: 8, scale: 0.72 * s },
      hotbar: { bottom: 8, size: 56, label: false },
      bars: { bottom: 70, kind: "row", barW: Math.min(84, w * 0.08), scale: 1 },
      // Above the status card (the centre is kept for the tap-able action prompt).
      pouch: { bottom: Math.round(8 + 110 * 0.72 * s + 10), left: 8, center: false },
      dialogue: { bottom: 70, width: Math.min(w * 0.56, 560) },
      popupTop: 130,
      prompt: { top: Math.round(h * 0.56), font: 15 },
      cut: { right: 22, bottom: 92, size: Math.round(86 * s) },
      jump: { right: 26, bottom: 10, size: Math.round(66 * s) },
      use: { right: 126 * s, bottom: 24, size: Math.round(66 * s) },
    };
  }
  // Portrait (phones upright): small and tucked into the edges so the jungle stays visible.
  // Top-right button row with the minimap under it; adventures to its left (below the
  // empty top-left corner); the clear bar under those; bars + status card bottom-left
  // (scaled down); thumb buttons bottom-right.
  const narrow = w < 430;
  const btn = narrow ? 34 : 40;
  const mini = narrow ? 72 : 96;
  const mTop = 8 + btn + 6;
  const under = mTop + mini + 14 + 4; // below the minimap frame
  const below = under + 26 + 8; // just below the clock and timer: the clear bar
  const card = 0.6; // status card scale
  return {
    mode, touch, w, h,
    mini: { size: mini, top: mTop, right: 8 },
    clock: { top: under, right: 8 },
    timer: { top: under + 26, right: 12, font: 13 },
    // Left top stays empty for the logos; adventures start lower and smaller.
    tracker: { top: 64, left: 8, width: Math.max(130, w - mini - 44), compact: true, scale: 0.85 },
    clearBar: { top: below, width: Math.min(w - 24, 260), font: 11 },
    // The banner starts below the bar (label + bar are ~40 px) so it never covers the label.
    banner: { top: below + 32, maxWidth: w - 32, font: 11 },
    arrow: { top: below + 32 + 36, scale: 0.7 },
    topButtons: { top: 8, right: 8, size: btn },
    upgrades: { top: 8, right: 8, compact: true },
    bag: { bottom: 8, left: 8, scale: card },
    hotbar: { bottom: 8, size: 48, label: false },
    bars: { bottom: Math.round(8 + 110 * card + 6), left: 8, kind: "stack", barW: 70, scale: 0.8 },
    pouch: { bottom: Math.round(8 + 110 * card + 6 + 74), left: 8, center: false },
    dialogue: { bottom: touch ? 230 : 120, width: w - 24 },
    popupTop: below + 120,
    prompt: { top: Math.round(h * 0.58), font: 13 },
    cut: { right: 14, bottom: 140, size: 76 },
    jump: { right: 20, bottom: 52, size: 58 },
    use: { right: 96, bottom: 64, size: 58 },
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
