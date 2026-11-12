/**
 * Chapter 1 / Camp 1 (the Landing Site) layout: work corner east (grinder,
 * tool board), living corner west (tent, food store). Origin = centre of the clearing, -Z = north
 * (toward the future grass zone). Props face the clearing centre unless rotY is set.
 */
export type PropKind = "grinder" | "toolBoard" | "bagTable" | "mowerStand" | "cashSign" | "nuke" | "moneyBox";

export interface PropPlacement {
  kind: PropKind;
  x: number;
  z: number;
  rotY?: number;
  label: string;
  /** Label height above ground (m). */
  labelY: number;
}

export const CAMP1 = {
  seed: 20261109,
  clearingRadius: 10,
  /** Walkable camp circle (the walkable region is this circle + the grass zones). */
  boundRadius: 21,
  /** Right beside the plane's nose wreck, looking at it (you crawled out of it). */
  spawn: { x: 0, z: 6.4, yaw: 0 },

  props: [
    { kind: "grinder", x: 7.6, z: -2.6, label: "GRINDER", labelY: 5 },
    { kind: "toolBoard", x: 7.8, z: 3.6, label: "TOOLS", labelY: 3.6 },
  ] as PropPlacement[],

  torches: { count: 6, radius: 9.6, minPropGap: 3 },
  /** Cheap creepy trees mixed into the ring (world/props/darkTree.ts). */
  darkTrees: { count: 14, minR: 11.5, maxR: 28 },
  trees: { count: 20, minR: 11.5, maxR: 34, minH: 12, maxH: 19, minTrunkR: 0.45, maxTrunkR: 0.9 },
  bushes: { count: 78, minR: 10.5, maxR: 20 },
  /** Mid-height foliage (2-10 m) that closes the gaps between trunks. */
  foliageWall: { count: 58, minR: 12, maxR: 26, minY: 2, maxY: 10 },
  /** Leaf masses hanging over the clearing edge, leaving the centre open to the sky. */
  overhang: { count: 22, minR: 9.5, maxR: 15, minY: 13, maxY: 19 },
  leafFans: { count: 80, minR: 10, maxR: 19 },
  flowers: { clusters: 14, min: 3, max: 5, minR: 4, maxR: 9.5 },
  mushrooms: { count: 0, minR: 9, maxR: 14 },
  rocks: { count: 10, minR: 5, maxR: 10.5 },
  fallenLeaves: { count: 200, maxR: 12 },
  tufts: { count: 100, minR: 7, maxR: 13 },
  fireflies: { max: 80, minR: 5, maxR: 14, minY: 0.6, maxY: 3.2 },
  clouds: { count: 9, minElevation: 0.12, maxElevation: 0.5 },
  ground: { radius: 245, rings: 40, segments: 64, edgeNoise: 1.6, outerBump: 0.5 },
};
