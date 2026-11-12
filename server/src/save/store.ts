import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SAVE_RULES, type FoodItem, type PlayerSave } from "../shared/index.js";

/** The shared jungle of a saved expedition. */
export interface WorldSave {
  /** ms since the expedition started (day/night clock). */
  elapsed: number;
  /** Cut cells per zone as base64 bitsets. */
  cleared: { z: number; b: string }[];
  picked: number[];
  /** Seconds each campfire still burns. */
  fires: number[];
  store: Partial<Record<FoodItem, number>>;
  /** Firewood trees: hp, logs in the pile, seconds until regrown. */
  trees: { t: number; hp: number; pile: number; regrow: number }[];
  /** Shared quests: [index, state, progress, items-got bitmask]. */
  adv?: [number, number, number, number][];
}

export interface RunSaveDoc {
  /** "solo|<saveId>|c<chapter>" or "team|<sorted saveIds>|c<chapter>". */
  _id: string;
  kind: "solo" | "team";
  chapter: number;
  members: string[];
  updatedAt: number;
  world: WorldSave;
  players: Record<string, PlayerSave>;
  /** A guest save that was carried into an account (never carried twice). */
  claimedBy?: string;
}

/** What a player keeps between expeditions: the highest chapter they escaped. */
export interface PlayerProgress {
  _id: string;
  best: number;
  updatedAt: number;
}

export interface SaveStore {
  get(key: string): Promise<RunSaveDoc | null>;
  put(doc: RunSaveDoc): Promise<void>;
  del(key: string): Promise<void>;
  getProgress(saveId: string): Promise<PlayerProgress | null>;
  putProgress(p: PlayerProgress): Promise<void>;
}

/**
 * Production: the managed Mongo database Boxity Legion injects (MONGODB_URI,
 * scoped to this game). Old saves expire through a TTL index.
 */
class MongoStore implements SaveStore {
  private col: Promise<import("mongodb").Collection<RunSaveDoc & { savedAt: Date }>>;
  private prog: Promise<import("mongodb").Collection<PlayerProgress>>;

  constructor(uri: string) {
    const db = (async () => {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri);
      await client.connect();
      console.log("[saves] using managed Mongo");
      return client.db();
    })();
    this.col = db.then(async (d) => {
      const col = d.collection<RunSaveDoc & { savedAt: Date }>("run_saves");
      await col.createIndex({ savedAt: 1 }, { expireAfterSeconds: SAVE_RULES.keepDays * 86400 });
      return col;
    });
    this.prog = db.then((d) => d.collection<PlayerProgress>("player_progress"));
    this.col.catch((err) => console.error("[saves] Mongo connect failed:", (err as Error).message));
    this.prog.catch(() => {});
  }

  async getProgress(saveId: string) {
    return (await this.prog).findOne({ _id: saveId });
  }

  async putProgress(p: PlayerProgress) {
    await (await this.prog).replaceOne({ _id: p._id }, p, { upsert: true });
  }

  async get(key: string) {
    const doc = await (await this.col).findOne({ _id: key });
    if (!doc) return null;
    const { savedAt: _ignored, ...rest } = doc;
    return rest as RunSaveDoc;
  }

  async put(doc: RunSaveDoc) {
    await (await this.col).replaceOne({ _id: doc._id }, { ...doc, savedAt: new Date() }, { upsert: true });
  }

  async del(key: string) {
    await (await this.col).deleteOne({ _id: key });
  }
}

/** Local dev without a database: one JSON file (server/.data/run-saves.json), written atomically. */
class FileStore implements SaveStore {
  private file = resolve(process.cwd(), ".data", "run-saves.json");
  private data: Promise<Record<string, RunSaveDoc>>;
  private writing: Promise<void> = Promise.resolve();

  constructor() {
    this.data = readFile(this.file, "utf8")
      .then((t) => JSON.parse(t) as Record<string, RunSaveDoc>)
      .catch(() => ({}));
    console.log(`[saves] no MONGODB_URI: saving to ${this.file}`);
  }

  private persist() {
    // Chain writes so they never interleave; write a temp file then rename (no half-written file).
    this.writing = this.writing.then(async () => {
      const all = await this.data;
      await mkdir(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(all));
      await rename(tmp, this.file);
    });
    return this.writing;
  }

  async get(key: string) {
    const doc = (await this.data)[key];
    return doc ? structuredClone(doc) : null;
  }

  async put(doc: RunSaveDoc) {
    (await this.data)[doc._id] = structuredClone(doc);
    await this.persist();
  }

  async del(key: string) {
    delete (await this.data)[key];
    await this.persist();
  }

  // Player progress lives in the same file under "prog|<saveId>".
  async getProgress(saveId: string) {
    const p = (await this.data)[`prog|${saveId}`] as unknown as PlayerProgress | undefined;
    return p ? { ...p } : null;
  }

  async putProgress(p: PlayerProgress) {
    (await this.data)[`prog|${p._id}`] = { ...p } as unknown as RunSaveDoc;
    await this.persist();
  }
}

let store: SaveStore | null = null;

/** One store per server process (shared by every room). */
export function saveStore(): SaveStore {
  if (!store) store = process.env.MONGODB_URI ? new MongoStore(process.env.MONGODB_URI) : new FileStore();
  return store;
}
