import type { Run } from "../rooms/RunSystem.js";
import { RUN_RULES, isFoodItem } from "../shared/index.js";
import type { WorldSave } from "./store.js";

/** Cell set -> base64 bitset (bit i = cell i cut). */
function toBits(set: Set<number>): string {
  let max = -1;
  for (const i of set) if (i > max) max = i;
  const bytes = Buffer.alloc(Math.ceil((max + 1) / 8));
  for (const i of set) bytes[i >> 3] |= 1 << (i & 7);
  return bytes.toString("base64");
}

function fromBits(b64: unknown): Set<number> {
  const set = new Set<number>();
  if (typeof b64 !== "string") return set;
  const bytes = Buffer.from(b64, "base64");
  const limit = Math.min(bytes.length * 8, RUN_RULES.maxCellIndex + 1);
  for (let i = 0; i < limit; i++) if (bytes[i >> 3] & (1 << (i & 7))) set.add(i);
  return set;
}

const finite = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

/** The run's shared jungle as a save (relative times, so it can resume any time later). */
export function worldOf(run: Run, now = Date.now()): WorldSave {
  return {
    elapsed: now - run.startedAt,
    cleared: [...run.cleared].map(([z, set]) => ({ z, b: toBits(set) })),
    picked: [...run.picked],
    fires: run.fires.map((t) => Math.max(0, (t - now) / 1000)),
    store: Object.fromEntries(run.store),
    trees: [...run.trees].map(([t, tr]) => ({ t, hp: tr.hp, pile: tr.pile, regrow: Math.max(0, (tr.regrowAt - now) / 1000) })),
    adv: [...run.adv].map(([i, a]) => [i, a.s, a.p, a.g]),
  };
}

/** Put a saved jungle back into a fresh run (every value re-checked: the file could be old or edited). */
export function restoreWorld(run: Run, w: WorldSave, now = Date.now()) {
  run.startedAt = now - finite(w.elapsed, 0, 1e10);
  run.cleared = new Map();
  for (const { z, b } of Array.isArray(w.cleared) ? w.cleared : []) {
    if (Number.isInteger(z) && z >= 0 && z < RUN_RULES.maxZones) run.cleared.set(z, fromBits(b));
  }
  run.picked = new Set((Array.isArray(w.picked) ? w.picked : []).filter((i) => Number.isInteger(i) && i >= 0 && i < RUN_RULES.maxLootItems));
  run.fires = run.fires.map((_, i) => {
    const left = finite(w.fires?.[i], 0, RUN_RULES.maxFireSeconds);
    return left > 0 ? now + left * 1000 : 0;
  });
  run.store = new Map(Object.entries(w.store ?? {}).filter(([k]) => isFoodItem(k)).map(([k, n]) => [k as never, Math.round(finite(n, 0, RUN_RULES.storeCapacity))]));
  run.adv = new Map();
  for (const e of Array.isArray(w.adv) ? w.adv : []) {
    if (!Array.isArray(e) || !Number.isInteger(e[0]) || e[0] < 0 || e[0] >= RUN_RULES.maxAdventures) continue;
    run.adv.set(e[0], { s: Math.round(finite(e[1], 0, 3)), p: Math.round(finite(e[2], 0, 9999)), g: Math.round(finite(e[3], 0, 2 ** 20)) });
  }
  run.trees = new Map();
  for (const tr of Array.isArray(w.trees) ? w.trees : []) {
    if (!Number.isInteger(tr?.t) || tr.t < 0 || tr.t >= RUN_RULES.maxTrees) continue;
    run.trees.set(tr.t, {
      hp: Math.round(finite(tr.hp, 0, RUN_RULES.treeHp)),
      pile: Math.round(finite(tr.pile, 0, 99)),
      regrowAt: now + finite(tr.regrow, 0, RUN_RULES.treeRegrowSeconds) * 1000,
    });
  }
}
