/** Stepping-stone trails from every base into the area it leads to (see world/zones/basePaths.ts). */
export const BASE_PATH = {
  /** Crash site: the trail starts at the clearing's north edge (past the 2X CASH sign). */
  campStart: { x: 0, z: -10 },
  /** Keep the crash site's random scatter (rocks, flowers, torches...) off the trail: |x| < halfWidth, z < fromZ. */
  campClear: { halfWidth: 2.4, fromZ: -4 },
  /** Outposts: start this far from the centre (keeps the middle free). */
  outpostClear: 2.2,
  /** Stop this far inside each end of the corridor. */
  inset: 0.6,
  step: 0.8,
  wobble: 0.16,
  stoneR: [0.2, 0.29] as [number, number],
  pebbleEvery: 3,
  border: 0.95,
  lampEvery: 5.5,
  lampSide: 1.5,
  stone: "#8f8674",
  stoneTop: "#b3a990",
  pebble: "#9a9282",
  post: "#6b4423",
  lamp: "#ffcf6a",
  lampCap: "#3a3a3a",
  flowers: ["#ff6fae", "#ffd23f", "#ffffff", "#b77bff"],
};
