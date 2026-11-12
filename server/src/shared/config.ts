/**
 * Room sizing shared by client and server.
 * One room holds the whole lobby (30 players); parties of 1-4 run the jungle
 * inside that same room (docs/SDK.md forbids moving players between rooms).
 */
/** Close code for a session replaced by the same player joining again (the old tab must not reconnect). */
export const CLOSE_REPLACED = 4001;

export const ROOM_LIMITS = {
  lobbyMaxClients: 30,
  partyMax: 4,
} as const;
