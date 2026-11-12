/** All balance numbers (CLAUDE.md section 6). Never hardcode these elsewhere. */
export const BALANCE = {
  grass: {
    tallGrass: { hp: 1, blades: 1, value: 0.014, tier: 1 },
    fern: { hp: 1, blades: 1, value: 0.02, tier: 1 },
    reeds: { hp: 2, blades: 1, value: 0.03, tier: 1 },
    bamboo: { hp: 3, blades: 2, value: 0.035, tier: 2 },
    banana: { hp: 3, blades: 2, value: 0.045, tier: 2 },
    flowerBush: { hp: 4, blades: 3, value: 0.05, tier: 2 },
  },
  bag: {
    levels: [150, 225, 300, 400, 475, 600, 750, 900, 1100, 1300],
  },
  /** Upgrade price for level n = base * growth^n; 10 levels each. */
  upgrades: {
    maxLevel: 10,
    /** Bag capacity = bag.levels[level]. */
    backpack: { base: 3, growth: 1.6 },
    /** +1 damage and +1 bonus blade per swing per level. */
    sharpness: { base: 4, growth: 1.7 },
    /** Swing speed multiplier = 1 + level * stepMult. */
    swing: { base: 5, growth: 1.7, stepMult: 0.1 },
    /** Walk speed in studs/s: baseSpeed + level * step. */
    legs: { base: 3, growth: 1.5, baseSpeed: 19, step: 1.5 },
  },
  /**
   * Cutting tools (in purchase order). range in m, arcDeg = forward cutting
   * arc, swingInterval in s (divided by the Swing Speed multiplier).
   * Damage per swing = damage + sharpness level.
   */
  tools: {
    // Every tool has its own shape (world/props/toolShapes.ts); the last one is a motor machine.
    sickle: { name: "Rusty Sickle", price: 0, tier: 1, damage: 1, range: 2.4, arcDeg: 110, swingInterval: 0.5 },
    machete: { name: "Machete", price: 3, tier: 2, damage: 2, range: 2.8, arcDeg: 120, swingInterval: 0.45 },
    shears: { name: "Garden Shears", price: 10, tier: 3, damage: 3, range: 3.0, arcDeg: 125, swingInterval: 0.43 },
    scythe: { name: "Jade Scythe", price: 25, tier: 4, damage: 4, range: 3.2, arcDeg: 130, swingInterval: 0.41 },
    axe: { name: "Golden Axe", price: 55, tier: 5, damage: 6, range: 3.4, arcDeg: 138, swingInterval: 0.39 },
    glaive: { name: "Crystal Glaive", price: 110, tier: 6, damage: 8, range: 3.6, arcDeg: 145, swingInterval: 0.37 },
    grassCutter: { name: "Grass Cutter", price: 200, tier: 7, damage: 11, range: 3.9, arcDeg: 150, swingInterval: 0.35, motor: true },
  },
  /** The tool each base sells: [crash site, outpost 1, outpost 2, ...]. Every base sells a better one. */
  shopTools: ["machete", "shears", "scythe", "axe", "glaive", "grassCutter"],
  startTool: "sickle",
  gates: {
    camp2: 15,
  },
  objectives: [
    { text: "Grind grass 0 of 150", reward: 1 },
    { text: "Buy a Machete", reward: 1 },
    { text: "Press TAB to upgrade your Backpack", reward: 1.5 },
    { text: "Buy a Weed Bomb", reward: 5 },
    { text: "Find a secret stash", reward: 2 },
  ],
} as const;
