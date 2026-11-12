/**
 * Lobby layout + rules shared by client (rendering, local checks) and server
 * (authoritative pad occupancy, validation). Units: metres; -Z = north.
 */
export const LOBBY_LAYOUT = {
  /** Walkable plaza (compact: everything is a short walk away). */
  bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 14 },
  spawn: { x: 0, z: 10, yaw: 0, scatter: 2 },
  /** Expedition pads: two rows of four at the north end (front row first), crew size 1-2-3-4 left to right. */
  pads: [
    ...[-9, -3, 3, 9].map((x, i) => ({ x, z: -9, size: i + 1 })),
    ...[-9, -3, 3, 9].map((x, i) => ({ x, z: -15, size: i + 1 })),
  ],
  padSize: 4.6,
} as const;

export const LOBBY_RULES = {
  /** Max client position updates per second. */
  moveHz: 15,
  /** Max plausible speed (m/s) incl. slack; faster updates are clamped. */
  maxSpeed: 9,
  /** Seconds of countdown once a pad's crew is complete (time to pick the map). */
  fullCountdown: 8,
  /** Seconds a dropped player (network trouble, reload) keeps their seat and their place in the run. */
  reconnectSeconds: 60,
} as const;

/** The jungle maps, in order. playable = built (the others show as coming soon). */
export const CHAPTERS = [
  { n: 1, name: "The Overgrowth", playable: true },
  { n: 2, name: "Misty Gorge", playable: false },
  { n: 3, name: "Sunken Temple", playable: false },
] as const;

/** A map opens once you escaped the one before it (the first is always open). best = highest chapter escaped. */
export const chapterUnlocked = (n: number, best: number) => n === 1 || best >= n - 1;
export const chapterPlayable = (n: number) => CHAPTERS.some((c) => c.n === n && c.playable);

/** Index of the pad containing (x, z), or -1. */
export function padAt(x: number, z: number): number {
  const half = LOBBY_LAYOUT.padSize / 2;
  for (let i = 0; i < LOBBY_LAYOUT.pads.length; i++) {
    const p = LOBBY_LAYOUT.pads[i];
    if (Math.abs(x - p.x) <= half && Math.abs(z - p.z) <= half) return i;
  }
  return -1;
}
