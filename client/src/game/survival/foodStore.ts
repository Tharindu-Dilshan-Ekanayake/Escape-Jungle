import { RUN_RULES, type FoodItem } from "@shared";
import { runHandlers, runNet, sendStore } from "../../net/runNet";
import { addFood, bumpSurvival, note, pouchFull, survival } from "./survival";

/**
 * The party's shared Food Store (one stock, reachable from every camp's store
 * hut). Online runs: the server owns the counts; offline: local.
 */
export const foodStore = {
  counts: { cookedMeat: 0, banana: 0, berries: 0, rawMeat: 0 } as Record<FoodItem, number>,
  version: 0,
};

// Dev only: automated checks read the store (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __foodStore: foodStore });

export const storeTotal = () => Object.values(foodStore.counts).reduce((a, b) => a + b, 0);

export function resetFoodStore() {
  foodStore.counts = { cookedMeat: 0, banana: 0, berries: 0, rawMeat: 0 };
  foodStore.version++;
}

/** Move one item from my pouch into the store. */
export function storePut(item: FoodItem) {
  if (survival.pouch[item] <= 0) return;
  if (!runNet.online && storeTotal() >= RUN_RULES.storeCapacity) {
    note("The Food Store is full");
    return;
  }
  survival.pouch[item]--;
  bumpSurvival();
  if (runNet.online) sendStore("put", item);
  else {
    foodStore.counts[item]++;
    foodStore.version++;
  }
}

/** Take one item from the store into my pouch. */
export function storeTake(item: FoodItem) {
  if (foodStore.counts[item] <= 0) return;
  if (pouchFull()) {
    note("Food pouch full!");
    return;
  }
  if (runNet.online) sendStore("take", item);
  else {
    foodStore.counts[item]--;
    foodStore.version++;
    addFood(item, 1);
  }
}

/** Wire the server messages (call while the jungle stage is mounted). */
export function bindFoodStore() {
  runHandlers.storeState = (counts) => {
    foodStore.counts = { cookedMeat: 0, banana: 0, berries: 0, rawMeat: 0, ...counts };
    foodStore.version++;
  };
  runHandlers.storeGive = (item) => {
    addFood(item, 1);
  };
  return () => {
    runHandlers.storeState = runHandlers.storeGive = null;
  };
}
