import { SHARE_LIMITS, type FoodItem, type GiftPayload } from "@shared";
import { CAMPFIRE } from "../../config/night";
import { FOODS } from "../../config/survival";
import { runHandlers, runNet, sendGive } from "../../net/runNet";
import { remotePlayers } from "../../net/remotePlayers";
import { player } from "../player/FirstPersonController";
import { addCash, economy, formatCash } from "../economy/economy";
import { loot } from "../loot/loot";
import { sfx } from "../audio/sfx";
import { addFood, bumpSurvival, note, survival } from "./survival";

/**
 * Sharing with party members: hand over food, firewood or cash to any
 * teammate in the run (near or far; the TEAM button / T, or E next to them). The sender pays first; the receiver keeps what fits
 * and the rest comes straight back.
 */
export const SHARE_RADIUS = 3.2;

export const share = { target: { sid: "", name: "" }, version: 0 };

/** Nearest party member within SHARE_RADIUS (online runs only), or null. */
export function nearestTeammate(): { sid: string; name: string } | null {
  if (!runNet.online) return null;
  let best: { sid: string; name: string } | null = null;
  let bestD = SHARE_RADIUS;
  for (const r of remotePlayers.values()) {
    if (!r.here) continue;
    const d = Math.hypot(r.x - player.x, r.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = { sid: r.id, name: r.name };
    }
  }
  return best;
}

/** Everyone else in this run (any distance). */
export function teammates(): { sid: string; name: string }[] {
  if (!runNet.online) return [];
  const list: { sid: string; name: string }[] = [];
  for (const r of remotePlayers.values()) if (r.here) list.push({ sid: r.id, name: r.name });
  return list;
}

/** Open the team panel: keeps the current pick if they are still here, else the nearest / first teammate. */
export function pickShareTarget(): boolean {
  const all = teammates();
  if (all.some((t) => t.sid === share.target.sid)) return true;
  const t = nearestTeammate() ?? all[0];
  if (!t) return false;
  setShareTarget(t.sid, t.name);
  return true;
}

export function setShareTarget(sid: string, name: string) {
  share.target = { sid, name };
  share.version++;
}

export function giveFood(item: FoodItem) {
  const to = share.target.sid;
  if (!to || survival.pouch[item] <= 0) return;
  survival.pouch[item]--;
  bumpSurvival();
  sendGive({ to, kind: "food", item, n: 1 });
  sfx.equip();
}

export function giveWood() {
  const to = share.target.sid;
  if (!to || loot.carried <= 0) return;
  loot.carried--;
  loot.version++;
  sendGive({ to, kind: "wood", n: 1 });
  sfx.woodDrop();
}

export function giveCash(amount: number) {
  const to = share.target.sid;
  const n = Math.min(amount, economy.cash, SHARE_LIMITS.cash);
  if (!to || n < 0.01) return;
  economy.cash -= n;
  economy.version++;
  sendGive({ to, kind: "cash", n });
  sfx.sell();
}

/** Receive a gift; anything that doesn't fit goes back to the sender. */
function receive(g: GiftPayload) {
  let kept = 0;
  if (g.kind === "cash") {
    addCash(g.n);
    kept = g.n;
    note(g.back ? `${formatCash(g.n)} came back` : `🎁 ${g.name} gave you ${formatCash(g.n)}`);
  } else if (g.kind === "wood") {
    kept = Math.max(0, Math.min(g.n, CAMPFIRE.carryMax - loot.carried));
    loot.carried += kept;
    loot.version++;
    if (kept) note(g.back ? "Firewood came back (their hands were full)" : `🎁 ${g.name} gave you ${kept} firewood`);
  } else if (g.item) {
    kept = addFood(g.item, g.n);
    if (kept) note(g.back ? `${FOODS[g.item].icon} came back (their pouch was full)` : `🎁 ${g.name} gave you ${kept} ${FOODS[g.item].icon}`);
  }
  sfx.pickupMeat();
  const left = g.n - kept;
  if (left > 0 && !g.back) sendGive({ to: g.from, kind: g.kind, item: g.item, n: left, back: true });
  share.version++;
}

export function bindShare() {
  runHandlers.gift = receive;
  return () => {
    runHandlers.gift = null;
  };
}

/** Cash buttons in the share panel. */
export const CASH_STEPS = [1, 5, 25, 100];
