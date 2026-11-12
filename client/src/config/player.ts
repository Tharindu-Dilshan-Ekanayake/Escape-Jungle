/** First-person controller tuning. Walk speed itself comes from balance.ts (legs). */

/** Balance numbers use Roblox-style studs; 1 stud ~ 0.28 m. */
export const STUD_TO_M = 0.28;

export const PLAYER = {
  eyeHeight: 1.6,
  radius: 0.4,
  gravity: 30,
  jumpVelocity: 10,
  /** Velocity smoothing toward the target (1/s). */
  accel: 16,
  /** Fraction of ground acceleration available in the air. */
  airControl: 0.4,
  /** Physics sub-step size (s): slow frames run several steps instead of slowing down. */
  maxDt: 0.034,
  /** Cap on sub-steps per frame; time beyond this after a long hitch is dropped. */
  maxSteps: 6,
  pitchLimit: (85 * Math.PI) / 180,
  collisionPasses: 2,
  /** Landing faster than this (m/s down) plays the land sound. */
  landSoundSpeed: 4,
  /** Below this horizontal speed (m/s) footsteps stop. */
  footstepMinSpeed: 0.8,
};

export const LOOK = {
  /** Radians per mouse pixel at camera_sensitivity 1. */
  mouse: 0.0022,
  /** Radians per dragged mouse pixel (lobby, no pointer lock). */
  drag: 0.006,
  /** Radians per touch pixel at camera_sensitivity 1. */
  touch: 0.0055,
  /** Look smoothing time constant (s): evens out uneven mouse/touch event timing. */
  smoothFirst: 0.022,
  smoothThird: 0.04,
  /** Pointer-lock deltas bigger than this (px) are browser glitches; ignore them. */
  spikePx: 220,
};

export const TOUCH = {
  /** Left part of the screen that spawns the joystick (0..1). */
  joystickZone: 0.45,
  joystickRadius: 56,
  deadzone: 0.12,
};
