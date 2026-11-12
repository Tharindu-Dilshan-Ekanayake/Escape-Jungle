import { BALANCE } from "../../config/balance";
import { STUD_TO_M } from "../../config/player";
import type { UpgradeKey } from "../../config/economy";

export type ToolKey = keyof typeof BALANCE.tools;
const U = BALANCE.upgrades;

/**
 * Per-run economy (bag, cash, tool, upgrade levels). Mutable because cutting
 * and selling happen inside useFrame; the HUD polls `version` and re-renders
 * only when it changed. Local-only until Phase 9 makes it server-authoritative.
 */
export const economy = {
  cash: 0,
  /** Blades in the bag and their total cash value. */
  bag: 0,
  bagValue: 0,
  tool: BALANCE.startTool as ToolKey,
  /** What the tool shop you are standing at sells (null = not at a shop). */
  shopTool: null as ToolKey | null,
  levels: { backpack: 0, sharpness: 0, swing: 0, legs: 0 } as Record<UpgradeKey, number>,
  /** Last grinder sale (for the "+$" popup). */
  lastSale: { amount: 0, at: 0 },
  /** Mutable proximity flags written by the station system. */
  nearShop: false,
  /** Bumped on every change; UI compares it to decide whether to re-render. */
  version: 0,
};

// Dev only: automated checks read the economy (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __economy: economy });

const bump = () => {
  economy.version++;
};

export function resetEconomy() {
  economy.cash = 0;
  economy.bag = 0;
  economy.bagValue = 0;
  economy.tool = BALANCE.startTool as ToolKey;
  economy.levels = { backpack: 0, sharpness: 0, swing: 0, legs: 0 };
  economy.lastSale = { amount: 0, at: 0 };
  economy.nearShop = false;
  economy.shopTool = null;
  bump();
}

export const tool = () => BALANCE.tools[economy.tool];
export const bagCapacity = () => BALANCE.bag.levels[Math.min(economy.levels.backpack, BALANCE.bag.levels.length - 1)];
export const isBagFull = () => economy.bag >= bagCapacity();
export const swingMultiplier = () => 1 + U.swing.stepMult * economy.levels.swing;
export const sharpness = () => economy.levels.sharpness;
/** Walk speed in m/s for a Legs level. */
export const walkSpeedFor = (level: number) => (U.legs.baseSpeed + U.legs.step * level) * STUD_TO_M;

/** Add cut blades (clamped to capacity). Returns how many fit. */
export function addToBag(blades: number, valuePerBlade: number): number {
  const fit = Math.max(0, Math.min(blades, bagCapacity() - economy.bag));
  if (fit <= 0) return 0;
  economy.bag += fit;
  economy.bagValue += fit * valuePerBlade;
  bump();
  return fit;
}

/** Grinder: turn the whole bag into cash. Returns the cash gained. */
export function sellBag(now: number): number {
  if (economy.bag <= 0) return 0;
  const amount = Math.round(economy.bagValue * 100) / 100;
  economy.cash = Math.round((economy.cash + amount) * 100) / 100;
  economy.bag = 0;
  economy.bagValue = 0;
  economy.lastSale = { amount, at: now };
  bump();
  return amount;
}

export function upgradePrice(key: UpgradeKey): number | null {
  const lvl = economy.levels[key];
  if (lvl >= U.maxLevel) return null;
  const def = U[key];
  return Math.round(def.base * Math.pow(def.growth, lvl) * 100) / 100;
}

export function buyUpgrade(key: UpgradeKey): boolean {
  const price = upgradePrice(key);
  if (price === null || economy.cash < price) return false;
  economy.cash = Math.round((economy.cash - price) * 100) / 100;
  economy.levels[key]++;
  bump();
  return true;
}

/** Upgrades the player can afford right now (badge on the UPGRADES button). */
export function affordableCount(): number {
  let n = 0;
  for (const k of Object.keys(economy.levels) as UpgradeKey[]) {
    const p = upgradePrice(k);
    if (p !== null && economy.cash >= p) n++;
  }
  return n;
}

/** The tool the shop you stand at sells, if it beats the one you have (else null). */
export function nextTool(): ToolKey | null {
  const t = economy.shopTool;
  if (!t) return null;
  return BALANCE.tools[t].tier > BALANCE.tools[economy.tool].tier ? t : null;
}

export function buyNextTool(): boolean {
  const next = nextTool();
  if (!next) return false;
  const price = BALANCE.tools[next].price;
  if (economy.cash < price) return false;
  economy.cash = Math.round((economy.cash - price) * 100) / 100;
  economy.tool = next;
  bump();
  return true;
}

/** Direct cash reward (treasures, campfires). */
export function addCash(amount: number) {
  economy.cash += amount;
  bump();
}

export const formatCash = (v: number) => `$${v.toFixed(2)}`;
