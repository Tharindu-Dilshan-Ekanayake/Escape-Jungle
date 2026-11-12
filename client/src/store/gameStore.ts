import { create } from "zustand";
import { useBootStore } from "./bootStore";

export type SceneKey = "lobby" | "run";

export interface RunInfo {
  runId: string;
  chapter: number;
  members: string[];
  /** Started offline (no server): purely local run. */
  solo: boolean;
}

interface GameState {
  scene: SceneKey;
  run: RunInfo | null;
  enterRun: (run: RunInfo) => void;
  /** Local scene switch back to the lobby (the net layer tells the server). */
  leaveRun: () => void;
}

/** Which stage is mounted. Changing it shows the loading screen until the stage is ready. */
export const useGameStore = create<GameState>((set, get) => ({
  scene: "lobby",
  run: null,
  enterRun: (run) => {
    if (get().scene === "run") return;
    useBootStore.setState({ ready: false });
    set({ scene: "run", run });
  },
  leaveRun: () => {
    if (get().scene === "lobby") return;
    useBootStore.setState({ ready: false });
    set({ scene: "lobby", run: null });
  },
}));
