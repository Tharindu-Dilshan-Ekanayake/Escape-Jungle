/**
 * Jungle-run sync protocol (shared by client and server). Runs live inside the
 * lobby room; these messages only ever go to the members of one run.
 * Plain TS only.
 */
export const RUN_MSG = {
  // client -> server
  /** Stage loaded: please send the full run state (runSync). */
  hello: "run:hello",
  /** { z, c: cell indices } cells I cut (batched, <= RUN_RULES.cutHz per second). */
  cut: "run:cut",
  /** { i } I picked up loot item i (first one wins). */
  pickup: "run:pickup",
  /** { t, dmg } I hit firewood tree t (everyone's hits add up). */
  chop: "run:chop",
  /** { t } I take one log from tree t's pile. */
  takeLog: "run:takeLog",
  /** { f } I added one log to fire f. */
  fuel: "run:fuel",
  /** { op: "put" | "take", item } shared food store. */
  store: "run:store",
  /** Host only: packed animal snapshot (number[]), relayed to the others. */
  animals: "run:animals",
  /** { id, dmg } a non-host hit an animal (relayed to the host). */
  hit: "run:hit",
  /** Host only: { sid, dmg } an animal hurt that player / { sid, n } meat for the killer. */
  bite: "run:bite",
  meat: "run:meat",
  /** Host only: { sid } that player caught the cheeky monkey (adventure prize). */
  prize: "run:prize",
  /** { to, kind, item?, n, back? } give food / firewood / cash to a party member (relayed as { from, name, ... }). */
  give: "run:give",
  /** { p: PlayerSave } my own progress (every few seconds and when leaving). */
  /** I boarded the rescue helicopter (it leaves when the whole crew is aboard). */
  board: "run:board",
  /** { i, s, p, g, r? } a quest changed (state, progress, items-got bitmask; r = timed quest restarted). Relayed as { i, s, p, g, r, by }. */
  adv: "run:adv",
  save: "run:save",
  /** We escaped: the save is done with (the next expedition starts fresh). */
  finished: "run:finished",
  // server -> client
  /** { n, total, waiting: names } who is aboard the helicopter so far. */
  boarding: "run:boarding",
  /** Everyone is aboard: the helicopter takes off (every client plays the escape). */
  depart: "run:depart",
  /** Full state for (re)joining clients. */
  sync: "run:sync",
  /** { z, c } cells someone else cut. */
  cleared: "run:cleared",
  /** { i, sid } loot item i was taken (sid = who). */
  picked: "run:picked",
  /** { i } your pickup lost the race: undo it. */
  pickDenied: "run:pickDenied",
  /** { f, left } fire f now burns for `left` seconds. */
  fire: "run:fire",
  /** { counts } food store contents. */
  storeState: "run:storeState",
  /** { item } the store gave you this item (take) or handed it back (store full). */
  storeGive: "run:storeGive",
  /** TreeState: a firewood tree changed (hit, felled, a log taken). */
  tree: "run:tree",
  /** { sid } who simulates the animals now. */
  host: "run:host",
} as const;

export const FOOD_ITEMS = ["rawMeat", "cookedMeat", "berries", "banana"] as const;
export type FoodItem = (typeof FOOD_ITEMS)[number];
export const isFoodItem = (v: unknown): v is FoodItem => typeof v === "string" && (FOOD_ITEMS as readonly string[]).includes(v);

export const RUN_RULES = {
  /** Max cut batches per second per player. */
  cutHz: 12,
  maxCellsPerCut: 120,
  maxZones: 8,
  maxCellIndex: 200_000,
  maxLootItems: 400,
  /** Campfires: seconds of burn per log and the cap. */
  fires: 6,
  logSeconds: 45,
  maxFireSeconds: 225,
  /** The crash-site fire burns this long at the start of a run. */
  crashFireSeconds: 90,
  storeCapacity: 40,
  /** Animal snapshot: max floats per message (host -> others). */
  maxAnimalFloats: 16 * 8,
  /** Jungle walkable bounds for position checks (m) and max plausible speed (m/s). */
  bounds: { minX: -120, maxX: 120, minZ: -260, maxZ: 40 },
  maxSpeed: 13,
  /** A respawn teleport is accepted at most this often (ms). */
  teleportCooldownMs: 4000,
  /** Firewood trees: ids 0..maxTrees-1, hits to fell, logs left in the pile, regrow time, chop rate cap, max damage per hit. */
  maxTrees: 48,
  /** Quests per run (one per zone; spare room). */
  maxAdventures: 16,
  treeHp: 6,
  treeLogs: 5,
  treeRegrowSeconds: 150,
  chopHz: 5,
  maxChopDmg: 3,
} as const;

export const SHARE_KINDS = ["food", "wood", "cash"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];
export interface GivePayload {
  to: string;
  kind: ShareKind;
  item?: FoodItem;
  n: number;
  /** Returned leftovers (the receiver had no room): never bounced again. */
  back?: boolean;
}
export interface GiftPayload extends Omit<GivePayload, "to"> {
  from: string;
  name: string;
}
export const SHARE_LIMITS = { food: 8, wood: 5, cash: 1000 } as const;

/** A firewood tree: hp left (0 = felled), logs in its pile, seconds until it regrows. */
export interface TreeState {
  t: number;
  hp: number;
  pile: number;
  regrow: number;
  /** Who hit it (chop) or who took a log (takeLog). */
  by?: string;
  took?: boolean;
}

export interface RunSyncPayload {
  /** ms since the run started (shared day/night clock). */
  elapsed: number;
  cleared: { z: number; c: number[] }[];
  picked: number[];
  fires: number[];
  store: Partial<Record<FoodItem, number>>;
  host: string;
  /** Firewood trees touched so far. */
  trees: TreeState[];
  /** Shared quests touched so far. */
  adv: AdvState[];
}

/** One shared quest: state (0 new, 1 active, 2 ready to hand in, 3 done), progress, items-got bitmask. */
export interface AdvState {
  i: number;
  s: number;
  p: number;
  g: number;
}

/** Client position update while in a run (extends the lobby move). */
export interface RunMovePayload {
  x: number;
  z: number;
  /** Height above ground (jumps), optional. */
  y?: number;
  /** Sender clock in seconds modulo 4096 (smooth remote interpolation). */
  st?: number;
  yaw: number;
  tool?: string;
  /** Swing counter (increments every swing; drives remote avatars). */
  sw?: number;
  /** Respawn teleport (no speed clamp, rate limited). */
  tp?: boolean;
}
