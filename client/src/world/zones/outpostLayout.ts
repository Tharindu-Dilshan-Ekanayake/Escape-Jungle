import { ZONES1 } from "../../config/zones1";
import { OUTPOST_PLAN as K } from "../../config/outpostPlan";
import { chapterState } from "../../config/chapters";

/**
 * Deterministic outpost layout (every client computes the same): see
 * config/outpostPlan.ts. Each outpost i sits between zone i's gate path and
 * zone i+1's corridor.
 */
export interface PlanSpot {
  x: number;
  z: number;
  /** Faces this way (Object3D.rotation.y; +Z of the prop points here). */
  rotY: number;
}

export interface OutpostPlan {
  grinder: PlanSpot;
  shop: PlanSpot;
  tent: PlanSpot;
  store: PlanSpot;
  water: PlanSpot;
  fire: { x: number; z: number };
  seats: PlanSpot[];
  npc: PlanSpot;
  /** Directions (radians, atan2(z, x)) of the paths in and out. */
  paths: number[];
}

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
const centre = (r: Rect) => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });
const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const D = Math.PI / 180;

const cache = new Map<number, OutpostPlan>();

let cacheVersion = -1;

export function outpostPlan(i: number): OutpostPlan {
  if (cacheVersion !== chapterState.version) {
    cache.clear();
    cacheVersion = chapterState.version;
  }
  const hit = cache.get(i);
  if (hit) return hit;
  const zn = ZONES1[i];
  const b = zn.base;
  const into = centre(zn.exit);
  const next = ZONES1[i + 1];
  const out = next ? centre(next.corridor) : { x: b.x * 2 - into.x, z: b.z * 2 - into.z };
  const e = Math.atan2(into.z - b.z, into.x - b.x);
  const o = Math.atan2(out.z - b.z, out.x - b.x);
  // Free side: away from both paths (sideways for a straight-through outpost).
  let sx = -(Math.cos(e) + Math.cos(o));
  let sz = -(Math.sin(e) + Math.sin(o));
  if (Math.hypot(sx, sz) < 0.3) {
    sx = -Math.sin(e);
    sz = Math.cos(e);
  }
  const side = Math.atan2(sz, sx);
  const gap = Math.min(angDist(side, e), angDist(side, o));
  const spread = Math.min(K.maxSpreadDeg * D, gap - K.pathClearDeg * D);
  const facing = (x: number, z: number, tx: number, tz: number): PlanSpot => ({ x, z, rotY: Math.atan2(tx - x, tz - z) });
  const at = (a: number, d: number) => ({ x: b.x + Math.cos(a) * d, z: b.z + Math.sin(a) * d });
  const slot = (t: number, ring: number) => {
    const p = at(side + t * spread, b.r * ring);
    return facing(p.x, p.z, b.x, b.z);
  };
  const s = Object.fromEntries(K.slots.map((q) => [q.kind, slot(q.t, q.ring)])) as Record<(typeof K.slots)[number]["kind"], PlanSpot>;
  const fire = at(side, K.fireOffset);
  const seats = K.seatAngles.map((deg) => {
    const a = side + deg * D;
    return facing(fire.x + Math.cos(a) * K.seatDist, fire.z + Math.sin(a) * K.seatDist, fire.x, fire.z);
  });
  // Quest giver: beside the fire on the walkway side, looking at the entrance.
  const n = at(side + Math.PI * 0.5, K.npcOffset + 1.2);
  const plan: OutpostPlan = { ...s, fire, seats, npc: facing(n.x, n.z, into.x, into.z), paths: [e, o] };
  cache.set(i, plan);
  return plan;
}
