import type { FoodItem } from "@shared";

/** Survival balance: health, hunger, thirst (all 0..100), food, water and cooking. */
export const SURVIVAL = {
  max: 100,
  /** Points lost per second (hunger/thirst) while in the jungle. */
  hungerPerSec: 100 / 360,
  thirstPerSec: 100 / 280,
  /** Extra cost of every machete swing. */
  hungerPerSwing: 0.12,
  thirstPerSwing: 0.08,
  /** Below this, work (cutting + walking) slows down; at 0 it is `minWork` speed. */
  slowBelow: 40,
  minWork: 0.45,
  /** Health lost per second while starving or dehydrated (stat at 0). */
  starveDamage: 1.5,
  /** Health regen per second when fed and watered (above `regenAbove`), x2 near a lit fire. */
  regen: 0.8,
  regenAbove: 50,
  /** Resting inside a base (crash site or an outpost) heals this fast (per second) while not starving. */
  baseRegen: 6,
  /** After passing out you wake up with these values. */
  respawn: { health: 60, hunger: 55, thirst: 55 },
  faintSeconds: 2.6,
  /** Warning banners below this. */
  warnBelow: 25,
  /** Food pouch capacity (items). */
  pouchCapacity: 8,
  /** Drinking at a water source: thirst per sip and sips per second. */
  sip: 35,
  sipCooldown: 0.6,
  /** Cooking one piece of meat at a lit fire. */
  cookSeconds: 3,
  cookRadius: 3.6,
  interactRadius: 2.6,
};

export interface FoodDef {
  name: string;
  icon: string;
  food: number;
  water: number;
  /** Raw meat must be cooked first. */
  edible: boolean;
}

export const FOODS: Record<FoodItem, FoodDef> = {
  cookedMeat: { name: "Cooked meat", icon: "🍖", food: 45, water: 0, edible: true },
  banana: { name: "Banana", icon: "🍌", food: 22, water: 6, edible: true },
  berries: { name: "Berries", icon: "🫐", food: 12, water: 5, edible: true },
  rawMeat: { name: "Raw meat", icon: "🥩", food: 0, water: 0, edible: false },
};

/** Order the eat key (F) tries foods in: most filling first. */
export const EAT_ORDER: FoodItem[] = ["cookedMeat", "banana", "berries"];
export const EAT_KEY = "KeyF";
export const INTERACT_KEY = "KeyE";

/** Food + water sources placed in the world. */
export const FORAGE = {
  /** Berry bushes per zone (+ a few around each camp); they regrow. */
  berryBushesPerZone: 5,
  berryBushesPerCamp: 2,
  berriesPerPick: 2,
  berryRegrow: 75,
  /** Banana palms in the banana grove carry a bunch (regrows). */
  bananaBunches: 6,
  bananasPerPick: 2,
  bananaRegrow: 90,
  seed: 5150,
};
