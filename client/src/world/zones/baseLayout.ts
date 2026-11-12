import { ZONES1 } from "../../config/zones1";
import { FORAGE } from "../../config/survival";
import { CRASH_CAMP } from "../../config/crashCamp";
import { chapterData } from "../../config/chapters";

/** Crash site: big rain catcher beside the trail out, big parachute shelter. */
const CAMP_WATER = CRASH_CAMP.water;
const CAMP_TENT_SCALE = CRASH_CAMP.tentScale;
import { mulberry32 } from "../geo/rng";
import { outpostPlan } from "./outpostLayout";

/**
 * Where survival props go: per camp a Food Store hut, a water barrel and a
 * tent (+ crates), and the forage spots (berry bushes, banana bunches, springs).
 * Pure functions of the zone layout, so every client computes the same spots.
 */
export interface Spot {
  x: number;
  z: number;
  /** Faces the camp centre. */
  rotY: number;
  /** Size multiplier (the crash site's tent and water are extra big). */
  scale?: number;
}

export interface CampLayout {
  name: string;
  store: Spot;
  water: Spot;
  tent: Spot;
  /** Outposts: the tool shop (the crash site's is the camp tool board). */
  shop?: Spot;
}

const face = (x: number, z: number, cx: number, cz: number): Spot => ({ x, z, rotY: Math.atan2(cx - x, cz - z) });
/** Crash site (hand placed, clear of the existing camp props) + every outpost (not the rescue point). */
export function campLayouts(): CampLayout[] {
  const list: CampLayout[] = [
    { name: chapterData().campName, store: face(-6.8, 7.2, 0, 2), water: { ...face(CAMP_WATER.x, CAMP_WATER.z, 0, 2), scale: CAMP_WATER.scale }, tent: { ...face(-8, 2, 0, 2), scale: CAMP_TENT_SCALE } },
  ];
  // Outposts: every thing in its own place (config/outpostPlan.ts).
  for (let i = 0; i < ZONES1.length - 1; i++) {
    const p = outpostPlan(i);
    list.push({ name: ZONES1[i].base.name, store: p.store, water: p.water, tent: p.tent, shop: p.shop });
  }
  return list;
}

export interface ForageLayout {
  berryBushes: { x: number; z: number }[];
  bananas: { x: number; z: number; y: number }[];
  springs: { x: number; z: number }[];
}

/** Forage spots. `innerTrees` = inner tree spots per zone id (banana palms carry the bunches). */
export function forageLayout(innerTrees: Map<string, { x: number; z: number; r: number }[]>): ForageLayout {
  const rng = mulberry32(FORAGE.seed);
  const r = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const berryBushes: { x: number; z: number }[] = [];
  const springs: { x: number; z: number }[] = [];
  const clear = (x: number, z: number, gap: number, trees: { x: number; z: number; r: number }[]) =>
    trees.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + gap) &&
    berryBushes.every((p) => Math.hypot(p.x - x, p.z - z) > 6) &&
    springs.every((p) => Math.hypot(p.x - x, p.z - z) > 8);
  ZONES1.forEach((zn, zi) => {
    const trees = innerTrees.get(zn.id) ?? [];
    const rect = zn.rect;
    const place = (out: { x: number; z: number }[], n: number, gap: number) => {
      for (let t = 0, k = 0; k < n && t < 200; t++) {
        const x = r(rect.minX + 3, rect.maxX - 3);
        const z = r(rect.minZ + 3, rect.maxZ - 3);
        if (!clear(x, z, gap, trees)) continue;
        out.push({ x, z });
        k++;
      }
    };
    place(berryBushes, FORAGE.berryBushesPerZone, 2.5);
    // Springs: one in the fern gully, two in the marsh, one in the banana grove.
    const n = zn.id === "marsh" ? 2 : zn.id === "ferns" || zn.id === "banana" ? 1 : 0;
    place(springs, n, 3);
    void zi;
  });
  // A couple of bushes at every camp ring.
  for (const c of campLayouts()) {
    for (let k = 0; k < FORAGE.berryBushesPerCamp; k++) {
      // Behind the tent (away from the camp centre), one each side.
      const back = c.tent.rotY + Math.PI;
      const side = (k ? 1 : -1) * 1.9;
      berryBushes.push({ x: c.tent.x + Math.sin(back) * 2.0 + Math.cos(back) * side, z: c.tent.z + Math.cos(back) * 2.0 - Math.sin(back) * side });
    }
  }
  const palms = innerTrees.get("banana") ?? [];
  const bananas = palms.slice(0, FORAGE.bananaBunches).map((t) => ({ x: t.x + 0.55, z: t.z + 0.2, y: 2.3 }));
  return { berryBushes, bananas, springs };
}

/** Grass-free circles around forage spots (radius m). */
export function forageClearings(f: ForageLayout): { x: number; z: number; r: number }[] {
  return [...f.berryBushes.map((p) => ({ ...p, r: 1.3 })), ...f.springs.map((p) => ({ ...p, r: 2.4 }))];
}
