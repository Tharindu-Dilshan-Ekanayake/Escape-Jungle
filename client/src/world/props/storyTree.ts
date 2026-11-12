import type { PartBuilder } from "../geo/PartBuilder";
import { PALETTE as P } from "../../config/palette";

/**
 * Storybook tree: a chunky warm-brown trunk with root flares and twisting bark
 * ridges, thick branches curving out from the crown, each ending in a "leaf
 * puff" (a dome of big overlapping leaves with a scalloped rim and a sunlit
 * top). Some trees bloom pink or orange. ~750 triangles, baked into the
 * merged chunk meshes (no extra draw calls). World space (works inside push()).
 */
const BARKS = [
  { bark: "#6e4326", top: "#a26a40", ridge: "#55331c" },
  { bark: "#7a5232", top: "#b07a4c", ridge: "#5f3d22" },
  { bark: "#5f3e26", top: "#8f6440", ridge: "#46301c" },
];

interface LeafColors {
  dark: string;
  mid: string;
  light: string;
  sun: string;
}

const LEAVES: LeafColors[] = [
  { dark: "#2f8a2a", mid: "#4fb32e", light: "#8fe03a", sun: "#c8f55a" },
  { dark: "#1f7a3a", mid: "#33a04a", light: "#6fd05a", sun: "#a8ec7a" },
  { dark: "#3f8a1f", mid: "#6ab82a", light: "#b0e03a", sun: "#e0f56a" },
  { dark: "#1d6f55", mid: "#2a9a6a", light: "#5fd09a", sun: "#a0f0c0" },
];

const BLOOMS: LeafColors[] = [
  { dark: "#b8507a", mid: "#e070a0", light: "#ff9ac4", sun: "#ffd6e8" },
  { dark: "#c86a24", mid: "#ec8f38", light: "#ffb85a", sun: "#ffe2a8" },
];

const TAU = Math.PI * 2;

/** Dome of big overlapping leaves: a rim drooping outward, a smaller bright ring on top, a rounded cap. */
export function leafPuff(b: PartBuilder, x: number, y: number, z: number, s: number, c: LeafColors) {
  // Rounded dome in the middle.
  b.ico(s * 0.72, 0, { pos: [x, y + s * 0.18, z], scale: [1, 0.62, 1], rot: [0, b.rand(0, 3), 0], color: c.dark, top: c.light, jitter: 0.08 });
  const a0 = b.rand(0, TAU);
  // Skirt: short wide leaves hanging down all round the dome's edge.
  for (let i = 0; i < 7; i++) {
    const a = a0 + (i / 7) * TAU;
    b.leaf(s * 0.62, s * 0.78, { pos: [x + Math.sin(a) * s * 0.42, y + s * 0.2, z + Math.cos(a) * s * 0.42], rot: [0.85, a, 0], color: c.dark, top: c.mid, jitter: 0.08 });
  }
  // Upper ring: overlapping leaves laid over the dome, bright on top.
  for (let i = 0; i < 4; i++) {
    const a = a0 + 0.45 + (i / 4) * TAU;
    b.leaf(s * 0.55, s * 0.72, { pos: [x + Math.sin(a) * s * 0.12, y + s * 0.55, z + Math.cos(a) * s * 0.12], rot: [0.5, a, 0], color: c.mid, top: c.sun });
  }
}

/** Cylinder from (x, y, z) leaning toward heading `a` by `t` rad from vertical; returns its far end. */
function limb(b: PartBuilder, x: number, y: number, z: number, a: number, t: number, len: number, r0: number, r1: number, color: string, top: string) {
  b.push([x, y, z], a);
  b.cyl(r1, r0, len, 6, { pos: [0, (Math.cos(t) * len) / 2, (Math.sin(t) * len) / 2], rot: [t, 0, 0], color, top });
  b.pop();
  return { x: x + Math.sin(a) * Math.sin(t) * len, y: y + Math.cos(t) * len, z: z + Math.cos(a) * Math.sin(t) * len };
}

/** Dark, creepy variant: near-black bark, deep green leaves, no blossoms (the forest round the Landing Site). */
const DARK_BARK = { bark: "#33241a", top: "#4a3424", ridge: "#22170f" };
const DARK_LEAVES: LeafColors[] = [
  { dark: "#0f3320", mid: "#17462a", light: "#22603a", sun: "#3a7a44" },
  { dark: "#143a26", mid: "#1d4f33", light: "#2a6a40", sun: "#45864c" },
];

export function storyTree(b: PartBuilder, x: number, z: number, h: number, r: number, opts: { stones?: boolean; dark?: boolean } = {}) {
  const bark = opts.dark ? DARK_BARK : BARKS[Math.floor(b.rand(0, BARKS.length))];
  const leaves = opts.dark ? DARK_LEAVES[Math.floor(b.rand(0, DARK_LEAVES.length))] : b.rand() < 0.22 ? BLOOMS[Math.floor(b.rand(0, BLOOMS.length))] : LEAVES[Math.floor(b.rand(0, LEAVES.length))];
  const tr = r * 1.15;
  const crown = h * 0.62;
  // Lower trunk with root flares and twisting bark ridges.
  const l1 = crown * 0.55;
  b.cyl(tr * 0.8, tr * 1.12, l1, 7, { pos: [x, l1 / 2, z], color: bark.bark, top: bark.top, jitter: 0.08 });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + b.rand(0, 0.6);
    b.box([tr * 0.5, tr * 1.6, tr * 1.9], { pos: [x + Math.sin(a) * tr * 1.05, tr * 0.55, z + Math.cos(a) * tr * 1.05], rot: [0.5, a, 0], color: bark.bark, top: bark.top });
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + b.rand(0, 1);
    b.box([tr * 0.28, l1 * 0.9, tr * 0.28], { pos: [x + Math.sin(a) * tr * 0.88, l1 * 0.5, z + Math.cos(a) * tr * 0.88], rot: [0, a, 0.2], color: bark.ridge });
  }
  // Upper trunk leans a little (the classic storybook S-bend).
  const top = limb(b, x, l1 - 0.1, z, b.rand(0, TAU), b.rand(0.12, 0.28), crown - l1 + 0.1, tr * 0.82, tr * 0.58, bark.bark, bark.top);
  // Main branches out of the crown, each with a leaf puff.
  const n = Math.round(b.rand(3, 4.4));
  const a0 = b.rand(0, TAU);
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * TAU + b.rand(-0.3, 0.3);
    const e = limb(b, top.x, top.y - 0.2, top.z, a, b.rand(0.75, 1.1), h * b.rand(0.2, 0.3), tr * 0.45, tr * 0.2, bark.bark, bark.top);
    leafPuff(b, e.x, e.y + 0.2, e.z, h * b.rand(0.2, 0.26), leaves);
  }
  // Crown: a big puff on top and a second one tucked beside it.
  leafPuff(b, top.x, top.y + h * 0.1, top.z, h * 0.27, leaves);
  const ca = b.rand(0, TAU);
  leafPuff(b, top.x + Math.sin(ca) * h * 0.12, top.y + h * 0.02, top.z + Math.cos(ca) * h * 0.14, h * 0.21, leaves);
  // A lower side branch on most trees breaks up the straight trunk.
  if (b.rand() < 0.6) {
    const e = limb(b, x, l1 * 0.85, z, b.rand(0, TAU), 1.15, h * 0.18, tr * 0.35, tr * 0.16, bark.bark, bark.top);
    leafPuff(b, e.x, e.y + 0.1, e.z, h * 0.16, leaves);
  }
  if (opts.stones) {
    for (let k = 0; k < 2; k++) {
      const a = b.rand(0, TAU);
      const sr = b.rand(0.28, 0.45);
      b.dodeca(sr, { pos: [x + Math.sin(a) * tr * 1.9, sr * 0.3, z + Math.cos(a) * tr * 1.9], scale: [1.2, 0.6, 1], rot: [0, b.rand(0, 3), 0], color: P.rock, top: P.rockTop });
    }
  }
}
