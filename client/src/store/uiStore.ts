import { create } from "zustand";

export type PanelKey = "upgrades" | "settings" | "map" | "store" | "share" | null;

/** Low-frequency UI state (changed by DOM events, never per frame). */
interface UiState {
  pointerLocked: boolean;
  panel: PanelKey;
  /** Open a panel (frees the mouse so its buttons can be clicked) or close with null. */
  openPanel: (panel: PanelKey) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  pointerLocked: false,
  panel: null,
  openPanel: (panel) => {
    if (panel && document.pointerLockElement) document.exitPointerLock();
    set({ panel: get().panel === panel ? null : panel });
  },
}));
