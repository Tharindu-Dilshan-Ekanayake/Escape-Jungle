import type { FoodItem } from "@shared";
import { EAT_ORDER, FOODS, SURVIVAL } from "../../config/survival";
import { sfx } from "../audio/sfx";

/**
 * Per-player survival state (mutable; changed inside useFrame and by input
 * handlers; the HUD polls `version`).
 */
export const survival = {
  health: SURVIVAL.max,
  hunger: SURVIVAL.max,
  thirst: SURVIVAL.max,
  pouch: { cookedMeat: 0, banana: 0, berries: 0, rawMeat: 0 } as Record<FoodItem, number>,
  /** performance.now()/1000 of the last hit (red flash) and of passing out (0 = awake). */
  hurtAt: 0,
  faintAt: 0,
  /** Seconds of cooking progress on the current piece (-1 = not cooking). */
  cooking: -1,
  lastSip: 0,
  /** Short message for the HUD ("Pouch full", "Cook it first"...). */
  note: { text: "", at: 0 },
  version: 0,
};

// Dev only: automated checks read and set survival (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __survival: survival });

export const bumpSurvival = () => {
  survival.version++;
};

export function resetSurvival() {
  survival.health = survival.hunger = survival.thirst = SURVIVAL.max;
  survival.pouch = { cookedMeat: 0, banana: 0, berries: 0, rawMeat: 0 };
  survival.hurtAt = survival.faintAt = 0;
  survival.cooking = -1;
  survival.note = { text: "", at: 0 };
  bumpSurvival();
}

export function note(text: string) {
  survival.note = { text, at: performance.now() / 1000 };
  bumpSurvival();
}

const clamp = (v: number) => Math.max(0, Math.min(SURVIVAL.max, v));

export const pouchCount = () => Object.values(survival.pouch).reduce((a, b) => a + b, 0);
export const pouchFull = () => pouchCount() >= SURVIVAL.pouchCapacity;

/** Add items to the pouch (as many as fit). Returns how many fit. */
export function addFood(item: FoodItem, n = 1): number {
  const fit = Math.max(0, Math.min(n, SURVIVAL.pouchCapacity - pouchCount()));
  if (fit < n) note("Food pouch full! Store food at a Food Store");
  if (fit <= 0) return 0;
  survival.pouch[item] += fit;
  bumpSurvival();
  return fit;
}

/** Eat one item (or the best edible one). Returns true if something was eaten. */
export function eat(item?: FoodItem): boolean {
  const pick = item ?? EAT_ORDER.find((k) => survival.pouch[k] > 0);
  if (!pick || survival.pouch[pick] <= 0) {
    note(survival.pouch.rawMeat > 0 ? "Cook your raw meat at a campfire first" : "No food! Pick berries, bananas or hunt");
    return false;
  }
  const def = FOODS[pick];
  if (!def.edible) {
    note("Raw meat: cook it at a burning campfire first");
    return false;
  }
  survival.pouch[pick]--;
  survival.hunger = clamp(survival.hunger + def.food);
  survival.thirst = clamp(survival.thirst + def.water);
  sfx.eat();
  bumpSurvival();
  return true;
}

/** One sip at a water source (rate limited). */
export function drink(now: number): boolean {
  if (now - survival.lastSip < SURVIVAL.sipCooldown) return false;
  survival.lastSip = now;
  survival.thirst = clamp(survival.thirst + SURVIVAL.sip);
  sfx.drink();
  bumpSurvival();
  return true;
}

export function hurt(dmg: number) {
  if (survival.faintAt) return;
  survival.health = clamp(survival.health - dmg);
  survival.hurtAt = performance.now() / 1000;
  sfx.hurt();
  bumpSurvival();
}

/** Work speed multiplier from hunger and thirst (1 = normal, SURVIVAL.minWork at 0). */
export function workMultiplier(): number {
  const f = (v: number) => (v >= SURVIVAL.slowBelow ? 1 : SURVIVAL.minWork + (1 - SURVIVAL.minWork) * (v / SURVIVAL.slowBelow));
  return Math.min(f(survival.hunger), f(survival.thirst));
}

/** A swing costs a little food and water. */
export function swingCost() {
  survival.hunger = clamp(survival.hunger - SURVIVAL.hungerPerSwing);
  survival.thirst = clamp(survival.thirst - SURVIVAL.thirstPerSwing);
}
