/**
 * Lobby layout + rules shared by client (rendering, local checks) and server
 * (authoritative pad occupancy, validation). Units: metres; -Z = north.
 */
/**
 * Three expedition areas at the north end, one per map: Misty Gorge (west),
 * The Overgrowth (centre), Sunken Temple (east). Each is a 2 x 2 block of pads
 * for crews of 1 and 2 (front) and 3 and 4 (back).
 */
const AREAS = [
  { chapter: 2, x: -21 },
  { chapter: 1, x: 0 },
  { chapter: 3, x: 21 },
] as const;

export const LOBBY_LAYOUT = {
  /** Walkable plaza (wide enough for the three expedition areas). */
  bounds: { minX: -31, maxX: 31, minZ: -20, maxZ: 14 },
  spawn: { x: 0, z: 10, yaw: 0, scatter: 2 },
  areas: AREAS,
  /** Expedition pads: per area, crews of 1 and 2 in front, 3 and 4 behind; each pad plays its area's map. */
  pads: AREAS.flatMap((a) => [
    { x: a.x - 3, z: -9, size: 1, chapter: a.chapter },
    { x: a.x + 3, z: -9, size: 2, chapter: a.chapter },
    { x: a.x - 3, z: -15, size: 3, chapter: a.chapter },
    { x: a.x + 3, z: -15, size: 4, chapter: a.chapter },
  ]),
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
