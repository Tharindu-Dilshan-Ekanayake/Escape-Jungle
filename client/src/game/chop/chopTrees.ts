import { RUN_RULES, type RunSyncPayload, type TreeState } from "@shared";
import { FIREWOOD } from "../../config/firewood";
import { CAMPFIRE } from "../../config/night";
import { runHandlers, runNet, sendChop, sendTakeLog } from "../../net/runNet";
import { loot } from "../loot/loot";
import { sfx } from "../audio/sfx";
import { note } from "../survival/survival";

/**
 * Firewood trees (shared in online runs): everyone's hits add up on the
 * server; at 0 hp the tree falls into a log pile anyone can take from, and it
 * grows back later. Offline runs apply the same rules locally. Mutable state
 * only (the renderer polls it in useFrame).
 */
export interface ChopTree {
  x: number;
  z: number;
  hp: number;
  pile: number;
  /** performance.now()/1000 when it stands again (0 = standing). */
  regrowAt: number;
  /** Last hit / fell time (animation). */
  hitAt: number;
  fellAt: number;
}

export const chop = { trees: [] as ChopTree[], version: 0 };
// Dev only: automated checks read the trees (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __chop: chop });

const now = () => performance.now() / 1000;

export function resetChop() {
  chop.trees = FIREWOOD.spots.map(([x, z]) => ({ x, z, hp: RUN_RULES.treeHp, pile: 0, regrowAt: 0, hitAt: -9, fellAt: -9 }));
  chop.version++;
}

/** Standing again once its regrow time has passed. */
export function standing(t: ChopTree) {
  if (t.hp <= 0 && t.regrowAt > 0 && now() >= t.regrowAt) {
    t.hp = RUN_RULES.treeHp;
    t.regrowAt = 0;
    chop.version++;
  }
  return t.hp > 0;
}

function apply(m: TreeState) {
  const t = chop.trees[m.t];
  if (!t) return;
  const wasUp = t.hp > 0;
  if (m.hp < t.hp || m.took) t.hitAt = now();
  t.hp = m.hp;
  t.pile = m.pile;
  t.regrowAt = m.hp > 0 ? 0 : now() + m.regrow;
  if (wasUp && m.hp <= 0) {
    t.fellAt = now();
    sfx.thud();
    note("🌳 Timber! A pile of firewood is ready, take it to the fire.");
  }
  if (m.took && m.by === runNet.me) {
    loot.carried = Math.min(CAMPFIRE.carryMax, loot.carried + 1);
    loot.lastWood = now();
    loot.version++;
    sfx.woodPick();
  }
  chop.version++;
}

/** Swing hit on tree i (damage grows with the tool tier). */
export function chopTree(i: number, dmg: number) {
  const t = chop.trees[i];
  if (!t || !standing(t)) return;
  sfx.thud();
  t.hitAt = now();
  if (runNet.online) {
    sendChop(i, dmg);
    return;
  }
  const hp = Math.max(0, t.hp - dmg);
  apply({ t: i, hp, pile: t.pile + (hp === 0 ? RUN_RULES.treeLogs : 0), regrow: hp === 0 ? RUN_RULES.treeRegrowSeconds : 0, by: runNet.me });
}

export function takeLog(i: number) {
  const t = chop.trees[i];
  if (!t || t.pile <= 0 || loot.carried >= CAMPFIRE.carryMax) return;
  if (runNet.online) {
    sendTakeLog(i);
    return;
  }
  apply({ t: i, hp: t.hp, pile: t.pile - 1, regrow: Math.max(0, t.regrowAt - now()), by: runNet.me, took: true });
}

/** Nearest standing tree whose trunk is within `reach` of (x, z) and inside the swing arc. */
export function treeInSwing(x: number, z: number, dirX: number, dirZ: number, reach: number, cosHalf: number): number {
  let best = -1;
  let bestD = Infinity;
  chop.trees.forEach((t, i) => {
    if (!standing(t)) return;
    const dx = t.x - x;
    const dz = t.z - z;
    const d = Math.hypot(dx, dz);
    if (d > reach + FIREWOOD.trunkR || d >= bestD) return;
    if (d > 0.8 && (dx * dirX + dz * dirZ) / d < cosHalf) return;
    best = i;
    bestD = d;
  });
  return best;
}

export function bindChop() {
  resetChop();
  runHandlers.tree = apply;
  return () => {
    runHandlers.tree = null;
  };
}

/** Full state for (re)joining clients. */
export function applyChopSync(p: RunSyncPayload) {
  for (const m of p.trees ?? []) apply(m);
}
