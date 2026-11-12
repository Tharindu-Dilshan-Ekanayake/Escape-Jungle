import { create } from "zustand";

interface DebugState {
  overlayVisible: boolean;
  toggleOverlay: () => void;
  setOverlay: (visible: boolean) => void;
}

/** `?debug` in the URL forces the overlay on (used for headless perf checks). */
export const DEBUG_FROM_URL =
  typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");

export const useDebugStore = create<DebugState>((set) => ({
  overlayVisible: DEBUG_FROM_URL,
  toggleOverlay: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
  setOverlay: (overlayVisible) => set({ overlayVisible }),
}));

/**
 * Hot-path renderer stats. Written every frame by <RendererStats/> and read by
 * the overlay on an interval: a plain mutable object, never React/Zustand state.
 */
export const rendererStats = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  dpr: 1,
  /** Static per-stage info line (e.g. grass cell count). */
  info: "",
};
