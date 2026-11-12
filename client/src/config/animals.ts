/** Wild animals: boars roam by day and night, jaguars hunt at night (and fear fire). */
/** Every animal goes down after this many machete hits (any tool). */
export const HITS_TO_KILL = 2;

export const BOAR = {
  hp: HITS_TO_KILL,
  speed: 1.5,
  run: 5.2,
  charge: 6.2,
  damage: 12,
  attackRange: 1.5,
  attackCooldown: 1.4,
  /** Close enough to notice a player. */
  alertRange: 9,
  /** Chance a boar charges instead of fleeing when it notices you. */
  chargeChance: 0.45,
  meat: 2,
  radius: 0.6,
};

export const JAGUAR = {
  hp: HITS_TO_KILL,
  stalk: 2.4,
  run: 7.2,
  damage: 16,
  attackRange: 1.7,
  attackCooldown: 1.5,
  /** Starts the final rush from this distance. */
  pounceRange: 9,
  /** Gives up after this many bites (or when hurt below 40%). */
  maxBites: 3,
  meat: 3,
  radius: 0.7,
  /** Only hunts when darkness is at least this. */
  minDark: 0.65,
};

/** The cheeky monkey of Fern Gully: never attacks, runs away, giggles. 2 bonks to catch. */
export const MONKEY = {
  hp: HITS_TO_KILL,
  speed: 1.8,
  run: 4.6,
  fleeRange: 11,
  meat: 0,
  radius: 0.45,
  /** Zone it lives in and how long before a new one shows up after being caught. */
  zone: 1,
  respawn: 15,
};

export const ANIMALS = {
  boarMax: 3,
  boarSpawnEvery: 18,
  boarSpawnDist: [20, 38] as [number, number],
  jaguarMax: 2,
  jaguarSpawnEvery: 14,
  jaguarSpawnDist: [18, 28] as [number, number],
  /** Despawn when every player is farther than this. */
  despawnDist: 75,
  /** Never spawn closer than this to a player. */
  minSpawnGap: 14,
  /** Host snapshot rate (per second) and remote smoothing (1/s). */
  netHz: 10,
  smoothing: 10,
  corpseSeconds: 4,
  hitFlash: 0.25,
  /** Pool sizes (instances per species). */
  pool: 4,
  /** A monkey appears when a player is this close to its zone. */
  monkeyRange: 45,
};

/** Animal states (sent over the network as numbers). */
export const AS = { Wander: 0, Charge: 1, Flee: 2, Stalk: 3, Retreat: 4, Dead: 5 } as const;
export type AS = (typeof AS)[keyof typeof AS];
