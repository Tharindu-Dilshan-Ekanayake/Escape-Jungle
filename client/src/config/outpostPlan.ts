/**
 * How every outpost is laid out (world/zones/outpostLayout.ts). Things stand
 * on an arc on the side away from both paths, each in its own place:
 * work corner (grinder + tool shop), the tent at the back, living corner
 * (food store + water), the campfire with log seats in the middle, and a
 * clear walkway between the paths. Angles in degrees from the free side.
 */
export const OUTPOST_PLAN = {
  /** Slot order across the arc, from one end to the other (offset -1 .. 1 of the spread). */
  slots: [
    { kind: "grinder", t: -1, ring: 0.8 },
    { kind: "shop", t: -0.5, ring: 0.8 },
    { kind: "tent", t: 0, ring: 0.8 },
    { kind: "store", t: 0.5, ring: 0.78 },
    { kind: "water", t: 1, ring: 0.74 },
  ] as const,
  /** Widest the arc may open (each side), and how far it must stay from the paths. */
  maxSpreadDeg: 72,
  pathClearDeg: 32,
  /** Campfire: this far from the centre toward the free side. */
  fireOffset: 3.2,
  /** Log seats round the fire: angles (deg, from the free side) and distance. */
  seatAngles: [-65, 65, 180] as number[],
  seatDist: 2.1,
  /** The quest giver stands on the walkway side of the fire. */
  npcOffset: 1.6,
};
