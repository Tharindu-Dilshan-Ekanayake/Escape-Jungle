/**
 * Lobby layout + rules shared by client (rendering, local checks) and server
 * (authoritative pad occupancy, validation). Units: metres; -Z = north.
 */
/**
 * Three expedition areas at the north end, one per map: Misty Gorge (west),
 * The Overgrowth (centre), Sunken Temple (east). Each is a 4 x 2 block of 8 pads:
 * two pads for each crew size, 1 and 2 in front, 3 and 4 behind, so several crews
 * (and several solo players) can set off from the same map at once.
 */
const AREAS = [
  { chapter: 2, x: -21 },
  { chapter: 1, x: 0 },
  { chapter: 3, x: 21 },
] as const;

/** Pad rows (z) and the crew size of each pad along the row, west to east. */
const PAD_ROWS = [
  { z: -9, sizes: [1, 1, 2, 2] },
  { z: -15, sizes: [3, 3, 4, 4] },
] as const;
const PAD_PITCH = 4.2;

export const LOBBY_LAYOUT = {
  /** Walkable plaza (wide enough for the three expedition areas). */
  bounds: { minX: -31, maxX: 31, minZ: -20, maxZ: 14 },
  spawn: { x: 0, z: 10, yaw: 0, scatter: 2 },
  areas: AREAS,
  /** Expedition pads: per area two of each crew size (see PAD_ROWS); each pad plays its area's map. */
  pads: AREAS.flatMap((a) =>
    PAD_ROWS.flatMap((row) =>
      row.sizes.map((size, col) => ({ x: a.x + (col - (row.sizes.length - 1) / 2) * PAD_PITCH, z: row.z, size: size as number, chapter: a.chapter as number })),
    ),
  ),
  padSize: 3.6,
  /** Rows of pads (z) and the distance between neighbouring pads in a row (boardwalks, signs). */
  padRows: PAD_ROWS.map((r) => r.z),
  padPitch: PAD_PITCH,
  /** Pads per row: the boardwalk under a row spans (cols - 1) * pitch + padSize. */
  padCols: 4,
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
  { n: 2, name: "Misty Gorge", playable: true },
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
