/**
 * Chapter 1 progression: the crash-site camp (origin, r 24), then six themed
 * zones IN ORDER. Each zone ends in a gate that opens once the zone is cleared
 * to GATES.clearToOpen; behind it is an outpost (small base with a grinder),
 * and the next zone. After the last zone: the exit (rescue helicopter).
 * Rects: minX/maxX/minZ/maxZ in metres; -Z = north. The path winds N/E/N/W/N/W.
 */
export type TreeKind = "broadleaf" | "treeFern" | "mangrove" | "bambooClump" | "bananaPalm" | "blossom";

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export interface ZoneDef {
  id: string;
  name: string;
  plantId: number;
  tree: TreeKind;
  rect: Rect;
  /** Path from the previous base (camp or outpost) into this zone. */
  corridor: Rect;
  /** Path from this zone to the next base; the gate sits in it. */
  exit: Rect;
  /** Gate position + yaw (gate spans along its local X). */
  gate: { x: number; z: number; rotY: number; width: number };
  /** The base reached through the gate (an outpost, or the exit for the last zone). */
  base: { x: number; z: number; r: number; name: string };
  innerTrees: number;
  floor: string;
}

const H = Math.PI / 2;

export const ZONES1: ZoneDef[] = [
  {
    id: "meadow", name: "Tall Grass Meadow", plantId: 1, tree: "broadleaf", innerTrees: 5, floor: "#8B5A2B",
    // Starts right past the Landing Site edge (short walk from camp).
    rect: { minX: -10, maxX: 10, minZ: -60, maxZ: -14 },
    corridor: { minX: -3, maxX: 3, minZ: -15, maxZ: -9 },
    exit: { minX: -3.5, maxX: 3.5, minZ: -70, maxZ: -59 },
    gate: { x: 0, z: -63.5, rotY: 0, width: 7 },
    base: { x: 0, z: -75, r: 10.5, name: "Outpost 1" },
  },
  {
    id: "ferns", name: "Fern Gully", plantId: 2, tree: "treeFern", innerTrees: 5, floor: "#6b4f2a",
    rect: { minX: 16, maxX: 46, minZ: -90, maxZ: -60 },
    corridor: { minX: 4, maxX: 17, minZ: -79, maxZ: -71 },
    exit: { minX: 45, maxX: 57, minZ: -79, maxZ: -71 },
    gate: { x: 49.5, z: -75, rotY: H, width: 8 },
    base: { x: 62, z: -75, r: 10.5, name: "Outpost 2" },
  },
  {
    id: "marsh", name: "Reed Marsh", plantId: 3, tree: "mangrove", innerTrees: 5, floor: "#5d5a3a",
    rect: { minX: 47, maxX: 77, minZ: -123, maxZ: -93 },
    corridor: { minX: 58, maxX: 66, minZ: -94, maxZ: -80 },
    exit: { minX: 58.5, maxX: 65.5, minZ: -133, maxZ: -122 },
    gate: { x: 62, z: -126.5, rotY: 0, width: 7 },
    base: { x: 62, z: -138, r: 10.5, name: "Outpost 3" },
  },
  {
    id: "bamboo", name: "Bamboo Grove", plantId: 4, tree: "bambooClump", innerTrees: 3, floor: "#7a6a3a",
    rect: { minX: 16, maxX: 46, minZ: -153, maxZ: -123 },
    corridor: { minX: 45, maxX: 57, minZ: -142, maxZ: -134 },
    exit: { minX: 5, maxX: 17, minZ: -142, maxZ: -134 },
    gate: { x: 12, z: -138, rotY: H, width: 8 },
    base: { x: 0, z: -138, r: 10.5, name: "Outpost 4" },
  },
  {
    id: "banana", name: "Banana Grove", plantId: 5, tree: "bananaPalm", innerTrees: 5, floor: "#7a4f2a",
    rect: { minX: -15, maxX: 15, minZ: -186, maxZ: -156 },
    corridor: { minX: -4, maxX: 4, minZ: -157, maxZ: -143 },
    exit: { minX: -3.5, maxX: 3.5, minZ: -196, maxZ: -185 },
    gate: { x: 0, z: -189.5, rotY: 0, width: 7 },
    base: { x: 0, z: -201, r: 10.5, name: "Outpost 5" },
  },
  {
    id: "flowers", name: "Flower Hollow", plantId: 6, tree: "blossom", innerTrees: 5, floor: "#6e5a3a",
    rect: { minX: -46, maxX: -16, minZ: -216, maxZ: -186 },
    corridor: { minX: -17, maxX: -5, minZ: -205, maxZ: -197 },
    exit: { minX: -57, maxX: -45, minZ: -205, maxZ: -197 },
    gate: { x: -50, z: -201, rotY: H, width: 8 },
    base: { x: -64, z: -201, r: 10, name: "Plane Wreck" },
  },
];

export const GATES = {
  /** Fraction of a zone that must be cleared to open its gate. */
  clearToOpen: 0.8,
  /** Seconds the gate takes to sink into the ground. */
  openTime: 1.6,
  depth: 3.2,
  thickness: 0.6,
};

/** The last zone's base is the exit: walk onto the helicopter pad to escape. */
export const EXIT = { padRadius: 3.5 };

/** Jungle wall scattered in a band around every zone (in that zone's tree style). */
export const ZONE_WALL = {
  band: 8,
  campSkipRadius: 30,
  /** Per 100 m of zone perimeter. */
  treesPer100m: 8,
  bushesPer100m: 12,
  foliagePer100m: 8,
  innerClearance: 0.45,
  /** Bushes + foliage ringing each outpost. */
  outpostRing: { bushes: 16, foliage: 0, torches: 0, darkTrees: 10 },
  /** Ground clutter inside each outpost so it never looks bare. */
  outpostClutter: { tufts: 26, leaves: 40, rocks: 4, flowers: 3 },
  seed: 909,
};
