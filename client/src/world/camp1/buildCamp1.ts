import { CAMP1, type PropKind } from "../../config/camp1";
import { storyTree } from "../props/storyTree";
import { darkTree } from "../props/darkTree";
import type { PartBuilder } from "../geo/PartBuilder";
import { toWorld, type Collider, type LocalCollider } from "../../game/player/collision";
import { bagTable, grinder, toolBoard } from "../props/campProps";
import { cashSign, moneyBox, mowerStand, nuke } from "../props/shopProps";
import { bush, fallenLeaf, flower, foliageMass, leafFan, mushroom, rock, torch, tuft } from "../props/nature";

const PROP_BUILDERS: Record<PropKind, (b: PartBuilder) => LocalCollider[]> = {
  grinder,
  toolBoard,
  bagTable,
  mowerStand,
  cashSign,
  nuke,
  moneyBox,
};

export interface Camp1Extras {
  /** [x, y, z, phase] per firefly. */
  fireflies: Float32Array;
  labels: { text: string; pos: [number, number, number] }[];
}

/**
 * Adds Camp 1 (props, torches, jungle ring, clutter) to a shared builder.
 * `blocked(x, z)` marks ground taken by a grass zone: no jungle scatter there.
 */
export function addCamp1(b: PartBuilder, colliders: Collider[], blocked: (x: number, z: number) => boolean): Camp1Extras {
  /** Area-uniform random point in a ring. */
  const ring = (minR: number, maxR: number) => {
    const r = Math.sqrt(b.rand(minR * minR, maxR * maxR));
    const a = b.rand(0, Math.PI * 2);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, r };
  };

  // --- Props ---
  const props = CAMP1.props.map((p) => ({ ...p, rotY: p.rotY ?? Math.atan2(-p.x, -p.z) }));
  const nearProp = (x: number, z: number, gap: number) => props.some((p) => Math.hypot(p.x - x, p.z - z) < gap);
  for (const p of props) {
    b.push([p.x, 0, p.z], p.rotY);
    const local = PROP_BUILDERS[p.kind](b);
    b.pop();
    for (const c of local) colliders.push(toWorld(c, p.x, p.z, p.rotY));
  }

  // --- Torches around the clearing ---
  const t = CAMP1.torches;
  for (let i = 0; i < t.count; i++) {
    const a = (i / t.count) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * t.radius;
    const z = Math.sin(a) * t.radius;
    if (nearProp(x, z, t.minPropGap) || blocked(x, z)) continue;
    torch(b, x, z);
    colliders.push({ kind: "circle", x, z, r: 0.25 });
  }

  // --- Trees ---
  const tr = CAMP1.trees;
  for (let i = 0; i < tr.count; i++) {
    const p = ring(tr.minR, tr.maxR);
    if (blocked(p.x, p.z)) continue;
    const r = b.rand(tr.minTrunkR, tr.maxTrunkR);
    // Dark, creepy forest right round the little clearing.
    storyTree(b, p.x, p.z, b.rand(tr.minH, tr.maxH), r, { dark: true });
    if (p.r < CAMP1.boundRadius + r + 1) colliders.push({ kind: "circle", x: p.x, z: p.z, r: r + 0.15 });
  }

  // Cheaper creepy trees in between (dark trunk, two leaf clumps, vines).
  for (let i = 0; i < CAMP1.darkTrees.count; i++) {
    const p = ring(CAMP1.darkTrees.minR, CAMP1.darkTrees.maxR);
    if (blocked(p.x, p.z)) continue;
    darkTree(b, p.x, p.z, b.rand(9, 13));
    if (p.r < CAMP1.boundRadius + 1.5) colliders.push({ kind: "circle", x: p.x, z: p.z, r: 0.5 });
  }

  // --- Jungle wall: bushes, mid-height foliage, overhang, leaf fans ---
  for (let i = 0; i < CAMP1.bushes.count; i++) {
    const p = ring(CAMP1.bushes.minR, CAMP1.bushes.maxR);
    if (!blocked(p.x, p.z)) bush(b, p.x, p.z, b.rand(1.2, 2.6));
  }
  const fw = CAMP1.foliageWall;
  for (let i = 0; i < fw.count; i++) {
    const p = ring(fw.minR, fw.maxR);
    if (!blocked(p.x, p.z)) foliageMass(b, p.x, b.rand(fw.minY, fw.maxY), p.z, b.rand(2.2, 4.2));
  }
  const oh = CAMP1.overhang;
  for (let i = 0; i < oh.count; i++) {
    const p = ring(oh.minR, oh.maxR);
    foliageMass(b, p.x, b.rand(oh.minY, oh.maxY), p.z, b.rand(3, 5));
  }
  for (let i = 0; i < CAMP1.leafFans.count; i++) {
    const p = ring(CAMP1.leafFans.minR, CAMP1.leafFans.maxR);
    if (!blocked(p.x, p.z)) leafFan(b, p.x, p.z, b.rand(0.9, 1.5));
  }

  // --- Ground clutter ---
  const f = CAMP1.flowers;
  for (let i = 0; i < f.clusters; i++) {
    const c = ring(f.minR, f.maxR);
    if (nearProp(c.x, c.z, 3.2) || blocked(c.x, c.z) || Math.hypot(c.x - CAMP1.spawn.x, c.z - CAMP1.spawn.z) < 2) continue;
    const n = Math.round(b.rand(f.min, f.max + 0.99));
    for (let k = 0; k < n; k++) flower(b, c.x + b.rand(-0.6, 0.6), c.z + b.rand(-0.6, 0.6));
  }
  for (let i = 0; i < CAMP1.mushrooms.count; i++) {
    const p = ring(CAMP1.mushrooms.minR, CAMP1.mushrooms.maxR);
    if (!nearProp(p.x, p.z, 2.5) && !blocked(p.x, p.z)) mushroom(b, p.x, p.z);
  }
  for (let i = 0; i < CAMP1.rocks.count; i++) {
    const p = ring(CAMP1.rocks.minR, CAMP1.rocks.maxR);
    if (nearProp(p.x, p.z, 3.5) || blocked(p.x, p.z)) continue;
    const r = b.rand(0.3, 0.9);
    rock(b, p.x, p.z, r);
    if (r > 0.45) colliders.push({ kind: "circle", x: p.x, z: p.z, r: r * 0.85, h: r });
  }
  for (let i = 0; i < CAMP1.fallenLeaves.count; i++) {
    const p = ring(0, CAMP1.fallenLeaves.maxR);
    if (!blocked(p.x, p.z)) fallenLeaf(b, p.x, p.z);
  }
  for (let i = 0; i < CAMP1.tufts.count; i++) {
    const p = ring(CAMP1.tufts.minR, CAMP1.tufts.maxR);
    if (!nearProp(p.x, p.z, 2.5) && !blocked(p.x, p.z)) tuft(b, p.x, p.z);
  }

  // --- Fireflies (positions only; animated by <Fireflies/>) ---
  const ff = CAMP1.fireflies;
  const fireflies = new Float32Array(ff.max * 4);
  for (let i = 0; i < ff.max; i++) {
    const p = ring(ff.minR, ff.maxR);
    fireflies.set([p.x, b.rand(ff.minY, ff.maxY), p.z, b.rand(0, Math.PI * 2)], i * 4);
  }

  return {
    fireflies,
    labels: props.map((p) => ({ text: p.label, pos: [p.x, p.labelY, p.z] as [number, number, number] })),
  };
}
