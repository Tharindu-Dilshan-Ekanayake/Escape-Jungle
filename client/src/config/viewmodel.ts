/** First-person tool viewmodel: rest pose, swing keyframes and walk bob. */
export const VIEWMODEL = {
  fov: 55,
  /** Rest pose in viewmodel-camera space (m / radians). */
  rest: { x: 0.36, y: -0.36, z: -0.86, rx: -0.85, ry: 0.5, rz: 0.35 },
  /**
   * Swing keyframes over normalised swing time u (0..1): offsets from rest.
   * Wind-up -> fast slash across to the left -> recover.
   */
  keys: [
    { u: 0, x: 0, y: 0, rx: 0, ry: 0, rz: 0 },
    { u: 0.2, x: 0.06, y: 0.08, rx: -0.25, ry: 0.35, rz: 0.55 },
    { u: 0.42, x: -0.42, y: -0.06, rx: 0.35, ry: -0.9, rz: -1.15 },
    { u: 1, x: 0, y: 0, rx: 0, ry: 0, rz: 0 },
  ],
  bob: { freq: 1.9, amountX: 0.012, amountY: 0.01 },
  /** Idle breathing sway when standing still. */
  idle: { freq: 1.6, amount: 0.006 },
  /** Raise-from-below animation when a new tool is equipped. */
  equipTime: 0.45,
  equipDrop: 0.45,
  /** Swing trail is recorded during this part of the swing (normalised time). */
  trail: { from: 0.16, to: 0.56 },
  /** Campfire warm fill light on the hands (x campfire glow 0..1). */
  fireFill: 1.6,
  /**
   * Per-tool hold: offsets added to the rest pose (long tools sit lower and further out),
   * and how much of the swing they do (the machine sweeps less, it cuts with its disc).
   */
  hold: {
    sickle: { x: 0.02, y: 0.02, z: 0, rx: 0, swing: 1 },
    machete: { x: 0, y: 0, z: 0, rx: 0, swing: 1 },
    shears: { x: 0, y: -0.02, z: 0, rx: 0, swing: 1 },
    scythe: { x: 0.04, y: -0.22, z: -0.25, rx: 0.1, swing: 0.85 },
    axe: { x: 0, y: -0.04, z: 0, rx: 0, swing: 1 },
    glaive: { x: 0.04, y: -0.26, z: -0.22, rx: 0.05, swing: 0.9 },
    grassCutter: { x: 0.06, y: -0.34, z: -0.3, rx: 0.15, swing: 0.55 },
  } as Record<string, { x: number; y: number; z: number; rx: number; swing: number }>,
  /** The grass cutter disc: idle and cutting spin (rad/s), engine shake (m). */
  spinner: { idle: 14, cutting: 70, shake: 0.004 },
};
