import { RUN_RULES } from "@shared";
import { CAMPFIRE } from "../../config/night";
import { ZONES1 } from "../../config/zones1";
import { outpostPlan } from "../../world/zones/outpostLayout";
import { runNet, sendFuel } from "../../net/runNet";

/**
 * Campfire pits: one in Camp 1 and one in every outpost (not the rescue point).
 * Fuel-based: every log adds RUN_RULES.logSeconds of burn (shared by the party
 * in online runs). Mutable state changed inside useFrame; HUD polls.
 */
export interface FireSpot {
  x: number;
  z: number;
  name: string;
}

export interface Fire extends FireSpot {
  /** Seconds of burn left (0 = out). */
  burn: number;
  /** performance.now()/1000 when it last caught fire. */
  litAt: number;
}

const centre = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });

/** Angles (radians) of the paths into and out of outpost i, seen from its centre. */
export function outpostPathAngles(i: number): number[] {
  const zn = ZONES1[i];
  const b = zn.base;
  const into = centre(zn.exit);
  const next = ZONES1[i + 1];
  const list = [Math.atan2(into.z - b.z, into.x - b.x)];
  if (next) {
    const out = centre(next.corridor);
    list.push(Math.atan2(out.z - b.z, out.x - b.x));
  }
  return list;
}

/** Outpost pit: in the middle of the outpost, toward its free side (outpost plan). */
function outpostFire(i: number): FireSpot {
  const f = outpostPlan(i).fire;
  return { x: f.x, z: f.z, name: ZONES1[i].base.name };
}

export function campfireSpots(): FireSpot[] {
  const list: FireSpot[] = [{ x: CAMPFIRE.camp.x, z: CAMPFIRE.camp.z, name: "Landing Site" }];
  for (let i = 0; i < ZONES1.length - 1; i++) list.push(outpostFire(i));
  return list;
}

export const campfires = {
  fires: [] as Fire[],
  /** Last fire that caught (banner). */
  lastLit: { index: -1, at: 0 },
  version: 0,
};

/** Proximity to the nearest lit fire (0..1) and whether the player is inside its safe radius. */
export const campfireGlow = { amount: 0, safe: false, nearest: -1, nearestDist: Infinity };

// Dev only: automated checks inspect fires (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __campfires: campfires });

export function resetCampfires() {
  campfires.fires = campfireSpots().map((s) => ({ ...s, burn: 0, litAt: 0 }));
  campfires.lastLit = { index: -1, at: 0 };
  campfires.version++;
  campfireGlow.amount = 0;
  campfireGlow.safe = false;
  campfireGlow.nearest = -1;
  campfireGlow.nearestDist = Infinity;
}

export const isLit = (f: Fire) => f.burn > 0;
export const anyFireLit = () => campfires.fires.some(isLit);
/** Logs shown in the pit (one per logSeconds of fuel, up to the pit's 5). */
export const logsIn = (f: Fire) => Math.min(CAMPFIRE.woodToLight, Math.ceil(f.burn / RUN_RULES.logSeconds - 1e-6));
export const fireFull = (f: Fire) => f.burn > RUN_RULES.maxFireSeconds - RUN_RULES.logSeconds;

/** Set a fire's remaining burn (local fuel or a server update). */
export function setBurn(index: number, left: number) {
  const f = campfires.fires[index];
  if (!f) return;
  if (f.burn <= 0 && left > 0) {
    f.litAt = performance.now() / 1000;
    campfires.lastLit = { index, at: f.litAt };
  }
  f.burn = Math.max(0, left);
  campfires.version++;
}

/** Put one log on fire `index` (the server echoes the shared value in online runs). */
export function addLog(index: number) {
  const f = campfires.fires[index];
  if (!f) return;
  setBurn(index, Math.min(f.burn + RUN_RULES.logSeconds, RUN_RULES.maxFireSeconds));
  if (runNet.online) sendFuel(index);
}

/** The nearest lit fire to (x, z) and its distance. */
export function nearestLitFire(x: number, z: number): { fire: Fire | null; d: number } {
  let fire: Fire | null = null;
  let d = Infinity;
  for (const f of campfires.fires) {
    if (!isLit(f)) continue;
    const dd = Math.hypot(f.x - x, f.z - z);
    if (dd < d) {
      d = dd;
      fire = f;
    }
  }
  return { fire, d };
}

/** Inside a lit fire's safe radius (animals keep away). */
export const isSafeAt = (x: number, z: number) => nearestLitFire(x, z).d < CAMPFIRE.safeRadius;
