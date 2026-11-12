import type { PlayerSave } from "./save.js";
/**
 * Shared between client (via the `@shared` path alias) and server.
 * Plain TS only: never import server-only or browser-only packages here.
 */
export const ROOM_NAMES = {
  /** The one room type: lobby hub + the jungle runs of its parties. */
  lobby: "lobby",
} as const;

export type RoomName = (typeof ROOM_NAMES)[keyof typeof ROOM_NAMES];

export const MSG = {
  // client -> server
  /** { x, z, yaw } position in the lobby, at most LOBBY_RULES.moveHz per second. */
  move: "move",
  /** Ask the server to put me on the nearest pad with space. */
  quickJoin: "quickJoin",
  /** Host only: { chapter } the map this pad's crew will play (must be unlocked for everyone on it). */
  padChapter: "padChapter",
  /** { look } my equipped Boxity avatar item ids (validated server-side). */
  look: "look",
  /** { id } play an emote (client -> server); { sid, id } relayed to others (server -> client). */
  emote: "emote",
  /** Back from the jungle to the lobby. */
  leaveRun: "leaveRun",
  // server -> client
  /** { x, z, yaw } authoritative reposition (quick join, back from a run). */
  teleport: "teleport",
  /** { runId, chapter, members } your party is starting. */
  runStart: "runStart",
  // Jungle sync messages live in shared/run.ts (RUN_MSG).
} as const;

export type MessageName = (typeof MSG)[keyof typeof MSG];

export interface MovePayload {
  x: number;
  z: number;
  yaw: number;
}

export interface RunStartPayload {
  runId: string;
  chapter: number;
  members: string[];
  /** Your progress when this crew continues a saved expedition (null = fresh start). */
  resume?: PlayerSave | null;
}
