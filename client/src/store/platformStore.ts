import { create } from "zustand";
import type { LegionGuest, LegionUser, BloxityEnvironment } from "../platform/legion";

/**
 * Mirrors what the single onUserChanged subscription reports. Read the user
 * from here (or Legion.SDK.auth.getUser()); never cache it anywhere else.
 */
interface PlatformState {
  sdkAvailable: boolean;
  embedded: boolean;
  env: BloxityEnvironment | null;
  user: LegionUser | null;
  /** Boxity guest identity while signed out (name like "Comet42"). */
  guest: LegionGuest | null;
  /** True while Boxity runs an ad break: simulation paused, audio muted. */
  adBreak: boolean;
  masterVolume: number;
  musicVolume: number;
  cameraSensitivity: number;
}

export const usePlatformStore = create<PlatformState>(() => ({
  sdkAvailable: false,
  embedded: false,
  env: null,
  user: null,
  guest: null,
  adBreak: false,
  masterVolume: 80,
  musicVolume: 80,
  cameraSensitivity: 1,
}));
