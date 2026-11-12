/**
 * Room sizing shared by client and server.
 * One room holds the whole lobby (20 players); parties of 1-4 run the jungle
 * inside that same room (docs/SDK.md forbids moving players between rooms).
 */
export const ROOM_LIMITS = {
  lobbyMaxClients: 20,
  partyMax: 4,
} as const;
