import type { PartBuilder } from "../geo/PartBuilder";
import type { TreeKind } from "../../config/zones1";
import { PALETTE as P } from "../../config/palette";
import { tree as broadleaf } from "./nature";

/** Zone tree species (world space). Each returns its trunk radius (for colliders/clearance). */

/** Tree fern: thin shaggy trunk with a crown of long arching fronds. */
function treeFern(b: PartBuilder, x: number, z: number, h: number): number {
  const r = 0.28;
  b.cyl(r * 0.8, r, h, 6, { pos: [x, h / 2, z], color: "#5a4632", top: "#7a5f42", jitter: 0.1 });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + b.rand(0, 0.4);
    b.leaf(b.rand(3, 4.2), b.rand(0.8, 1.1), { pos: [x, h, z], rot: [b.rand(-0.2, 0.25), a, 0], color: "#2f7f35", top: "#6fcf5a", jitter: 0.1 });
  }
  return r;
}

/** Mangrove: arching stilt roots, short trunk, wide flat canopy. */
function mangrove(b: PartBuilder, x: number, z: number, h: number): number {
  const r = 0.4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + b.rand(0, 0.5);
    b.cyl(0.07, 0.1, 2.2, 5, { pos: [x + Math.cos(a) * 0.9, 0.9, z + Math.sin(a) * 0.9], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], color: "#6b5a44" });
  }
  b.cyl(r * 0.8, r, h * 0.6, 7, { pos: [x, 1.6 + h * 0.3, z], color: "#6b5a44", top: "#85704f" });
  for (let i = 0; i < 4; i++) {
    b.ico(b.rand(2.4, 3.4), 1, {
      pos: [x + b.rand(-2, 2), 1.6 + h * 0.6 + b.rand(-0.3, 0.5), z + b.rand(-2, 2)],
      scale: [1.3, 0.45, 1.3],
      color: "#2f6b3a",
      top: "#5aa04a",
      jitter: 0.12,
    });
  }
  return r;
}

/** Bamboo clump: a ring of tall segmented culms with leaf sprays. */
function bambooClump(b: PartBuilder, x: number, z: number, h: number): number {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = b.rand(0, Math.PI * 2);
    const d = b.rand(0, 0.8);
    const cx = x + Math.cos(a) * d;
    const cz = z + Math.sin(a) * d;
    const ch = h * b.rand(0.75, 1.05);
    const lean: [number, number, number] = [b.rand(-0.08, 0.08), 0, b.rand(-0.08, 0.08)];
    b.cyl(0.11, 0.13, ch, 5, { pos: [cx, ch / 2, cz], rot: lean, color: "#8fc63c", top: "#c2e65a", jitter: 0.08 });
    // Three square node rings (cheap; they read as segments from any distance).
    for (let s = 1; s < 4; s++) b.cyl(0.15, 0.15, 0.08, 4, { pos: [cx, (ch * s) / 4, cz], rot: lean, color: "#6f9a2a" });
    for (let k = 0; k < 3; k++) {
      b.leaf(b.rand(1.2, 1.8), 0.35, { pos: [cx, ch * b.rand(0.7, 0.98), cz], rot: [b.rand(0.2, 0.6), b.rand(0, 6.28), 0], color: "#6fae3a", top: "#a6d84a" });
    }
  }
  return 0.9;
}

/** Banana palm: curved trunk, huge drooping leaves, a bunch of fruit. */
function bananaPalm(b: PartBuilder, x: number, z: number, h: number): number {
  const r = 0.3;
  const segs = 4;
  const bend = b.rand(0, Math.PI * 2);
  for (let s = 0; s < segs; s++) {
    const t = s / segs;
    const off = t * t * 0.8;
    b.cyl(r * (1 - t * 0.3), r * (1 - t * 0.2), h / segs + 0.05, 7, {
      pos: [x + Math.cos(bend) * off, (h / segs) * (s + 0.5), z + Math.sin(bend) * off],
      rot: [Math.sin(bend) * 0.12 * s, 0, -Math.cos(bend) * 0.12 * s],
      color: "#7a6a44",
      top: "#9a8a5a",
    });
  }
  const tx = x + Math.cos(bend) * 0.8;
  const tz = z + Math.sin(bend) * 0.8;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + b.rand(0, 0.4);
    b.leaf(b.rand(3.2, 4.4), b.rand(1.3, 1.7), { pos: [tx, h, tz], rot: [b.rand(0.15, 0.55), a, 0], color: "#4aa83f", top: "#8fdc5a", jitter: 0.1 });
  }
  for (let i = 0; i < 5; i++) {
    b.cyl(0.05, 0.07, 0.4, 5, { pos: [tx + b.rand(-0.25, 0.25), h - 0.5 - i * 0.1, tz + b.rand(-0.25, 0.25)], rot: [0.3, b.rand(0, 6), 0], color: "#e8c23a", top: "#c6e05a" });
  }
  return r;
}

/** Blossom tree: dark trunk, round pink/purple flowering canopy. */
function blossom(b: PartBuilder, x: number, z: number, h: number): number {
  const r = 0.35;
  b.cyl(r * 0.6, r, h * 0.55, 7, { pos: [x, h * 0.275, z], color: "#5a3a2a", top: "#7a4f3a" });
  for (let i = 0; i < 3; i++) {
    const a = b.rand(0, Math.PI * 2);
    b.cyl(0.08, 0.14, h * 0.35, 5, { pos: [x + Math.cos(a) * 0.5, h * 0.62, z + Math.sin(a) * 0.5], rot: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], color: "#5a3a2a" });
  }
  const pinks = ["#ff8ec6", "#f7a8d8", "#d88cff", "#ffb3c8"];
  for (let i = 0; i < 6; i++) {
    b.ico(b.rand(1.4, 2.3), 1, {
      pos: [x + b.rand(-1.8, 1.8), h * 0.75 + b.rand(-0.4, 1.2), z + b.rand(-1.8, 1.8)],
      scale: [1, 0.8, 1],
      color: pinks[i % pinks.length],
      top: "#ffe3f1",
      jitter: 0.1,
    });
  }
  return r;
}

/** Place a tree of the given species; returns its trunk radius. */
export function zoneTree(kind: TreeKind, b: PartBuilder, x: number, z: number): number {
  switch (kind) {
    case "broadleaf": {
      const r = b.rand(0.45, 0.85);
      broadleaf(b, x, z, b.rand(12, 18), r);
      return r;
    }
    case "treeFern":
      return treeFern(b, x, z, b.rand(4.5, 7));
    case "mangrove":
      return mangrove(b, x, z, b.rand(5, 7));
    case "bambooClump":
      return bambooClump(b, x, z, b.rand(8, 12));
    case "bananaPalm":
      return bananaPalm(b, x, z, b.rand(5, 7.5));
    case "blossom":
      return blossom(b, x, z, b.rand(6, 9));
  }
}

/** Ground-cover colour accents per species (fallen petals/leaves). */
export const TREE_LITTER: Record<TreeKind, readonly string[]> = {
  broadleaf: P.fallenLeaves,
  treeFern: ["#4a7a2a", "#6b8a3a"],
  mangrove: ["#5a6a3a", "#7a6a4a"],
  bambooClump: ["#c2b05a", "#a69a4a"],
  bananaPalm: ["#8a6a2a", "#c6a03a"],
  blossom: ["#ff8ec6", "#f7a8d8", "#d88cff"],
};
