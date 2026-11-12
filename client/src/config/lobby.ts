/**
 * Lobby hub visuals (positions shared with the server live in @shared/lobby).
 * Compact plaza: spawn at the south, glowing arrows to two rows of party
 * pads at the north, a waterfall cliff behind them, leaderboards west,
 * bouncy mushrooms for fun. No shops (Boxity handles the store).
 */
export const LOBBY_VIEW = {
  seed: 4242,
  tileSize: 2,
  /** Tiles are inset this much so the grout slab shows between them. */
  tileGap: 0.1,
  tileColors: ["#ecd5a6", "#e4c995", "#f1ddb4", "#dcc08a"],
  grout: "#b89a6c",
  /** Compass mosaic in the middle of the plaza. */
  centre: { x: 0, z: 1, r: 3.6 },
  parkTrees: [
    [15.5, 9], [15.5, -1], [-16, -15], [16, -15],
  ] as [number, number][],
  /** Benches facing the plaza centre: [x, z]. */
  benches: [
    [7.5, 5.5], [-7.5, 5.5], [8.5, -2.5], [-8.5, -2.5],
  ] as [number, number][],
  /** Flower beds: [x, z, length, rotY]. */
  flowerBeds: [
    [-10, 13.2, 7, 0], [10, 13.2, 7, 0], [19.2, 4, 9, Math.PI / 2],
  ] as [number, number, number, number][],
  hedge: { spacing: 2.2, offset: 1.6 },
  lawn: "#6fb34a",
  lawnDark: "#5a9a3c",
  path: "#d9c08c",
  pad: { base: "#4b7a2c", inner: "#8fd14f", glow: "#d6ff4a" },
  /** Leaderboards along the west side, facing the plaza. */
  boards: [
    { x: -17.5, z: -2, title: "GRASS CUT" },
    { x: -17.5, z: 3.5, title: "ESCAPES" },
    { x: -17.5, z: 9, title: "BEST TIMES" },
  ],
  lamps: [
    [-5, 8], [5, 8], [-5, -4], [5, -4], [-13, -6], [13, -6],
  ] as [number, number][],
  planters: [
    [-3.4, 12.4], [3.4, 12.4],
  ] as [number, number][],
  trees: { count: 36, minR: 28, maxR: 52 },
  bushes: { count: 70, minR: 25, maxR: 40 },
  bunting: { colors: ["#ff5a5a", "#ffd23f", "#4cc3f0", "#7bdc4f", "#b77bff"] },
  /** Glowing chevrons on the ground from the spawn to the pads. */
  arrows: { x: 0, fromZ: 7.2, toZ: -4.6, step: 1.45 },
  /** Bouncy mushrooms: stand on one to fly. */
  mushrooms: [
    [11.5, 7.5], [-11, 8.5], [12, -9.5],
  ] as [number, number][],
  bounce: { radius: 1.25, velocity: 15 },
  /** Waterfall cliff outside the north fence. */
  waterfall: { x: 0, z: -29, cliffWidth: 34, height: 13, fallWidth: 5, poolZ: -24.5, poolR: 5.2 },
};

/** Third-person camera used in the lobby. */
export const THIRD_PERSON = {
  distance: 6,
  /** Mouse-wheel zoom range and step (m). */
  minDistance: 3,
  maxDistance: 11,
  zoomStep: 0.8,
  /** Camera looks at this height above the feet. */
  targetHeight: 1.6,
  minPitch: -1.2,
  maxPitch: 0.5,
  /** Avatar turns toward the move direction at this rate (1/s). */
  turnRate: 11,
  /** Fastest body spin (rad/s). */
  maxTurnSpeed: 14,
};

/** Blocky avatar proportions + colour choices (picked per player from their id). */
export const AVATAR = {
  scale: 0.82,
  skins: ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"],
  shirts: ["#2f6fd6", "#e8533a", "#3f8f4f", "#f2c230", "#9b59d0", "#1f9a8a", "#ff7ab6", "#333a44"],
  pants: ["#2a2f3a", "#3b4a6b", "#4a3b2a", "#1f3b2a"],
  eyes: "#1a1a1a",
  walkSwing: 0.7,
  walkFreq: 2.2,
  /** Remote position smoothing (1/s). */
  smoothing: 12,
};

/** Boxity avatars (player.glb rig) and their LOD budget. */
export const AVATAR_ASSETS = {
  /** Our avatar height (m); the rig is 6.4 units tall with feet at y = 0. */
  height: 2.0,
  rigHeight: 6.4,
  /** Tools in other players' hands: bigger than life so they read from a distance, raised forward (rad above level). */
  heldToolScale: 1.8,
  heldToolRaise: 0.95,
  /** Downscale any item/skin texture above this (px). */
  maxTexture: 256,
  /** Remote avatars beyond this distance are not drawn (m). */
  maxDistance: 40,
  /** Max avatar bodies drawn / how many nearest players also show items. */
  bodies: { desktop: 20, low: 12 },
  detailed: { desktop: 10, low: 5 },
  lodIntervalS: 0.5,
};
