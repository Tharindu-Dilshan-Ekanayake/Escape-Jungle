/** F3 debug overlay settings and the budgets it colours against. */
export const DEBUG_TOGGLE_KEY = "F3";
/** How often the overlay text refreshes (ms). Sampling happens every frame into a ref. */
export const DEBUG_REFRESH_MS = 250;

export const PERF_BUDGETS = {
  mobile: { drawCalls: 80, triangles: 100_000, minFps: 45 },
  desktop: { drawCalls: 150, triangles: 300_000, minFps: 60 },
} as const;
