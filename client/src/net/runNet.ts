import type { Room } from "colyseus.js";
import { RUN_MSG, RUN_RULES, type FoodItem, type GiftPayload, type GivePayload, type RunSyncPayload, type TreeState } from "@shared";

/**
 * Client side of the jungle-run sync (server: server/src/rooms/RunSystem.ts).
 * Systems register handlers; everything here is plain mutable state (no React).
 * Offline / solo runs: `online` is false, every send is a no-op and the local
 * client is the authority (host) for everything.
 */
export const runNet = {
  online: false,
  me: "",
  hostSid: "",
  room: null as Room | null,
  /** performance.now() (ms) when the run started: the shared day/night clock. */
  startedAt: performance.now(),
  /** Increments every swing (remote avatars play the swing). */
  swingCount: 0,
  /** Next position update is a respawn teleport. */
  teleport: false,
};

// Dev only: automated checks read the run sync state (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __runNet: runNet });

/** True when this client simulates the animals (solo runs: always). */
export const isRunHost = () => !runNet.online || runNet.hostSid === runNet.me;

type Fn<A extends unknown[]> = ((...a: A) => void) | null;

/** Set by the game systems while the jungle stage is mounted. */
export const runHandlers = {
  cleared: null as Fn<[number, number[]]>,
  picked: null as Fn<[number, string]>,
  pickDenied: null as Fn<[number]>,
  fire: null as Fn<[number, number]>,
  storeState: null as Fn<[Partial<Record<FoodItem, number>>]>,
  storeGive: null as Fn<[FoodItem]>,
  animals: null as Fn<[number[]]>,
  hit: null as Fn<[number, number, string]>,
  bite: null as Fn<[number]>,
  meat: null as Fn<[number]>,
  prize: null as Fn<[]>,
  gift: null as Fn<[GiftPayload]>,
  tree: null as Fn<[TreeState]>,
};

const syncListeners = new Set<(p: RunSyncPayload) => void>();

/** Listen for the full run state (sent after hello). Returns unsubscribe. */
export function onRunSync(fn: (p: RunSyncPayload) => void) {
  syncListeners.add(fn);
  return () => {
    syncListeners.delete(fn);
  };
}

/** Register the run message listeners on a (re)joined room. */
export function bindRunRoom(room: Room) {
  runNet.room = room;
  runNet.me = room.sessionId;
  room.onMessage(RUN_MSG.sync, (p: RunSyncPayload) => {
    runNet.startedAt = performance.now() - p.elapsed;
    runNet.hostSid = p.host;
    for (const fn of syncListeners) fn(p);
  });
  room.onMessage(RUN_MSG.cleared, (m: { z: number; c: number[] }) => runHandlers.cleared?.(m.z, m.c));
  room.onMessage(RUN_MSG.picked, (m: { i: number; sid: string }) => runHandlers.picked?.(m.i, m.sid));
  room.onMessage(RUN_MSG.pickDenied, (m: { i: number }) => runHandlers.pickDenied?.(m.i));
  room.onMessage(RUN_MSG.fire, (m: { f: number; left: number }) => runHandlers.fire?.(m.f, m.left));
  room.onMessage(RUN_MSG.storeState, (m: { counts: Partial<Record<FoodItem, number>> }) => runHandlers.storeState?.(m.counts));
  room.onMessage(RUN_MSG.storeGive, (m: { item: FoodItem }) => runHandlers.storeGive?.(m.item));
  room.onMessage(RUN_MSG.animals, (m: number[]) => runHandlers.animals?.(m));
  room.onMessage(RUN_MSG.hit, (m: { id: number; dmg: number; sid: string }) => runHandlers.hit?.(m.id, m.dmg, m.sid));
  room.onMessage(RUN_MSG.bite, (m: { dmg: number }) => runHandlers.bite?.(m.dmg));
  room.onMessage(RUN_MSG.meat, (m: { n: number }) => runHandlers.meat?.(m.n));
  room.onMessage(RUN_MSG.prize, () => runHandlers.prize?.());
  room.onMessage(RUN_MSG.give, (m: GiftPayload) => runHandlers.gift?.(m));
  room.onMessage(RUN_MSG.tree, (m: TreeState) => runHandlers.tree?.(m));
  room.onMessage(RUN_MSG.host, (m: { sid: string }) => {
    runNet.hostSid = m.sid;
  });
}

export function unbindRunRoom(room: Room) {
  if (runNet.room === room) runNet.room = null;
}

/** The jungle stage mounted: online runs ask the server for the full state. */
export function beginRun(online: boolean) {
  runNet.online = online && !!runNet.room;
  runNet.hostSid = runNet.online ? "" : runNet.me;
  runNet.startedAt = performance.now();
  runNet.swingCount = 0;
  outCuts.clear();
  if (runNet.online) runNet.room?.send(RUN_MSG.hello);
}

export function endRun() {
  runNet.online = false;
  outCuts.clear();
}

/** Seconds since the run started (shared clock). */
export const runElapsed = () => (performance.now() - runNet.startedAt) / 1000;

// --- Outgoing ---------------------------------------------------------------

const outCuts = new Map<number, number[]>();

/** Queue a cell I cut (flushed RUN_RULES.cutHz times per second). */
export function queueCut(zone: number, cell: number) {
  if (!runNet.online) return;
  let list = outCuts.get(zone);
  if (!list) outCuts.set(zone, (list = []));
  list.push(cell);
}

function flushCuts() {
  if (!runNet.online || !runNet.room || !outCuts.size) return;
  for (const [z, list] of outCuts) {
    // Respect the per-message cap; leftovers go out on the next flush.
    const c = list.splice(0, RUN_RULES.maxCellsPerCut);
    runNet.room.send(RUN_MSG.cut, { z, c });
    if (!list.length) outCuts.delete(z);
    break; // one batch per tick keeps under the server's rate limit
  }
}
window.setInterval(flushCuts, 1000 / (RUN_RULES.cutHz - 2));

const send = (type: string, msg?: unknown) => {
  if (runNet.online) runNet.room?.send(type, msg);
};
export const sendPickup = (i: number) => send(RUN_MSG.pickup, { i });
export const sendFuel = (f: number) => send(RUN_MSG.fuel, { f });
export const sendStore = (op: "put" | "take", item: FoodItem) => send(RUN_MSG.store, { op, item });
export const sendAnimals = (packed: number[]) => send(RUN_MSG.animals, packed);
export const sendHit = (id: number, dmg: number) => send(RUN_MSG.hit, { id, dmg });
export const sendBite = (sid: string, dmg: number) => send(RUN_MSG.bite, { sid, dmg });
export const sendMeat = (sid: string, n: number) => send(RUN_MSG.meat, { sid, n });
export const sendPrize = (sid: string) => send(RUN_MSG.prize, { sid });
export const sendGive = (g: GivePayload) => send(RUN_MSG.give, g);
export const sendChop = (t: number, dmg: number) => send(RUN_MSG.chop, { t, dmg });
export const sendTakeLog = (t: number) => send(RUN_MSG.takeLog, { t });
