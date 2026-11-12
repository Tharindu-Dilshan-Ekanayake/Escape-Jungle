/** Renderer / camera / lighting constants (no magic numbers in components). */
export const CAMERA = {
  fov: 70,
  near: 0.1,
  /** Far plane = preset.viewDistance * this. */
  farMultiplier: 1.5,
};

/** Fog starts at viewDistance * startRatio and is opaque at viewDistance. */
export const FOG = {
  startRatio: 0.62,
  /** The sunny lobby gets a lighter, bluer haze that starts further out. */
  /** The open lobby plaza never fogs in closer than this (m), even on LOW (it is cheap). */
  lobbyMinView: 50,
  lobbyStartRatio: 0.85,
  lobbyColor: "#cfe8ff",
};

/** Sky dome radius = far plane * this (must stay inside the far plane). */
export const SKY = { radiusRatio: 0.9 };

export const LIGHTING = {
  hemiSky: "#cfeaff",
  hemiGround: "#6f8f3a",
  hemiIntensity: 1.6,
  sun: "#fff0d2",
  sunIntensity: 2.4,
  sunPosition: [12, 30, 24] as [number, number, number],
  /** Half-size (m) of the static shadow camera around the stage origin. */
  shadowArea: 30,
  shadowFar: 90,
  shadowBias: -0.0006,
};

/** Firefly look + motion. */
export const FIREFLIES = {
  size: 0.06,
  drift: 0.8,
  bob: 0.35,
  blinkSpeed: 3,
};

/** Floating placeholder labels above props. */
export const LABELS = { distanceFactor: 9, maxDistance: 30 };
