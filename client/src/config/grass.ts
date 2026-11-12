import { BALANCE } from "./balance";
import { PALETTE } from "./palette";

/** Grass grid (CLAUDE.md 5.1). Cells are 0.5 m; chunks are 16 m = 32 x 32 cells. */
export const CELL_SIZE = 0.5;
export const CHUNK_CELLS = 32;

/** How a plant cell is drawn (see grass/plantGeometry.ts). */
export type PlantShape = "grass" | "fern" | "reeds" | "bamboo" | "banana" | "flowerBush";

export interface PlantType {
  id: number;
  key: keyof typeof BALANCE.grass;
  name: string;
  shape: PlantShape;
  hp: number;
  /** Blades added to the bag when the cell is destroyed. */
  blades: number;
  /** Cash per blade at the grinder. */
  cashValue: number;
  minToolTier: number;
  gemChance: number;
  heightMin: number;
  heightMax: number;
  /** Per-instance tint choices (multiplied with the shape's vertex colours). */
  tints: readonly string[];
}

function plant(id: number, key: keyof typeof BALANCE.grass, name: string, shape: PlantShape, height: [number, number], tints: string[]): PlantType {
  const b = BALANCE.grass[key];
  return { id, key, name, shape, hp: b.hp, blades: b.blades, cashValue: b.value, minToolTier: b.tier, gemChance: 0, heightMin: height[0], heightMax: height[1], tints };
}

/** id 0 = empty cell. One plant type per zone (see config/zones1.ts). */
export const PLANT_TYPES: Record<number, PlantType> = {
  1: plant(1, "tallGrass", "Tall Grass", "grass", [1.6, 2.2], [PALETTE.grassLime, PALETTE.grassYellow, PALETTE.grassGreen, "#b4ec3a", "#8fd62a", "#d4f25a"]),
  2: plant(2, "fern", "Fern", "fern", [1.1, 1.6], ["#3f9a3a", "#57b347", "#2f7f35", "#6cc04f", "#4a8f2f"]),
  3: plant(3, "reeds", "Reeds", "reeds", [1.8, 2.4], ["#9fbf5a", "#b7cf6a", "#8aad4a", "#c9d97a", "#7fa042"]),
  4: plant(4, "bamboo", "Bamboo", "bamboo", [2.6, 3.4], ["#a6d84a", "#c2e65a", "#8fc63c", "#d8ee70", "#9ccf48"]),
  5: plant(5, "banana", "Banana Plant", "banana", [1.8, 2.5], ["#5fbf4a", "#78cf55", "#4aa83f", "#8fdc5f", "#3f9a3a"]),
  6: plant(6, "flowerBush", "Flower Bush", "flowerBush", [1.0, 1.4], ["#ffffff", "#ffe9f4", "#fff4d6"]),
};

export const GRASS_RENDER = {
  /** Blades per clump at grassDensity 1 (scaled by the preset, min 2). */
  bladesNear: 6,
  bladeWidth: [0.16, 0.27] as [number, number],
  /** Max tip lean (fraction of height). */
  lean: 0.28,
  /** Blade bases are scattered within +- this (m) of the cell centre. */
  spread: 0.2,
  baseColor: "#2f7418",
  /** Cut cells keep their blades at this fraction of height = stubble. */
  stubbleRatio: 0.13,
  cutAnimTime: 0.12,
  wind: 0.07,
  windSpeed: 1.7,
};

export const GRASS_RULES = {
  /** Alive grass blocks the player (you cut a path). */
  blocksMovement: true,
  /** Half-size of the blocking box per alive cell (m). */
  collisionHalf: 0.22,
};

export const CUTTING = {
  /** Delay from swing start to the hit (matches the slash in the animation). */
  hitDelay: 0.12,
  /** Cells this close are cut regardless of the arc angle (m). */
  closeRadius: 0.7,
  /** Don't flash the "need better tool" hint for longer than this (s). */
  hintSeconds: 2,
};

export const LEAF_PARTICLES = {
  life: 0.9,
  size: 0.2,
  perCell: 1,
  maxPerSwing: 28,
  gravity: 7,
  upSpeed: [1.8, 3.6] as [number, number],
  outSpeed: 1.8,
  spin: 9,
};
