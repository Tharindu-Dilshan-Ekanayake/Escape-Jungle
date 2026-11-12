import type { Client } from "@colyseus/core";
import { RUN_MSG, RUN_RULES, isFoodItem, type FoodItem, type RunSyncPayload, type TreeState } from "../shared/index.js";
import { giftFrom, mergeQuest, tree, treeState } from "./runRules.js";

/** Server-side state of one party run (kept in memory, sent only to its members). */
export interface Run {
  id: string;
  chapter: number;
  startedAt: number;
  members: Set<string>;
  host: string;
  cleared: Map<number, Set<number>>;
  picked: Set<number>;
  /** Date.now() each fire burns until. */
  fires: number[];
  store: Map<FoodItem, number>;
  lastCut: Map<string, number>;
  trees: Map<number, { hp: number; pile: number; regrowAt: number }>;
  lastChop: Map<string, number>;
  /** Shared quests by index. */
  adv: Map<number, { s: number; p: number; g: number }>;
  /** Members aboard the rescue helicopter; it leaves once every member is in. */
  boarded: Set<string>;
  departed: boolean;
}

type Send = (sid: string, type: string, msg: unknown) => void;

/**
 * Shared jungle state per run: cut grass, taken loot, campfire fuel, the food
 * store and which member simulates the animals (the "host"). Clients predict
 * locally; the server validates, dedupes and relays to the other members.
 */
export class RunSystem {
  private runs = new Map<string, Run>();

  constructor(
    private send: Send,
    private nameOf: (sid: string) => string = () => "?",
  ) {}

  create(id: string, members: string[], chapter: number) {
    this.runs.set(id, {
      id,
      chapter,
      startedAt: Date.now(),
      members: new Set(members),
      host: members[0] ?? "",
      cleared: new Map(),
      picked: new Set(),
      // The crash-site fire (index 0) is already burning when the party lands.
      fires: new Array(RUN_RULES.fires).fill(0).map((_, i) => (i === 0 ? Date.now() + RUN_RULES.crashFireSeconds * 1000 : 0)),
      store: new Map(),
      lastCut: new Map(),
      trees: new Map(),
      lastChop: new Map(),
      adv: new Map(),
      boarded: new Set(),
      departed: false,
    });
  }

  /** The live state of a run (for saving and restoring it). */
  get(id: string): Run | undefined {
    return this.runs.get(id);
  }

  /** A member left the run (back to lobby or disconnected for good). */
  leave(id: string, sid: string) {
    const run = this.runs.get(id);
    if (!run) return;
    run.members.delete(sid);
    run.lastCut.delete(sid);
    run.lastChop.delete(sid);
    run.boarded.delete(sid);
    if (!run.members.size) {
      this.runs.delete(id);
      return;
    }
    if (run.host === sid) {
      run.host = run.members.values().next().value ?? "";
      this.toAll(run, RUN_MSG.host, { sid: run.host });
    }
    // The crew got smaller: maybe everyone left is already aboard.
    this.checkDepart(run);
  }

  /** A member dropped (may come back): a connected teammate takes over the animals meanwhile. */
  handOffHost(id: string, sid: string, connected: (sid: string) => boolean) {
    const run = this.runs.get(id);
    if (!run || run.host !== sid) return;
    const next = [...run.members].find((m) => m !== sid && connected(m));
    if (!next) return;
    run.host = next;
    this.toAll(run, RUN_MSG.host, { sid: next });
  }

  /** Boarding the helicopter: it leaves only when the whole crew (whoever is still in the run) is aboard. */
  board(id: string, client: Client) {
    const run = this.runs.get(id);
    if (!run || run.departed || !run.members.has(client.sessionId)) return;
    run.boarded.add(client.sessionId);
    this.checkDepart(run);
  }

  private checkDepart(run: Run) {
    if (run.departed || !run.boarded.size) return;
    const waiting = [...run.members].filter((m) => !run.boarded.has(m));
    if (!waiting.length) {
      run.departed = true;
      this.toAll(run, RUN_MSG.depart, {});
      return;
    }
    this.toAll(run, RUN_MSG.boarding, { n: run.boarded.size, total: run.members.size, waiting: waiting.map(this.nameOf) });
  }

  private toAll(run: Run, type: string, msg: unknown, except?: string) {
    for (const sid of run.members) if (sid !== except) this.send(sid, type, msg);
  }

  hello(id: string, client: Client) {
    const run = this.runs.get(id);
    if (!run || !run.members.has(client.sessionId)) return;
    const now = Date.now();
    const payload: RunSyncPayload = {
      elapsed: now - run.startedAt,
      cleared: [...run.cleared].map(([z, set]) => ({ z, c: [...set] })),
      picked: [...run.picked],
      fires: run.fires.map((t) => Math.max(0, (t - now) / 1000)),
      store: Object.fromEntries(run.store),
      host: run.host,
      trees: [...run.trees.keys()].map((t) => treeState(run, t, now)),
      adv: [...run.adv].map(([i, a]) => ({ i, ...a })),
    };
    client.send(RUN_MSG.sync, payload);
    if (run.boarded.size && !run.departed) {
      const waiting = [...run.members].filter((m) => !run.boarded.has(m));
      client.send(RUN_MSG.boarding, { n: run.boarded.size, total: run.members.size, waiting: waiting.map(this.nameOf) });
    }
  }

  cut(id: string, client: Client, msg: { z?: unknown; c?: unknown }) {
    const run = this.runs.get(id);
    const sid = client.sessionId;
    if (!run || !run.members.has(sid)) return;
    const now = Date.now();
    if (now - (run.lastCut.get(sid) ?? 0) < 1000 / (RUN_RULES.cutHz * 1.5)) return; // rate limit
    run.lastCut.set(sid, now);
    const z = Number(msg?.z);
    if (!Number.isInteger(z) || z < 0 || z >= RUN_RULES.maxZones || !Array.isArray(msg?.c)) return;
    let set = run.cleared.get(z);
    if (!set) run.cleared.set(z, (set = new Set()));
    const fresh: number[] = [];
    for (const v of msg.c.slice(0, RUN_RULES.maxCellsPerCut)) {
      const i = Number(v);
      if (!Number.isInteger(i) || i < 0 || i > RUN_RULES.maxCellIndex || set.has(i)) continue;
      set.add(i);
      fresh.push(i);
    }
    if (fresh.length) this.toAll(run, RUN_MSG.cleared, { z, c: fresh }, sid);
  }

  pickup(id: string, client: Client, msg: { i?: unknown }) {
    const run = this.runs.get(id);
    const sid = client.sessionId;
    if (!run || !run.members.has(sid)) return;
    const i = Number(msg?.i);
    if (!Number.isInteger(i) || i < 0 || i >= RUN_RULES.maxLootItems) return;
    if (run.picked.has(i)) {
      client.send(RUN_MSG.pickDenied, { i });
      return;
    }
    run.picked.add(i);
    this.toAll(run, RUN_MSG.picked, { i, sid }, sid);
  }


  /** Anyone's hits add up; the tree falls into a pile of logs everyone can take. */
  chop(id: string, client: Client, msg: { t?: unknown; dmg?: unknown }) {
    const run = this.runs.get(id);
    const sid = client.sessionId;
    if (!run || !run.members.has(sid)) return;
    const t = Number(msg?.t);
    if (!Number.isInteger(t) || t < 0 || t >= RUN_RULES.maxTrees) return;
    const now = Date.now();
    if (now - (run.lastChop.get(sid) ?? 0) < 1000 / RUN_RULES.chopHz) return;
    run.lastChop.set(sid, now);
    const tr = tree(run, t, now);
    if (tr.hp <= 0) return;
    const dmg = Math.min(RUN_RULES.maxChopDmg, Math.max(1, Math.round(Number(msg?.dmg) || 1)));
    tr.hp = Math.max(0, tr.hp - dmg);
    if (tr.hp === 0) {
      tr.pile += RUN_RULES.treeLogs;
      tr.regrowAt = now + RUN_RULES.treeRegrowSeconds * 1000;
    }
    this.toAll(run, RUN_MSG.tree, { ...treeState(run, t, now), by: sid });
  }

  takeLog(id: string, client: Client, msg: { t?: unknown }) {
    const run = this.runs.get(id);
    const sid = client.sessionId;
    if (!run || !run.members.has(sid)) return;
    const t = Number(msg?.t);
    if (!Number.isInteger(t) || t < 0 || t >= RUN_RULES.maxTrees) return;
    const now = Date.now();
    const tr = tree(run, t, now);
    if (tr.pile <= 0) return;
    tr.pile--;
    this.toAll(run, RUN_MSG.tree, { ...treeState(run, t, now), by: sid, took: true });
  }

  fuel(id: string, client: Client, msg: { f?: unknown }) {
    const run = this.runs.get(id);
    if (!run || !run.members.has(client.sessionId)) return;
    const f = Number(msg?.f);
    if (!Number.isInteger(f) || f < 0 || f >= run.fires.length) return;
    const now = Date.now();
    const until = Math.max(now, run.fires[f]) + RUN_RULES.logSeconds * 1000;
    run.fires[f] = Math.min(until, now + RUN_RULES.maxFireSeconds * 1000);
    this.toAll(run, RUN_MSG.fire, { f, left: (run.fires[f] - now) / 1000 });
  }

  store(id: string, client: Client, msg: { op?: unknown; item?: unknown }) {
    const run = this.runs.get(id);
    if (!run || !run.members.has(client.sessionId) || !isFoodItem(msg?.item)) return;
    const item = msg.item;
    const have = run.store.get(item) ?? 0;
    const total = [...run.store.values()].reduce((a, b) => a + b, 0);
    if (msg.op === "put") {
      if (total >= RUN_RULES.storeCapacity) {
        client.send(RUN_MSG.storeGive, { item }); // full: hand it back
        return;
      }
      run.store.set(item, have + 1);
    } else if (msg.op === "take") {
      if (have <= 0) return;
      run.store.set(item, have - 1);
      client.send(RUN_MSG.storeGive, { item });
    } else return;
    this.toAll(run, RUN_MSG.storeState, { counts: Object.fromEntries(run.store) });
  }

  /**
   * Shared quests: one crew member talking to a quest giver, finding an item or
   * handing in counts for everyone. States only move forward, items add up;
   * a restarted timed quest (r) is the one way back.
   */
  adv(id: string, client: Client, msg: { i?: unknown; s?: unknown; p?: unknown; g?: unknown; r?: unknown }, name: string) {
    const run = this.runs.get(id);
    if (!run || !run.members.has(client.sessionId)) return;
    const m = mergeQuest(run.adv.get(Number(msg?.i)) ?? { s: 0, p: 0, g: 0 }, msg);
    if (!m) return;
    run.adv.set(m.i, m.next);
    // Everyone (the sender too) gets the merged truth.
    this.toAll(run, RUN_MSG.adv, { i: m.i, ...m.next, r: m.reset, by: name });
  }


  /** Host -> everyone else: animal snapshot. */
  animals(id: string, client: Client, msg: unknown) {
    const run = this.runs.get(id);
    if (!run || run.host !== client.sessionId || !Array.isArray(msg) || msg.length > RUN_RULES.maxAnimalFloats) return;
    if (!msg.every((v) => typeof v === "number" && Number.isFinite(v))) return;
    this.toAll(run, RUN_MSG.animals, msg, client.sessionId);
  }

  /** Non-host hit an animal -> host applies it. */
  hit(id: string, client: Client, msg: { id?: unknown; dmg?: unknown }) {
    const run = this.runs.get(id);
    if (!run || !run.members.has(client.sessionId) || run.host === client.sessionId) return;
    const aid = Number(msg?.id);
    const dmg = Math.min(20, Math.max(0, Number(msg?.dmg)));
    if (!Number.isInteger(aid) || !Number.isFinite(dmg)) return;
    this.send(run.host, RUN_MSG.hit, { id: aid, dmg, sid: client.sessionId });
  }

  /** Player -> party member: food, firewood or cash (amounts bounded; both must be in this run). */
  give(id: string, client: Client, msg: { to?: unknown; kind?: unknown; item?: unknown; n?: unknown; back?: unknown }, name: string) {
    const run = this.runs.get(id);
    const gift = run ? giftFrom(msg, client.sessionId, name, run.members) : null;
    if (gift) this.send(msg.to as string, RUN_MSG.give, gift);
  }


  /** Host -> one player: bite damage or meat reward. */
  toPlayer(id: string, client: Client, type: typeof RUN_MSG.bite | typeof RUN_MSG.meat | typeof RUN_MSG.prize, msg: { sid?: unknown; dmg?: unknown; n?: unknown }) {
    const run = this.runs.get(id);
    if (!run || run.host !== client.sessionId || typeof msg?.sid !== "string" || !run.members.has(msg.sid)) return;
    if (type === RUN_MSG.prize) this.send(msg.sid, type, {});
    else if (type === RUN_MSG.bite) this.send(msg.sid, type, { dmg: Math.min(40, Math.max(0, Number(msg.dmg) || 0)) });
    else this.send(msg.sid, type, { n: Math.min(5, Math.max(0, Math.round(Number(msg.n) || 0))) });
  }
}
