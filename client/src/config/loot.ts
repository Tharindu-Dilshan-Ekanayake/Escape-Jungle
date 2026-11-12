/** Firewood and treasures hidden under the plants (revealed when the cell is cut). */
export const WOOD = {
  perZone: 7,
  /** Logs lying in Camp 1's clearing (visible from the start). */
  inCamp: [
    [-4.2, -0.8],
    [4.6, 4.8],
    [-3.4, 8.0],
    [-3.0, -3.4],
  ] as [number, number][],
  pickupRadius: 1.5,
  seed: 4242,
};

export interface TreasureKind {
  id: string;
  name: string;
  icon: string;
  /** Base cash value (scaled up in later zones). */
  value: number;
  /** Relative chance; later zones favour the rarer items. */
  weight: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
}

export const TREASURES: TreasureKind[] = [
  { id: "coin", name: "Ancient Coin", icon: "🪙", value: 0.6, weight: 10, rarity: "Common" },
  { id: "shell", name: "Pearl Shell", icon: "🐚", value: 0.8, weight: 9, rarity: "Common" },
  { id: "beetle", name: "Amber Beetle", icon: "🪲", value: 1.2, weight: 7, rarity: "Common" },
  { id: "compass", name: "Lost Compass", icon: "🧭", value: 1.8, weight: 5, rarity: "Rare" },
  { id: "frog", name: "Jade Frog", icon: "🐸", value: 2.5, weight: 4, rarity: "Rare" },
  { id: "orchid", name: "Crystal Orchid", icon: "🌸", value: 3.2, weight: 3, rarity: "Epic" },
  { id: "skull", name: "Ruby Skull", icon: "💀", value: 4.5, weight: 2, rarity: "Epic" },
  { id: "idol", name: "Golden Idol", icon: "🗿", value: 7, weight: 1, rarity: "Legendary" },
];

export const RARITY_COLOR: Record<TreasureKind["rarity"], string> = {
  Common: "#cfd8dc",
  Rare: "#4fc3f7",
  Epic: "#c77dff",
  Legendary: "#ffd23f",
};

export const TREASURE = {
  perZone: 4,
  /** Value multiplier per zone index (zone i: 1 + i * this). */
  zoneValueStep: 0.35,
  /** Rarer kinds get this much extra weight per zone index (weight * (1 + rank * i * this)). */
  zoneRarityBoost: 0.25,
  pickupRadius: 1.4,
  /** Revealed items float + spin. */
  bob: 0.12,
  spin: 1.6,
  hover: 0.45,
  scale: 1.6,
  /** Light beam over revealed, uncollected items. */
  beamHeight: 6,
  beamRadius: 0.32,
  popupSeconds: 3.2,
  seed: 777,
};
