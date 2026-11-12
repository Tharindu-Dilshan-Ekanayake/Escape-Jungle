/**
 * Misty teal jungle round the Landing Site and the Tall Grass Meadow
 * (world/zones/mistyForest.ts + world/environment/LightShafts.tsx).
 */
/** Round every other area: tall trunks, lianas, a boulder, ferns and high canopy at the edges. */
export const DEEP_JUNGLE = { trunks: 24, lianas: 5, boulders: 1, ferns: 3, overhang: 8 };

export const MISTY = {
  /** Tall thin dark trunks rising into the mist. */
  trunks: { camp: 34, campR: [13, 32] as [number, number], meadow: 22, minH: 22, maxH: 34 },
  /** Lianas sagging between the trees: count per area, length and sag. */
  lianas: { camp: 7, meadow: 6, len: [6, 10] as [number, number], sag: 2.4, height: [6.5, 9.5] as [number, number] },
  /** Big mossy boulders. */
  boulders: { camp: 2, meadow: 3 },
  /** Bright fern clumps at the clearing edge. */
  ferns: { camp: 12, meadow: 6 },
  /** Sunbeams through the canopy: [x, z, tilt, width]. Faded out at night. */
  shafts: [
    [1.5, -1.5, 0.28, 2.2],
    [-4.5, 4.5, 0.22, 1.6],
    [5.5, 6.5, 0.3, 1.8],
    [-5, -40, 0.25, 3.0],
    [5, -28, 0.3, 2.4],
    [-3, -52, 0.22, 2.6],
  ] as [number, number, number, number][],
  shaftHeight: 26,
  shaftOpacity: 0.13,
};
