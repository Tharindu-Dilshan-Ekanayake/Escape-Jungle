import { create } from "zustand";

/** Snapshot of the local player's avatar face (data URL), taken in the lobby. */
export const usePortraitStore = create<{ url: string }>(() => ({ url: "" }));
