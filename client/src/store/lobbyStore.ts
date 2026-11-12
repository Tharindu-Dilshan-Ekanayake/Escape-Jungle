import { create } from "zustand";

export interface PadView {
  index: number;
  host: string;
  maxPlayers: number;
  chapter: number;
  members: string[];
  countdown: number;
}

export interface PlayerView {
  id: string;
  name: string;
  uid: string;
  zone: string;
  connected: boolean;
  /** Highest chapter escaped (0 = none): which maps they may play. */
  best: number;
  /** Own countdown (whole seconds) on a solo pad, -1 when not on one. */
  wait: number;
}

export type NetStatus = "connecting" | "online" | "offline";

/**
 * UI-level lobby state from the server (names, zones, pads). Updated from
 * network callbacks only when something changed - never per frame, never
 * positions (those live in the mutable remote-player map).
 */
interface LobbyState {
  status: NetStatus;
  roomId: string;
  me: string;
  players: PlayerView[];
  pads: PadView[];
  /** Offline mode: pad the local player stands on (-1 none). */
  localPad: number;
}

export const useLobbyStore = create<LobbyState>(() => ({
  status: "connecting",
  roomId: "",
  me: "",
  players: [],
  pads: [],
  localPad: -1,
}));

/** The pad the local player is on (online: from server membership; offline: local). */
export function myPadIndex(s: LobbyState): number {
  if (s.status !== "online") return s.localPad;
  const pad = s.pads.find((p) => p.members.includes(s.me));
  return pad ? pad.index : -1;
}
