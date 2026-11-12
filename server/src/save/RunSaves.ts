import { SAVE_RULES, type PlayerSave } from "../shared/index.js";
import { saveStore, type RunSaveDoc, type WorldSave } from "./store.js";

export interface SaveSlot {
  key: string;
  kind: "solo" | "team";
  /** Sorted save ids of exactly this crew. */
  members: string[];
}

interface Live extends SaveSlot {
  chapter: number;
  players: Record<string, PlayerSave>;
  dirty: boolean;
  finished: boolean;
}

/**
 * Keeps each running expedition's save up to date: players report their own
 * progress, the server adds the shared jungle, and the save is written every
 * few seconds, when someone leaves and when the server shuts down.
 */
export class RunSaves {
  private live = new Map<string, Live>();
  private lastMsg = new Map<string, number>();

  constructor(private worldOf: (runId: string) => WorldSave | null) {}

  /** The save slot of a crew, or null when someone in it cannot save (guest without a key, same player twice). */
  static slot(chapter: number, saveIds: (string | null | undefined)[]): SaveSlot | null {
    if (!saveIds.length || saveIds.some((id) => !id)) return null;
    const members = [...new Set(saveIds as string[])].sort();
    if (members.length !== saveIds.length) return null;
    const kind = members.length === 1 ? "solo" : "team";
    return { key: `${kind}|${members.join("|")}|c${chapter}`, kind, members };
  }

  /**
   * Load a crew's save. An account with no solo save yet may take over the solo
   * save of the Boxity guest this browser played as before signing in, once (docs/SDK.md).
   */
  async load(slot: SaveSlot, carriedFrom?: string[]): Promise<RunSaveDoc | null> {
    const store = saveStore();
    const doc = await store.get(slot.key);
    if (doc || slot.kind !== "solo" || !carriedFrom?.length) return doc;
    const me = slot.members[0];
    const from = carriedFrom[0];
    const guest = await store.get(slot.key.replace(`|${me}|`, `|${from}|`));
    if (!guest || guest.claimedBy) return null;
    await store.put({ ...guest, claimedBy: me });
    const players: Record<string, PlayerSave> = guest.players[from] ? { [me]: guest.players[from] } : {};
    const copy: RunSaveDoc = { _id: slot.key, kind: "solo", chapter: guest.chapter, members: [me], updatedAt: Date.now(), world: guest.world, players };
    await store.put(copy);
    console.log(`[saves] carried guest progress into ${me}`);
    return copy;
  }

  /** Start keeping a run's save (players: what the crew had last time). */
  attach(runId: string, slot: SaveSlot, chapter: number, players: Record<string, PlayerSave> = {}) {
    this.live.set(runId, { ...slot, chapter, players: { ...players }, dirty: true, finished: false });
  }

  /** A member's own progress (rate limited, members of this crew only). */
  report(runId: string, saveId: string, p: PlayerSave) {
    const l = this.live.get(runId);
    if (!l || l.finished || !l.members.includes(saveId)) return;
    const k = `${runId}|${saveId}`;
    const now = Date.now();
    if (now - (this.lastMsg.get(k) ?? 0) < SAVE_RULES.minGapMs) return;
    this.lastMsg.set(k, now);
    l.players[saveId] = p;
    l.dirty = true;
  }

  /** The crew escaped: that expedition is over, the next one starts fresh. */
  finish(runId: string) {
    const l = this.live.get(runId);
    if (!l || l.finished) return;
    l.finished = true;
    saveStore()
      .del(l.key)
      .catch((err) => console.warn("[saves] delete failed:", (err as Error).message));
  }

  /** Write now. Call BEFORE the run's shared state goes away (the jungle is read right here). */
  flush(runId: string): Promise<void> {
    const l = this.live.get(runId);
    const world = l && !l.finished ? this.worldOf(runId) : null;
    if (!l || !world) return Promise.resolve();
    l.dirty = false;
    const doc: RunSaveDoc = { _id: l.key, kind: l.kind, chapter: l.chapter, members: l.members, updatedAt: Date.now(), world, players: l.players };
    return saveStore()
      .put(doc)
      .catch((err) => console.warn("[saves] write failed:", (err as Error).message));
  }

  /**
   * A run is already saving to this slot (someone reloaded and started again
   * while their old seat was still held): write it now and let it stop saving,
   * so it can never overwrite the new run later.
   */
  async takeOver(key: string) {
    for (const [id, l] of [...this.live]) {
      if (l.key !== key) continue;
      await this.flush(id);
      this.live.delete(id);
    }
  }

  /** The run is gone (everyone left). */
  drop(runId: string) {
    this.live.delete(runId);
    for (const k of this.lastMsg.keys()) if (k.startsWith(`${runId}|`)) this.lastMsg.delete(k);
  }

  /** Periodic: write the saves that changed. */
  tick() {
    for (const [id, l] of this.live) if (l.dirty && !l.finished) void this.flush(id);
  }

  /** Shutdown / room disposal: write everything. */
  async flushAll() {
    await Promise.all([...this.live.keys()].map((id) => this.flush(id)));
  }
}
