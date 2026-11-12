import { FOOD_ITEMS, RUN_RULES, type FoodItem } from "./run.js";

/**
 * Expedition saves. One save per crew and chapter: playing alone uses your
 * solo save; a party uses the save of exactly that set of players (if anyone
 * is different, it starts fresh). Solo and party saves never mix. Escaping
 * deletes the save, so the next expedition starts from the beginning.
 */
export const SAVE_RULES = {
  /** Clients send their own progress this often (s). */
  clientIntervalS: 8,
  /** Save messages closer together than this are ignored (ms); short so the save sent right before leaving gets through. */
  minGapMs: 500,
  /** The server writes changed saves to the database this often (ms). */
  flushMs: 15000,
  /** Largest player save accepted (JSON characters). */
  maxChars: 4096,
  /** Saves nobody touched for this long are deleted by the database (days). */
  keepDays: 60,
} as const;

/** Guest-only save key a signed-out browser keeps (never an account id). */
export const GUEST_SAVE_KEY = /^[a-z0-9]{16,40}$/;

/** One player's own progress (the shared jungle is saved by the server itself). */
export interface PlayerSave {
  x: number;
  z: number;
  yaw: number;
  cash: number;
  bag: number;
  bagValue: number;
  tool: string;
  levels: Record<string, number>;
  health: number;
  hunger: number;
  thirst: number;
  pouch: Partial<Record<FoodItem, number>>;
  /** Firewood logs carried. */
  carried: number;
  /** Treasures found: [treasure index, value, zone]. */
  found: [number, number, number][];
  /** Open gates as a bitmask (so restored gates don't celebrate again). */
  gates: number;
  /** Run timer (s), plants cut and blades harvested so far. */
  time: number;
  cut: number;
  blades: number;
}

const num = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const int = (v: unknown, lo: number, hi: number) => Math.round(num(v, lo, hi));
const triples = (v: unknown, max: number, lim: [number, number][]): [number, number, number][] =>
  Array.isArray(v)
    ? v.slice(0, max).filter(Array.isArray).map((t) => [int(t[0], ...lim[0]), num(t[1], ...lim[1]), int(t[2], ...lim[2])] as [number, number, number])
    : [];

/** Validate a client's save: known fields only, every number clamped. Null if unusable. */
export function sanitizePlayerSave(raw: unknown): PlayerSave | null {
  if (!raw || typeof raw !== "object") return null;
  let size = 0;
  try {
    size = JSON.stringify(raw).length;
  } catch {
    return null;
  }
  if (size > SAVE_RULES.maxChars) return null;
  const r = raw as Record<string, unknown>;
  const b = RUN_RULES.bounds;
  const levels: Record<string, number> = {};
  if (r.levels && typeof r.levels === "object") {
    for (const k of ["backpack", "sharpness", "swing", "legs"]) levels[k] = int((r.levels as Record<string, unknown>)[k], 0, 20);
  }
  const pouch: Partial<Record<FoodItem, number>> = {};
  if (r.pouch && typeof r.pouch === "object") {
    for (const f of FOOD_ITEMS) pouch[f] = int((r.pouch as Record<string, unknown>)[f], 0, 99);
  }
  return {
    x: num(r.x, b.minX, b.maxX),
    z: num(r.z, b.minZ, b.maxZ),
    yaw: num(r.yaw, -100, 100),
    cash: num(r.cash, 0, 1e7),
    bag: int(r.bag, 0, 1e5),
    bagValue: num(r.bagValue, 0, 1e6),
    tool: typeof r.tool === "string" && /^[A-Za-z]{1,32}$/.test(r.tool) ? r.tool : "",
    levels,
    health: num(r.health, 0, 1000),
    hunger: num(r.hunger, 0, 1000),
    thirst: num(r.thirst, 0, 1000),
    pouch,
    carried: int(r.carried, 0, 99),
    found: triples(r.found, 60, [[0, 99], [0, 1e5], [0, 31]]),
    gates: int(r.gates, 0, 2 ** 16),
    time: num(r.time, 0, 1e7),
    cut: int(r.cut, 0, 1e7),
    blades: int(r.blades, 0, 1e8),
  };
}
