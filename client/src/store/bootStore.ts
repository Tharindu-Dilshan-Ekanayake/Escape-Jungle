import { create } from "zustand";

/** Boot/loading lifecycle for the loading screen and the SDK loading calls. */
interface BootState {
  ready: boolean;
  markReady: () => void;
}

export const useBootStore = create<BootState>((set) => ({
  ready: false,
  markReady: () => set({ ready: true }),
}));
