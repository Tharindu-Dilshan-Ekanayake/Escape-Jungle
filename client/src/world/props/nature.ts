import type { PartBuilder } from "../geo/PartBuilder";
import { PALETTE as P } from "../../config/palette";
import { leafPuff, storyTree } from "./storyTree";

/** Vegetation + ground clutter, authored in world space (no push/pop needed). */

const pick = <T>(b: PartBuilder, list: readonly T[]) => list[Math.floor(b.rand(0, list.length))];

/** Big jungle tree: the storybook tree (chunky trunk, curving branches, leaf puffs). */
export function tree(b: PartBuilder, x: number, z: number, h: number, r: number) {
  storyTree(b, x, z, h, r);
}

/** Jungle undergrowth palettes (dark, lime, blue-green). */
const BUSH_PALETTES = [
  { dark: "#1f6b3a", mid: "#2e8b4a", tip: "#5fbf5a", light: "#8fe07a", sun: "#b8f08a" },
  { dark: "#3f8a24", mid: "#5aa82e", tip: "#a8e05a", light: "#d0f07a", sun: "#e8fa9a" },
  { dark: "#1d5f4a", mid: "#2a8a62", tip: "#4fbf8a", light: "#9fe8c0", sun: "#c0f8d8" },
];
const BLOSSOMS = ["#ff6fae", "#ffd23f", "#ff8c2a", "#ffffff", "#c77dff", "#ff4d5a"];
type BushPal = (typeof BUSH_PALETTES)[number];

/** Fern clump: long fronds arching out and down from the middle. */
function fernClump(b: PartBuilder, x: number, z: number, s: number, c: BushPal) {
  const n = 9 + Math.floor(b.rand(0, 3));
  const a0 = b.rand(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + b.rand(-0.15, 0.15);
    const up = i % 3 === 0;
    b.leaf(s * b.rand(1.2, 1.7), s * 0.36, { pos: [x, s * (up ? 0.15 : 0.05), z], rot: [up ? -0.55 : -0.15 + b.rand(0, 0.25), a, 0], color: c.dark, top: up ? c.light : c.tip, jitter: 0.1 });
  }
}

/** Broad-leaf shrub: two tiers of big wide leaves on short stems. */
function broadShrub(b: PartBuilder, x: number, z: number, s: number, c: BushPal) {
  const a0 = b.rand(0, Math.PI * 2);
  for (let i = 0; i < 8; i++) {
    const a = a0 + (i / 8) * Math.PI * 2 + b.rand(-0.2, 0.2);
    const hi = i % 2 === 0;
    b.leaf(s * (hi ? 1.0 : 1.25), s * (hi ? 0.75 : 0.9), { pos: [x, s * (hi ? 0.75 : 0.35), z], rot: [hi ? -0.25 : 0.15, a, 0], color: hi ? c.mid : c.dark, top: hi ? c.light : c.tip, jitter: 0.1 });
  }
  b.cyl(0.04 * s, 0.06 * s, s * 0.8, 4, { pos: [x, s * 0.4, z], color: "#4a6a2a" });
}

/** Dwarf fan palm: fan leaves on thin stalks rising from the middle. */
function fanPalm(b: PartBuilder, x: number, z: number, s: number, c: BushPal) {
  const a0 = b.rand(0, Math.PI * 2);
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i / 5) * Math.PI * 2;
    const h = s * b.rand(0.9, 1.4);
    const tx = x + Math.cos(a) * s * 0.35;
    const tz = z + Math.sin(a) * s * 0.35;
    b.cyl(0.02 * s, 0.03 * s, h, 3, { pos: [(x + tx) / 2, h / 2, (z + tz) / 2], rot: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], color: "#5a7a3a" });
    for (const k of [-0.35, 0.35]) b.leaf(s * 0.8, s * 0.32, { pos: [tx, h, tz], rot: [-0.2, Math.PI / 2 - a + k, 0], color: c.mid, top: c.light });
  }
}

/** Round leafy clump: a dome of overlapping leaves (storybook look), sometimes in flower. */
function leafyClump(b: PartBuilder, x: number, z: number, s: number, c: BushPal) {
  leafPuff(b, x, s * 0.25, z, s * 1.3, c);
  if (b.rand() < 0.35) {
    const col = BLOSSOMS[Math.floor(b.rand(0, BLOSSOMS.length))];
    for (let i = 0; i < 3; i++) {
      const a = b.rand(0, Math.PI * 2);
      b.ico(s * 0.12, 0, { pos: [x + Math.sin(a) * s * 0.7, s * 0.85, z + Math.cos(a) * s * 0.7], color: col });
    }
  }
}

/** Jungle undergrowth: a fern clump, a broad-leaf shrub, a fan palm or a leafy clump. */
export function bush(b: PartBuilder, x: number, z: number, s: number) {
  const pal = BUSH_PALETTES[Math.floor(b.rand(0, BUSH_PALETTES.length))];
  const kind = Math.floor(b.rand(0, 4));
  if (kind === 0) fernClump(b, x, z, s, pal);
  else if (kind === 1) broadShrub(b, x, z, s, pal);
  else if (kind === 2) fanPalm(b, x, z, s, pal);
  else leafyClump(b, x, z, s, pal);
}

/** Leaf mass in the air (foliage wall / canopy overhang): a leafy clump with vines hanging below. */
export function foliageMass(b: PartBuilder, x: number, y: number, z: number, s: number) {
  const pal = BUSH_PALETTES[Math.floor(b.rand(0, BUSH_PALETTES.length))];
  leafPuff(b, x, y - s * 0.3, z, s * 1.25, pal);
  const len = b.rand(1.5, Math.min(5, y - 0.5));
  if (len > 0.8) {
    const vx = x + b.rand(-0.5, 0.5) * s;
    const vz = z + b.rand(-0.5, 0.5) * s;
    b.box([0.06, len, 0.06], { pos: [vx, y - s * 0.3 - len / 2, vz], color: P.vine });
    for (let k = 0; k < 2; k++) b.leaf(0.45, 0.3, { pos: [vx, y - s * 0.3 - len * (0.4 + k * 0.4), vz], rot: [0.7, b.rand(0, 6.28), 0], color: P.vine, top: P.leafTip });
  }
}

/** Fan of big leaves radiating up from the ground. */
export function leafFan(b: PartBuilder, x: number, z: number, s: number) {
  const n = Math.round(b.rand(5, 7.99));
  const start = b.rand(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    b.leaf(s * b.rand(1.4, 2.6), s * b.rand(0.6, 1), {
      pos: [x, 0.05, z],
      rot: [-b.rand(0.45, 0.95), a, 0],
      color: P.canopyMid,
      top: P.leafTip,
      jitter: 0.15,
    });
  }
}

/** A little flower: five real petals round a golden centre, two leaves on the stem. */
export function flower(b: PartBuilder, x: number, z: number) {
  const h = b.rand(0.28, 0.45);
  const col = pick(b, P.flowers);
  b.box([0.035, h, 0.035], { pos: [x, h / 2, z], color: P.grassGreen });
  for (const s of [-1, 1]) b.leaf(0.2, 0.1, { pos: [x, h * (s > 0 ? 0.35 : 0.2), z], rot: [-0.3, b.rand(0, 6.28), 0], color: P.grassGreen, top: P.grassLime });
  const a0 = b.rand(0, Math.PI * 2);
  for (let k = 0; k < 5; k++) b.leaf(0.14, 0.11, { pos: [x, h + 0.02, z], rot: [-0.12, a0 + (k / 5) * Math.PI * 2, 0], color: col, top: "#ffffff" });
  b.ico(0.045, 0, { pos: [x, h + 0.05, z], color: P.flowerCenter });
}

export function mushroom(b: PartBuilder, x: number, z: number) {
  const s = b.rand(0.7, 1.5);
  b.cyl(0.05 * s, 0.06 * s, 0.22 * s, 5, { pos: [x, 0.11 * s, z], color: P.mushroomStem });
  b.cyl(0.03 * s, 0.2 * s, 0.14 * s, 6, { pos: [x, 0.27 * s, z], color: pick(b, P.mushroomCap) });
}

export function rock(b: PartBuilder, x: number, z: number, r: number) {
  b.dodeca(r, {
    pos: [x, r * 0.3, z],
    scale: [1, b.rand(0.5, 0.7), 1],
    rot: [b.rand(0, 1), b.rand(0, 6), 0],
    color: P.rock,
    top: b.rand() > 0.5 ? P.moss : P.rockTop,
    jitter: 0.1,
  });
}

export function fallenLeaf(b: PartBuilder, x: number, z: number) {
  b.leaf(b.rand(0.35, 0.6), b.rand(0.2, 0.32), {
    pos: [x, 0.02, z],
    rot: [b.rand(-0.06, 0.06), b.rand(0, 6.28), 0],
    scale: [1, 0.2, 1],
    color: pick(b, P.fallenLeaves),
  });
}

export function tuft(b: PartBuilder, x: number, z: number) {
  for (let i = 0; i < 3; i++) {
    const h = b.rand(0.3, 0.6);
    b.cyl(0, 0.05, h, 3, {
      pos: [x + b.rand(-0.1, 0.1), h / 2, z + b.rand(-0.1, 0.1)],
      rot: [b.rand(-0.3, 0.3), b.rand(0, 3), b.rand(-0.3, 0.3)],
      color: P.grassGreen,
      top: P.grassLime,
    });
  }
}

/** Tiki torch: bamboo pole, woven basket, unlit flame cones. */
export function torch(b: PartBuilder, x: number, z: number) {
  b.cyl(0.07, 0.08, 2.4, 5, { pos: [x, 1.2, z], color: P.bamboo, top: "#d8b46c" });
  for (const y of [0.6, 1.2, 1.8]) b.cyl(0.09, 0.09, 0.05, 5, { pos: [x, y, z], color: P.bambooRing });
  b.cyl(0.32, 0.12, 0.45, 6, { pos: [x, 2.62, z], color: P.basket, top: "#a06a34" });
  b.cyl(0, 0.22, 0.55, 5, { pos: [x, 3.12, z], color: P.flame, glow: true });
  b.cyl(0, 0.12, 0.4, 5, { pos: [x, 3.05, z], rot: [0, 0.6, 0], color: P.flameCore, glow: true });
}
