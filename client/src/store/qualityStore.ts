import { create } from "zustand";
import { QUALITY_ORDER, QUALITY_PRESETS, type QualityLevel, type QualityPreset } from "../config/quality";
import { DEVICE } from "./device";

/**
 * Effective preset = min(deviceCeiling, requested, perfCap).
 * - deviceCeiling: auto-detect (mobile or <= 4 cores -> LOW), fixed at startup.
 * - requested: the player's choice (Boxity graphics_quality or our Settings menu).
 * - perfCap: lowered by <PerformanceMonitor> when FPS < 45; never raised automatically.
 */
interface QualityState {
  deviceCeiling: QualityLevel;
  requested: QualityLevel;
  perfCap: QualityLevel;
  level: QualityLevel;
  preset: QualityPreset;
  setRequested: (level: QualityLevel) => void;
  /** Called by the performance monitor. Returns false when already at the floor. */
  degrade: () => boolean;
}

const rank = (l: QualityLevel) => QUALITY_ORDER.indexOf(l);
const minLevel = (...ls: QualityLevel[]) => ls.reduce((a, b) => (rank(a) <= rank(b) ? a : b));

const deviceCeiling: QualityLevel = DEVICE.isLowEnd ? "LOW" : "HIGH";

function derive(s: Pick<QualityState, "deviceCeiling" | "requested" | "perfCap">) {
  const level = minLevel(s.deviceCeiling, s.requested, s.perfCap);
  return { level, preset: QUALITY_PRESETS[level] };
}

/** Default graphics: LOW (runs everywhere); players can raise it in Settings / Boxity graphics_quality. */
const DEFAULT_LEVEL: QualityLevel = "LOW";

export const useQualityStore = create<QualityState>((set, get) => ({
  deviceCeiling,
  requested: DEFAULT_LEVEL,
  perfCap: "HIGH",
  ...derive({ deviceCeiling, requested: DEFAULT_LEVEL, perfCap: "HIGH" }),
  setRequested: (requested) => set((s) => ({ requested, ...derive({ ...s, requested }) })),
  degrade: () => {
    const s = get();
    const idx = rank(s.level);
    if (idx <= 0) return false;
    const perfCap = QUALITY_ORDER[idx - 1];
    set({ perfCap, ...derive({ ...s, perfCap }) });
    console.info(`[quality] FPS below budget -> dropped to ${perfCap}`);
    return true;
  },
}));

/** Boxity graphics_quality values -> our presets ("Ultra" maps to HIGH). */
export function qualityFromPlatform(value: string): QualityLevel | null {
  switch (value) {
    case "Low":
      return "LOW";
    case "Medium":
      return "MEDIUM";
    case "High":
    case "Ultra":
      return "HIGH";
    default:
      return null;
  }
}
