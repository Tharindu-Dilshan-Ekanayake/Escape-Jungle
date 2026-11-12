import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import type { BannerSpec } from "../banners/banners";
import { CRASH_CAMP as K } from "../../config/crashCamp";

/**
 * The Landing Site (where everyone came down by parachute) in a strange old
 * jungle: a half-buried stone head with glowing eyes, broken pillars, glowing mushrooms, log seats round
 * the fire, "SOS" in white stones, giant paw prints leading into the trees,
 * and a burst suitcase. All baked
 * into the merged chunk meshes (glow parts go to the glow mesh).
 */
const S = {
  stone: "#7d7f74",
  stoneTop: "#9a9c8e",
  moss: "#4f7a2a",
  mossTop: "#6f9a3a",
  dark: "#2a2a24",
  rune: "#6ff7e0",
  vine: "#2c6a2a",
  vineTop: "#4f9a3a",
  mud: "#4a3424",
  seat: "#2f5f86",
  seatTop: "#4a7fae",
  cover: "#e8e2d2",
  chrome: "#b8c0c8",
  sos: "#ece6d6",
  wing: "#ece2cc",
  stripe: "#e8742a",
  bark: "#5a3a24",
  barkTop: "#7a5232",
  splinter: "#d8c08a",
  scorch: "#2a221c",
};

/** Log seat round the fire (front = +Z). */
function logSeat(b: PartBuilder, colliders: Collider[], x: number, z: number, rot: number) {
  b.push([x, 0, z], rot);
  b.cyl(0.28, 0.3, 1.6, 7, { pos: [0, 0.28, 0], rot: [0, 0, Math.PI / 2], color: S.bark, top: S.barkTop });
  for (const sx of [-0.81, 0.81]) b.cyl(0.24, 0.24, 0.02, 7, { pos: [sx, 0.28, 0], rot: [0, 0, Math.PI / 2], color: S.splinter });
  b.pop();
  colliders.push({ kind: "box", x, z, hx: 0.85, hz: 0.32, cos: Math.cos(rot), sin: Math.sin(rot), h: 0.55 });
}

/** The Landing Site: fallen trunks and a burst suitcase. */
function landingSite(b: PartBuilder, colliders: Collider[]) {
  for (const [x, z, rot, len] of K.fallen) {
    b.push([x, 0, z], rot);
    b.cyl(0.42, 0.5, len, 7, { pos: [0, 0.42, 0], rot: [Math.PI / 2, 0, 0], color: S.bark, top: S.barkTop, jitter: 0.1 });
    for (let i = 0; i < 3; i++) b.leaf(1.2, 0.7, { pos: [b.rand(-0.3, 0.3), 0.6, -len / 2 + i * 0.4], rot: [0.9, b.rand(0, 6), 0], color: "#4f7a2a", top: "#6f9a3a" });
    b.pop();
    colliders.push({ kind: "box", x, z, hx: 0.5, hz: len / 2, cos: Math.cos(rot), sin: Math.sin(rot), h: 0.85 });
  }
  // Burst suitcase with clothes spilled out.
  const bs = K.suitcase;
  b.box([0.75, 0.16, 0.5], { pos: [bs.x, 0.08, bs.z], rot: [0, bs.rot, 0], color: "#9b59d0", top: "#b77be8" });
  b.box([0.75, 0.5, 0.05], { pos: [bs.x - 0.15, 0.3, bs.z - 0.25], rot: [-0.9, bs.rot, 0], color: "#9b59d0" });
  ["#ff6fae", "#ffd23f", "#4cc3f0", "#ffffff"].forEach((c, i) => b.box([0.45, 0.03, 0.35], { pos: [bs.x + 0.5 + i * 0.35, 0.02, bs.z + 0.2 - i * 0.2], rot: [0, i * 0.7, 0], color: c }));
}

/** Mossy stone block (slightly crooked). */
function block(b: PartBuilder, x: number, y: number, z: number, w: number, h: number, d: number, rotY: number) {
  b.box([w, h, d], { pos: [x, y, z], rot: [b.rand(-0.04, 0.04), rotY + b.rand(-0.08, 0.08), b.rand(-0.04, 0.04)], color: S.stone, top: S.stoneTop, jitter: 0.1 });
}

function vines(b: PartBuilder, x: number, y: number, z: number, n: number) {
  for (let i = 0; i < n; i++) b.leaf(b.rand(0.6, 1.0), 0.4, { pos: [x + b.rand(-0.3, 0.3), y - i * 0.55, z + b.rand(-0.3, 0.3)], rot: [0.9, b.rand(0, 6.28), 0], color: S.vine, top: S.vineTop });
}

/** Half-buried giant stone head with glowing eyes, facing the camp. */
function idol(b: PartBuilder, colliders: Collider[]) {
  const { x, z } = K.idol;
  const rot = Math.atan2(-x, -z);
  b.push([x, 0, z], rot);
  b.box([2.3, 2.3, 2.0], { pos: [0, 0.95, 0], rot: [0.08, 0, 0.1], color: S.stone, top: S.moss, jitter: 0.08 });
  b.box([2.4, 0.35, 0.5], { pos: [0, 1.65, 0.9], rot: [0.08, 0, 0.1], color: S.stoneTop });
  for (const sx of [-1, 1]) {
    b.box([0.5, 0.32, 0.12], { pos: [sx * 0.55, 1.35, 1.02], rot: [0.08, 0, 0.1], color: S.dark });
    b.box([0.28, 0.16, 0.1], { pos: [sx * 0.55, 1.35, 1.07], rot: [0.08, 0, 0.1], color: S.rune, glow: true });
  }
  b.box([0.4, 0.6, 0.35], { pos: [0, 0.95, 1.1], rot: [0.08, 0, 0.1], color: S.stoneTop });
  b.box([1.1, 0.14, 0.1], { pos: [0, 0.45, 1.05], rot: [0.08, 0, 0.1], color: S.dark });
  b.box([2.6, 0.25, 2.3], { pos: [0, 0.1, 0], color: S.moss, top: S.mossTop, jitter: 0.1 });
  vines(b, -0.9, 2.0, 0.6, 3);
  b.pop();
  colliders.push({ kind: "circle", x, z, r: 1.45 });
}

/** Broken pillars: standing stumps and one lying in the dirt. */
function pillars(b: PartBuilder, colliders: Collider[]) {
  for (const [x, z, h] of K.pillars) {
    if (h > 0) {
      for (let k = 0; k * 1.0 < h; k++) block(b, x, 0.5 + k * 1.0, z, 0.8, Math.min(1, h - k) - 0.02, 0.8, b.rand(0, 1));
      b.box([0.85, 0.1, 0.85], { pos: [x, h, z], color: S.moss, top: S.mossTop });
      colliders.push({ kind: "circle", x, z, r: 0.55, h: h < 1.4 ? h : undefined });
    } else {
      for (let k = 0; k < 3; k++) b.box([1.0, 0.75, 0.75], { pos: [x + k * 1.05, 0.36, z + k * 0.15], rot: [0, -0.14, b.rand(-0.05, 0.05)], color: S.stone, top: S.moss, jitter: 0.1 });
      colliders.push({ kind: "box", x: x + 1.05, z: z + 0.15, hx: 1.6, hz: 0.45, cos: Math.cos(-0.14), sin: Math.sin(-0.14), h: 0.75 });
    }
  }
}


/** "SOS" in white stones, readable from the sky (letters run west -> east). */
function sos(b: PartBuilder) {
  const { x: cx, z: cz, size: s } = K.sos;
  // Letter strokes as segments in a 1 x 1.6 cell (x right, z down the letter).
  const S1: [number, number, number, number][] = [[1, 0, 0, 0], [0, 0, 0, 0.8], [0, 0.8, 1, 0.8], [1, 0.8, 1, 1.6], [1, 1.6, 0, 1.6]];
  const O1: [number, number, number, number][] = [[0, 0, 1, 0], [1, 0, 1, 1.6], [1, 1.6, 0, 1.6], [0, 1.6, 0, 0]];
  [S1, O1, S1].forEach((segs, li) => {
    const ox = cx + (li - 1) * 1.7 * s - 0.5 * s;
    const oz = cz - 0.8 * s;
    for (const [x0, z0, x1, z1] of segs) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) * 3));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        b.box([0.24 * s, 0.12, 0.2 * s], { pos: [ox + (x0 + (x1 - x0) * t) * s, 0.05, oz + (z0 + (z1 - z0) * t) * s], rot: [0, b.rand(0, 3), 0], color: S.sos, jitter: 0.08 });
      }
    }
  });
}

/** Giant paw prints pressed into the mud, heading out of camp into the trees. */
function pawPrints(b: PartBuilder) {
  const [x0, z0, x1, z1] = K.paws;
  const n = 8;
  const dir = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const side = i % 2 ? 0.45 : -0.45;
    const x = x0 + (x1 - x0) * t + Math.cos(dir) * side;
    const z = z0 + (z1 - z0) * t - Math.sin(dir) * side;
    b.cyl(0.32, 0.34, 0.03, 6, { pos: [x, 0.025, z], scale: [1, 1, 0.85], color: S.mud });
    for (let k = 0; k < 4; k++) {
      const a = dir + (k - 1.5) * 0.45;
      b.ico(0.12, 0, { pos: [x + Math.sin(a) * 0.45, 0.03, z + Math.cos(a) * 0.45], scale: [1, 0.2, 1.2], color: S.mud });
    }
  }
}

export function addCrashCamp(b: PartBuilder, colliders: Collider[]): BannerSpec[] {
  idol(b, colliders);
  pillars(b, colliders);
  for (const [x, z, r] of K.seats) logSeat(b, colliders, x, z, r);
  sos(b);
  pawPrints(b);
  landingSite(b, colliders);
  return [];
}
