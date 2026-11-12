/**
 * Day/night cycle, darker jungle mood, campfires and the eyes in the dark.
 * All times in seconds; colours are hex. Darkness k: 0 = day, 1 = full night.
 */
export const CYCLE = {
  /** Phase lengths. The run starts at the beginning of the day. */
  day: 170,
  dusk: 25,
  night: 95,
  dawn: 20,
  /** Night fog: start/end distance multipliers on the preset view distance at k = 1. */
  nightFogStart: 0.12,
  nightFogEnd: 0.62,
  dayFogStart: 0.45,
};

/** Light keys: day (moody overcast jungle) -> dusk (orange) -> night (moonlight). */
export interface LightKey {
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: string;
  sunI: number;
  fog: string;
  sky: string;
}
export const LIGHT_KEYS: { day: LightKey; dusk: LightKey; night: LightKey } = {
  // Deep-jungle day: a little darker and moodier (green-grey haze, softer sun).
  day: { hemiSky: "#a0c8b8", hemiGround: "#33502a", hemi: 1.05, sun: "#fff0c0", sunI: 1.5, fog: "#4f8577", sky: "#a6ccbf" },
  dusk: { hemiSky: "#d99a6c", hemiGround: "#3d3322", hemi: 0.85, sun: "#ff8a4a", sunI: 1.15, fog: "#7a5c52", sky: "#ff9f7a" },
  night: { hemiSky: "#40598a", hemiGround: "#121a12", hemi: 0.5, sun: "#8fb0ff", sunI: 0.5, fog: "#0c1420", sky: "#1c2848" },
};

/** Viewmodel (hands + tool) never goes darker than this fraction of daylight. */
export const VIEWMODEL_MIN_LIGHT = 0.45;

export const STARS = { count: 260, size: 2.2, minElevation: 0.08 };
export const MOON = { size: 0.06, color: "#eef3ff", direction: [-0.45, 0.55, -0.7] as [number, number, number] };

export const CAMPFIRE = {
  /** Logs a pit shows (and the most a player carries). Fuel per log: RUN_RULES.logSeconds. */
  woodToLight: 5,
  /** Logs the player can carry at once. */
  carryMax: 5,
  depositRadius: 2.8,
  depositInterval: 0.22,
  /** Within this distance of a lit fire you're "safe" (no eyes, calm vignette). */
  safeRadius: 13,
  collider: 0.95,
  light: { color: "#ff9a3c", intensity: 34, distance: 24, decay: 1.6, flicker: 0.18, height: 1.4 },
  crackleGap: [0.08, 0.35] as [number, number],
  crackleRange: 16,
  /** Where Camp 1's fire pit sits (outposts compute theirs). */
  camp: { x: -1.5, z: 2.2 },
};

export const EYES = {
  max: 6,
  /** Seconds between spawns at full night (random in range). */
  spawnGap: [2.5, 6] as [number, number],
  minDarkness: 0.6,
  distance: [12, 24] as [number, number],
  height: [1.1, 2.5] as [number, number],
  /** Max distance (m) into the treeline from the walkable edge. */
  edgeDepth: 4,
  life: [3.5, 7] as [number, number],
  /** Eyes vanish when the player walks closer than this. */
  vanishDistance: 8,
  spacing: 0.24,
  size: 0.09,
  color: "#ffcf3a",
  growlChance: 0.4,
  /** Share of spawns placed inside the view cone (radians) in front of the player. */
  inViewChance: 0.6,
  viewCone: 1.4,
  heartbeatRange: 18,
};

/** Screen vignette opacity: day / full night / full night near a lit fire. */
export const VIGNETTE = { day: 0.25, night: 0.85, nightSafe: 0.45 };
