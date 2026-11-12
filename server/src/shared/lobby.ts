/**
 * Lobby layout + rules shared by client (rendering, local checks) and server
 * (authoritative pad occupancy, validation). Units: metres; -Z = north.
 */
export const LOBBY_LAYOUT = {
  /** Walkable plaza (compact: everything is a short walk away). */
  bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 14 },
  spawn: { x: 0, z: 10, yaw: 0, scatter: 2 },
  /** Party pads: two rows of four at the north end (front row first). */
  pads: [
    ...[-9, -3, 3, 9].map((x) => ({ x, z: -9 })),
    ...[-9, -3, 3, 9].map((x) => ({ x, z: -15 })),
  ],
  padSize: 4.6,
} as const;

export const LOBBY_RULES = {
  /** Max client position updates per second. */
  moveHz: 15,
  /** Max plausible speed (m/s) incl. slack; faster updates are clamped. */
  maxSpeed: 9,
  /** Seconds of countdown when the host presses START. */
  hostCountdown: 3,
  /** Seconds of countdown when a pad fills up on its own. */
  fullCountdown: 5,
  defaultPartySize: 4,
  /** Seconds a dropped player keeps their slot. */
  reconnectSeconds: 15,
  /** Chapters that can be started (later chapters unlock in Phase 5+). */
  unlockedChapters: [1],
} as const;

/** Index of the pad containing (x, z), or -1. */
export function padAt(x: number, z: number): number {
  const half = LOBBY_LAYOUT.padSize / 2;
  for (let i = 0; i < LOBBY_LAYOUT.pads.length; i++) {
    const p = LOBBY_LAYOUT.pads[i];
    if (Math.abs(x - p.x) <= half && Math.abs(z - p.z) <= half) return i;
  }
  return -1;
}
