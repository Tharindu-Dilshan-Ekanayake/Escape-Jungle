import { ZONES1, ZONE_WALL, type ZoneDef } from "../../config/zones1";
import type { PartBuilder } from "../geo/PartBuilder";
import { toWorld, type Collider } from "../../game/player/collision";
import { GrassField } from "../../grass/GrassField";
import { bush, fallenLeaf, flower, foliageMass, rock, torch, tuft } from "../props/nature";
import { grinder } from "../props/campProps";
import { TREE_LITTER, zoneTree } from "../props/trees";
import { helipad } from "../props/helicopter";
import { outpostGrinder } from "./stations";
import { outpostPlan } from "./outpostLayout";
import { FIREWOOD } from "../../config/firewood";
import { AMAZON } from "../../config/amazon";
import { scatterAmazon } from "../props/amazonScatter";
import { ruinSpots } from "./ruins";
import { canopyOverhang, forest } from "./mistyForest";
import { DEEP_JUNGLE } from "../../config/mistyForest";
import { darkTree } from "../props/darkTree";

type Rect = ZoneDef["rect"];
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r.minX - m && x < r.maxX + m && z > r.minZ - m && z < r.maxZ + m;
const inBase = (zn: ZoneDef, x: number, z: number, m = 0) => Math.hypot(x - zn.base.x, z - zn.base.z) < zn.base.r + m;

/** Inside any zone, corridor, gate path or outpost (grown by `margin`). Keeps scatter off paths. */
export function inZones(x: number, z: number, margin = 0): boolean {
  return ZONES1.some(
    (zn) => inRect(zn.rect, x, z, margin) || inRect(zn.corridor, x, z, margin) || inRect(zn.exit, x, z, margin) || inBase(zn, x, z, margin),
  );
}

/** The zone whose rect contains (x, z), if any. */
export function zoneAt(x: number, z: number): ZoneDef | undefined {
  return ZONES1.find((zn) => inRect(zn.rect, x, z));
}

/** Path (corridor / gate path) containing (x, z), if any (floor colour). */
export function corridorAt(x: number, z: number): ZoneDef | undefined {
  return ZONES1.find((zn) => inRect(zn.corridor, x, z) || inRect(zn.exit, x, z));
}

/** Outpost / rescue point containing (x, z), if any (sand floor). */
export function baseAt(x: number, z: number): ZoneDef | undefined {
  return ZONES1.find((zn) => inBase(zn, x, z));
}

interface TreeSpot {
  x: number;
  z: number;
  r: number;
}

/** Outpost: grinder + torches + a ring of jungle; the last one is the rescue point. */
function addBase(b: PartBuilder, colliders: Collider[], i: number) {
  const zn = ZONES1[i];
  const { x: bx, z: bz, r } = zn.base;
  if (i < ZONES1.length - 1) {
    const g = outpostGrinder(i);
    b.push([g.x, 0, g.z], g.rotY);
    const local = grinder(b);
    b.pop();
    for (const c of local) colliders.push(toWorld(c, g.x, g.z, g.rotY));
    // Log seats round the fire.
    for (const st of outpostPlan(i).seats) {
      b.push([st.x, 0, st.z], st.rotY);
      b.cyl(0.28, 0.3, 1.6, 7, { pos: [0, 0.28, 0], rot: [0, 0, Math.PI / 2], color: "#6b4423", top: "#8a5a34" });
      for (const x of [-0.81, 0.81]) b.cyl(0.24, 0.24, 0.02, 7, { pos: [x, 0.28, 0], rot: [0, 0, Math.PI / 2], color: "#e8cf9a" });
      b.pop();
      colliders.push(toWorld({ kind: "box", x: 0, z: 0, hx: 0.85, hz: 0.32, h: 0.55 }, st.x, st.z, st.rotY));
    }
  } else {
    helipad(b, bx, bz);
    colliders.push({ kind: "circle", x: bx, z: bz, r: 1.8 });
  }
  const ring = ZONE_WALL.outpostRing;
  for (let k = 0; k < ring.torches; k++) {
    const a = (k / ring.torches) * Math.PI * 2 + Math.PI / 4;
    const x = bx + Math.cos(a) * (r - 1.2);
    const z = bz + Math.sin(a) * (r - 1.2);
    if (inRect(zn.exit, x, z, 1) || ZONES1.some((o) => inRect(o.corridor, x, z, 1))) continue;
    // Keep torches out of the stations' way (grinder, shop, tent, store, water, fire).
    if (i < ZONES1.length - 1) {
      const pl = outpostPlan(i);
      if ([pl.grinder, pl.shop, pl.tent, pl.store, pl.water, pl.fire].some((q) => Math.hypot(q.x - x, q.z - z) < 3)) continue;
    }
    torch(b, x, z);
    colliders.push({ kind: "circle", x, z, r: 0.25 });
  }
  const ringPoint = () => {
    for (let t = 0; t < 30; t++) {
      const a = b.rand(0, Math.PI * 2);
      const d = b.rand(r + 0.5, r + 6);
      const x = bx + Math.cos(a) * d;
      const z = bz + Math.sin(a) * d;
      if (!inZones(x, z, 1)) return { x, z };
    }
    return null;
  };
  // Inside the outpost: keep clear of the stations, the fire and the paths through.
  const pl = i < ZONES1.length - 1 ? outpostPlan(i) : null;
  const free = (x: number, z: number, gap: number) =>
    !(pl && [pl.grinder, pl.shop, pl.tent, pl.store, pl.water, pl.fire, ...pl.seats].some((q) => Math.hypot(q.x - x, q.z - z) < gap)) &&
    !ZONES1.some((o) => inRect(o.corridor, x, z, 1.2) || inRect(o.exit, x, z, 1.2));
  const inside = (minD: number, maxD: number, gap: number) => {
    for (let t = 0; t < 30; t++) {
      const a = b.rand(0, Math.PI * 2);
      const d = b.rand(minD, maxD);
      const x = bx + Math.cos(a) * d;
      const z = bz + Math.sin(a) * d;
      if (free(x, z, gap)) return { x, z };
    }
    return null;
  };
  // A tight ring of dark, creepy trees right at the outpost edge (outside the paths).
  for (let k = 0; k < ring.darkTrees; k++) {
    const a = (k / ring.darkTrees) * Math.PI * 2 + b.rand(-0.2, 0.2);
    const d = r + b.rand(0.8, 3.5);
    const x = bx + Math.cos(a) * d;
    const z = bz + Math.sin(a) * d;
    if (inZones(x, z, 1.2) || !free(x, z, 3)) continue;
    darkTree(b, x, z, b.rand(8, 12));
  }
  // Bushes fill the edge between the stations (no bare sand).
  for (let k = 0; k < ring.bushes; k++) {
    const p = inside(r - 1.8, r + 1.5, 2.8);
    if (p) bush(b, p.x, p.z, b.rand(0.9, 1.6));
  }
  // Ground clutter on the open ground: grass tufts, fallen leaves, small rocks, flowers.
  const OC = ZONE_WALL.outpostClutter;
  for (let k = 0; k < OC.tufts; k++) {
    const p = inside(1.5, r - 0.6, 1.8);
    if (p) tuft(b, p.x, p.z);
  }
  for (let k = 0; k < OC.leaves; k++) {
    const p = inside(0.5, r - 0.3, 1.2);
    if (p) fallenLeaf(b, p.x, p.z);
  }
  for (let k = 0; k < OC.rocks; k++) {
    const p = inside(r - 3, r - 0.5, 2.6);
    if (p) rock(b, p.x, p.z, b.rand(0.25, 0.5));
  }
  for (let k = 0; k < OC.flowers; k++) {
    const p = inside(2, r - 1, 2.4);
    if (p) for (let f = 0; f < 4; f++) flower(b, p.x + b.rand(-0.5, 0.5), p.z + b.rand(-0.5, 0.5));
  }
  for (let k = 0; k < ring.foliage; k++) {
    const p = ringPoint();
    if (p) foliageMass(b, p.x, b.rand(1.5, 6), p.z, b.rand(2, 3.4));
  }
}

/**
 * Jungle walls in each zone's own tree species, a few inner trees (with
 * colliders), species-coloured litter, plus every outpost and the rescue point.
 */
export function addZoneScenery(b: PartBuilder, colliders: Collider[]): Map<string, TreeSpot[]> {
  const inner = new Map<string, TreeSpot[]>();
  const w = ZONE_WALL;
  const ruins = ruinSpots();
  ZONES1.forEach((zn, zi) => {
    const r = zn.rect;
    const perimeter = 2 * (r.maxX - r.minX + (r.maxZ - r.minZ));
    const bandPoint = () => {
      for (let tries = 0; tries < 40; tries++) {
        const x = b.rand(r.minX - w.band, r.maxX + w.band);
        const z = b.rand(r.minZ - w.band, r.maxZ + w.band);
        if (inZones(x, z, 1) || Math.hypot(x, z) < w.campSkipRadius) continue;
        if (ruins.some((rs) => Math.hypot(rs.x - x, rs.z - z) < 6.5)) continue; // keep the ruins clear
        return { x, z };
      }
      return null;
    };
    const n = (per100: number) => Math.round((perimeter / 100) * per100);
    for (let i = 0; i < n(w.treesPer100m); i++) {
      const p = bandPoint();
      if (p) zoneTree(zn.tree, b, p.x, p.z);
    }
    for (let i = 0; i < n(w.foliagePer100m); i++) {
      const p = bandPoint();
      if (p) foliageMass(b, p.x, b.rand(1.5, 7), p.z, b.rand(2, 3.8));
    }
    for (let i = 0; i < n(w.bushesPer100m); i++) {
      const p = bandPoint();
      if (p) bush(b, p.x, p.z, b.rand(1.1, 2.3));
    }
    // Deep-Amazon life along the zone edge: strange plants, a spider, a skull totem, a snake...
    scatterAmazon(b, colliders, bandPoint, AMAZON.zone);
    // Deep jungle all round: tall dark trunks, lianas and high canopy over the edges
    // (the Meadow gets its own misty forest from mistyForest.addMistyForest).
    if (zi > 0) {
      forest(b, colliders, bandPoint, DEEP_JUNGLE, (x, z) => inZones(x, z, 0.3));
      canopyOverhang(b, bandPoint, DEEP_JUNGLE.overhang);
    }

    const spots: TreeSpot[] = [];
    for (let tries = 0; spots.length < zn.innerTrees && tries < 80; tries++) {
      const x = b.rand(r.minX + 4, r.maxX - 4);
      const z = b.rand(r.minZ + 4, r.maxZ - 4);
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 8)) continue;
      if (FIREWOOD.spots.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 5)) continue;
      const tr = zoneTree(zn.tree, b, x, z);
      colliders.push({ kind: "circle", x, z, r: tr + 0.15 });
      spots.push({ x, z, r: tr });
    }
    inner.set(zn.id, spots);

    const litter = TREE_LITTER[zn.tree];
    for (let i = 0; i < 60; i++) {
      const c = i % 4 === 0 ? zn.corridor : r;
      b.leaf(b.rand(0.35, 0.6), b.rand(0.2, 0.32), {
        pos: [b.rand(c.minX, c.maxX), 0.02, b.rand(c.minZ, c.maxZ)],
        rot: [b.rand(-0.06, 0.06), b.rand(0, 6.28), 0],
        scale: [1, 0.2, 1],
        color: litter[i % litter.length],
      });
    }
    addBase(b, colliders, zi);
  });
  return inner;
}

/** One grass field per zone with that zone's plant, kept clear around inner trees and forage spots. */
export function createZoneFields(
  inner: Map<string, TreeSpot[]>,
  clearings: { x: number; z: number; r: number }[] = [],
): { zone: ZoneDef; field: GrassField }[] {
  return ZONES1.map((zone, i) => {
    const trees = inner.get(zone.id) ?? [];
    const field = new GrassField(
      zone.rect,
      ZONE_WALL.seed + i * 101,
      zone.plantId,
      (x, z) =>
        trees.some((t) => Math.hypot(t.x - x, t.z - z) < t.r + ZONE_WALL.innerClearance) ||
        clearings.some((c) => Math.hypot(c.x - x, c.z - z) < c.r),
    );
    return { zone, field };
  });
}
