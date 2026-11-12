/**
 * Crash-site dressing (world/camp1/crashCamp.ts): a rough survivor camp in a
 * strange old jungle. Positions are world metres around the camp origin;
 * -Z = north (the trail out to the Meadow).
 */
export const CRASH_CAMP = {
  /** Half-buried stone head with glowing eyes, looking at the camp. */
  idol: { x: -7.4, z: -10.4 },
  /** [x, z, height]; height 0 = a toppled pillar lying in the dirt. */
  pillars: [
    [10.2, -5.6, 2.6],
    [-10.6, 6.8, 1.2],
  ] as [number, number, number][],
  /** Glowing mushroom clusters (by the ruins and the trail). */
  mushrooms: [] as [number, number][],
  glowColors: ["#6ff7ff", "#9b7bff", "#7fffa8", "#ff8ad8"],
  /** Log seats round the fire: [x, z, yaw] (front = +Z faces the fire). */
  seats: [
    [-3.6, 3.0, 1.93],
    [-1.2, 4.4, -3.0],
    [0.7, 1.0, -1.07],
  ] as [number, number, number][],
  /** "SOS" in white stones behind the spawn point. */
  sos: { x: 0.5, z: 9.6, size: 1.0 },
  /** Paw prints [fromX, fromZ, toX, toZ] leading out of camp into the trees. */
  paws: [6.4, -9.4, 9.6, -15],
  /** Big rain catcher beside the trail out (toward the next area). */
  water: { x: -4.6, z: -7.4, scale: 1.45 },
  /** The parachute shelter is extra big here. */
  tentScale: 1.4,
  /** Fallen trunks: [x, z, yaw, length]. */
  fallen: [
    [-7.6, 9.6, 0.9, 4.2],
    [-3.8, 13.6, 2.4, 3.4],
  ] as [number, number, number, number][],
  suitcase: { x: -3.0, z: 6.6, rot: 0.5 },
};
