/** Sound mix (linear gains, 0..1) and ambience tuning. */
export const SFX = {
  maxVoices: 28,
  swing: 0.28,
  /** Grass cutter engine buzz per sweep. */
  motor: 0.1,
  cut: 0.5,
  rustle: 0.18,
  denied: 0.12,
  grinder: 0.14,
  coin: 0.55,
  equip: 0.7,
  chime: 0.12,
  click: 0.08,
  gate: 0.35,
  wood: 0.55,
  sparkle: 0.06,
  fire: 0.3,
  crackle: 0.12,
  growl: 0.22,
  heartbeat: 0.5,
  eat: 0.25,
  drink: 0.22,
  hurt: 0.35,
  thud: 0.45,
  grunt: 0.2,
  roar: 0.3,
  sizzle: 0.05,
  croak: 0.12,
  fanfare: 0.07,
  monkey: 0.06,
  boing: 0.14,
  jump: 0.45,
  land: 0.5,
  /** Footstep loop volume and playback rate at full walk speed. */
  footsteps: 0.35,
  footstepRate: 1.15,
};

export const AMBIENCE = {
  fadeS: 1.5,
  wind: 0.05,
  insects: 0.022,
  water: 0.05,
  /** Seconds between bird calls (random in range). */
  birdGap: [1.2, 4.5] as [number, number],
  bird: 0.05,
  /** Jungle only: occasional distant hoot. */
  hootChance: 0.18,
  hoot: 0.05,
  /** Night layers (scaled by darkness): crickets, low drone; birds fade out. */
  crickets: 0.03,
  drone: 0.06,
  owlChance: 0.35,
};

/** Intro cinematic sound levels. */
export const CINEMA_AUDIO = {
  engine: 0.16,
  whistle: 0.05,
  crash: 0.9,
  rumble: 0.7,
};
