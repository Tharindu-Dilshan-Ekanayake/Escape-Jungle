/**
 * Quality presets (CLAUDE.md section 2 + performance contract).
 * Every visual feature MUST read its budget from the active preset.
 */
export type QualityLevel = "LOW" | "MEDIUM" | "HIGH";

export const QUALITY_ORDER: readonly QualityLevel[] = ["LOW", "MEDIUM", "HIGH"];

export interface QualityPreset {
  /** Canvas device-pixel-ratio range [min, max]. */
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  /** Chunks farther than this (m) from the player are hidden/not updated. */
  viewDistance: number;
  /** 0..1 multiplier on grass instances per cell. */
  grassDensity: number;
  /** Grass chunks farther than this (m, + half a chunk) use the low-detail clump. */
  grassLod: number;
  /** How much of a chunk's half-diagonal is added to the view distance before hiding it (1 = never cut a visible edge). */
  chunkSlack: number;
  fireflies: number;
  /** Hard cap for pooled particles (cut leaves, coins). 0 = particles off. */
  particleCap: number;
  postProcessing: boolean;
  fog: boolean;
  /** Grass sway in the vertex shader. */
  wind: boolean;
  /** Wreck smoke emission scale (0 = off). Pooled, 1 draw call. */
  smoke: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  LOW: {
    dpr: [1, 1],
    shadows: false,
    shadowMapSize: 0,
    // Shorter on LOW: fewer chunks drawn, and the thicker mist suits the deep jungle.
    viewDistance: 40,
    grassDensity: 0.5,
    // Past ~25 m the fog is thick on LOW: cheap clumps there, and chunks whose near edge is deep in the mist are skipped.
    grassLod: 14,
    chunkSlack: 0.5,
    fireflies: 0,
    particleCap: 0,
    postProcessing: false,
    fog: true,
    // Cheap enough for low-end PCs: one sin() per grass vertex + a light smoke column.
    wind: true,
    smoke: 0.4,
  },
  MEDIUM: {
    dpr: [1, 1.25],
    shadows: false,
    shadowMapSize: 0,
    viewDistance: 56,
    grassDensity: 0.75,
    grassLod: 22,
    chunkSlack: 1,
    fireflies: 40,
    particleCap: 150,
    postProcessing: false,
    fog: true,
    wind: true,
    smoke: 0.75,
  },
  HIGH: {
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    viewDistance: 64,
    grassDensity: 1,
    grassLod: 26,
    chunkSlack: 1,
    fireflies: 80,
    particleCap: 300,
    postProcessing: false,
    fog: true,
    wind: true,
    smoke: 1,
  },
};

/** Auto-detect: mobile or <= this many logical cores -> LOW. */
export const LOW_END_MAX_CORES = 4;

/** PerformanceMonitor: average FPS below this drops one preset. */
export const PERF_MIN_FPS = 45;
/** Ignore FPS for this long after the scene is ready (shader compile / load hitches). */
export const PERF_WARMUP_MS = 3000;
/** Consecutive declines before the monitor gives up (stays at the floor). */
export const PERF_MAX_FLIPFLOPS = 3;
