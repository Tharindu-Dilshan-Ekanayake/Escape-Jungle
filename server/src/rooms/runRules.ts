import { RUN_RULES, SHARE_KINDS, SHARE_LIMITS, isFoodItem, type FoodItem, type GiftPayload, type ShareKind, type TreeState } from "../shared/index.js";
import type { Run } from "./RunSystem.js";

export interface QuestState {
  s: number;
  p: number;
  g: number;
}

/**
 * A crew quest update merged into the current state: states only move forward,
 * items add up; a restarted timed quest (r) is the one way back. Null = invalid.
 */
export function mergeQuest(cur: QuestState, msg: { i?: unknown; s?: unknown; p?: unknown; g?: unknown; r?: unknown }): { i: number; next: QuestState; reset: boolean } | null {
  const [i, s, p, g] = [msg?.i, msg?.s, msg?.p, msg?.g].map(Number);
  if (!Number.isInteger(i) || i < 0 || i >= RUN_RULES.maxAdventures || !Number.isInteger(s) || s < 0 || s > 3) return null;
  if (!Number.isInteger(p) || p < 0 || p > 9999 || !Number.isInteger(g) || g < 0 || g > 2 ** 20) return null;
  const reset = msg.r === true && s === 1 && cur.s === 1;
  const next = reset ? { s, p, g } : s >= cur.s ? { s, p: Math.max(p, s === cur.s ? cur.p : 0), g: g | cur.g } : cur;
  return { i, next, reset };
}

/** A gift between crew members (amounts bounded), or null when it isn't allowed. */
export function giftFrom(msg: { to?: unknown; kind?: unknown; item?: unknown; n?: unknown; back?: unknown }, from: string, name: string, members: Set<string>): GiftPayload | null {
  if (!members.has(from) || typeof msg?.to !== "string" || msg.to === from || !members.has(msg.to)) return null;
  if (!(SHARE_KINDS as readonly string[]).includes(String(msg.kind))) return null;
  const kind = msg.kind as ShareKind;
  const n = Number(msg.n);
  if (!Number.isFinite(n) || n <= 0 || n > SHARE_LIMITS[kind]) return null;
  if (kind === "food" && !isFoodItem(msg.item)) return null;
  const gift: GiftPayload = { from, name, kind, n: kind === "cash" ? Math.round(n * 100) / 100 : Math.floor(n), back: msg.back === true };
  if (kind === "food") gift.item = msg.item as FoodItem;
  return gift;
}

/** A firewood tree of a run, regrown if its time has come. */
export function tree(run: Run, t: number, now: number) {
  let tr = run.trees.get(t);
  if (!tr) run.trees.set(t, (tr = { hp: RUN_RULES.treeHp, pile: 0, regrowAt: 0 }));
  if (tr.hp <= 0 && now >= tr.regrowAt) tr.hp = RUN_RULES.treeHp;
  return tr;
}

export function treeState(run: Run, t: number, now: number): TreeState {
  const tr = tree(run, t, now);
  return { t, hp: tr.hp, pile: tr.pile, regrow: tr.hp > 0 ? 0 : Math.max(0, (tr.regrowAt - now) / 1000) };
}
