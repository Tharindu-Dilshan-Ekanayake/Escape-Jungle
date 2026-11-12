/** Base stations (grinder, tool rack) and economy feedback. Prices live in balance.ts. */
export const STATIONS = {
  /** Grinder intake zone: in front of the grinder (prop-local +Z), radius in m. */
  grinder: { localZ: 2.6, radius: 2.2, cooldownS: 0.6 },
  /** Tool rack: stand within this distance to get the buy prompt (m). */
  toolShopRadius: 3.4,
  /** Key that buys at a shop (never P: Boxity/CrazyGames pause menu). */
  buyKey: "KeyE",
};

/** Coin burst out of the grinder when selling. */
export const COINS = {
  pool: 40,
  perSale: 14,
  life: 1.1,
  upSpeed: [3, 5] as [number, number],
  outSpeed: 2.2,
  gravity: 12,
  size: 0.16,
};

/** Upgrade cards shown in the panel (display only; numbers come from balance.ts). */
export const UPGRADE_CARDS = [
  { key: "backpack", title: "Backpack", icon: "🎒", color: "from-[#7bdc4f] to-[#3f8f4f]" },
  { key: "sharpness", title: "Sharpness", icon: "🗡️", color: "from-[#58a8ff] to-[#2f6fd6]" },
  { key: "swing", title: "Swing Speed", icon: "⚡", color: "from-[#ffd23f] to-[#e09a12]" },
  { key: "legs", title: "Legs", icon: "👢", color: "from-[#c98a4a] to-[#8a5328]" },
] as const;

export type UpgradeKey = (typeof UPGRADE_CARDS)[number]["key"];
