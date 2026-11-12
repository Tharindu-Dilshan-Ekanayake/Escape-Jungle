import type { PartBuilder, V3 } from "../geo/PartBuilder";
import type { ToolKey } from "../../game/economy/economy";

/**
 * One shape per tool, each with its own silhouette: sickle, machete, shears,
 * scythe, axe, glaive and a motor grass cutter with a spinning disc.
 * Tool space: grip at the origin, tool up +Y, cutting side toward -Z, blade
 * thickness along X. Built from PartBuilder primitives (no randomness, so a
 * shop board never shifts the world's random layout). Used by the first-person
 * viewmodel, other players' hands and the shop boards.
 */
export interface ToolParts {
  /** Shiny parts (blades, metal heads). */
  metal: PartBuilder;
  /** Handles, shafts, rubber and plastic. */
  wood: PartBuilder;
  /** The grass cutter's disc (its own mesh in the viewmodel so it can spin). */
  spin: PartBuilder;
}

export interface ToolShapeInfo {
  /** Two tool-space points the swing trail follows (none = no trail). */
  trail?: [V3, V3];
  /** Disc centre and tilt (rotation about X) for the spinning part. */
  spinner?: { pos: V3; rx: number };
}

type YZ = [number, number];

/** Flat strip a -> c in the Y-Z plane (width in that plane, thickness along X). */
function segYZ(b: PartBuilder, a: YZ, c: YZ, w: number, t: number, x: number, color: string, top?: string, glow?: boolean) {
  const dy = c[0] - a[0];
  const dz = c[1] - a[1];
  b.box([t, Math.hypot(dy, dz), w], { pos: [x, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2], rot: [Math.atan2(dz, dy), 0, 0], color, top, glow });
}

/** Flat strip a -> c in 3D: width sideways (horizontal), thickness "up". */
function beam(b: PartBuilder, a: V3, c: V3, w: number, t: number, color: string, top?: string) {
  const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  b.box([w, t, len], { pos: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], rot: [Math.asin(-d[1] / len), Math.atan2(d[0], d[2]), 0], color, top });
}

/** Round rod from a (radius r0) to c (radius r1). */
function rod(b: PartBuilder, a: V3, c: V3, r0: number, r1: number, seg: number, color: string, top?: string) {
  const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  b.cyl(r1, r0, len, seg, { pos: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], rot: [Math.acos(d[1] / len), Math.atan2(d[0], d[2]), 0], color, top });
}

/** Wrapped grip around the origin: core + rings. */
function grip(b: PartBuilder, h: number, r: number, core: string, ring: string, rings: number) {
  b.cyl(r * 0.92, r, h, 8, { pos: [0, 0, 0], color: core });
  for (let i = 0; i < rings; i++) b.cyl(r * 1.1, r * 1.1, 0.018, 8, { pos: [0, -h / 2 + 0.04 + (i * (h - 0.08)) / Math.max(1, rings - 1), 0], color: ring });
}

/** Points along a circle arc in the Y-Z plane. */
function arc(cy: number, cz: number, r: number, from: number, to: number, n: number): YZ[] {
  const pts: YZ[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    pts.push([cy + Math.sin(a) * r, cz + Math.cos(a) * r]);
  }
  return pts;
}

const D = Math.PI / 180;

function sickle(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  grip(w, 0.34, 0.032, "#6b4423", "#cdb98e", 5);
  w.cyl(0.03, 0.04, 0.035, 8, { pos: [0, -0.185, 0], color: "#4a2e16" });
  m.cyl(0.034, 0.034, 0.04, 8, { pos: [0, 0.185, 0], color: "#5e564e", top: "#938a7e" });
  segYZ(m, [0.2, 0], [0.3, -0.026], 0.03, 0.012, 0, "#6e665d");
  // Crescent: up over the top and down in front, the inner edge sharpened.
  const pts = arc(0.46, -0.13, 0.19, -57 * D, 200 * D, 12);
  for (let i = 0; i < pts.length - 1; i++) {
    const k = i / (pts.length - 1);
    const wd = 0.052 - k * 0.04;
    segYZ(m, pts[i], pts[i + 1], wd, 0.011, 0, "#7d756b", "#a8a092");
    // Bright edge on the inside of the curve.
    const mid: YZ = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    const ty = (0.46 - mid[0]) / 0.19;
    const tz = (-0.13 - mid[1]) / 0.19;
    const off = wd * 0.42;
    segYZ(m, [pts[i][0] + ty * off, pts[i][1] + tz * off], [pts[i + 1][0] + ty * off, pts[i + 1][1] + tz * off], 0.012, 0.012, 0, "#ddd4c4");
    if (i % 3 === 1) for (const sx of [-1, 1]) m.box([0.002, 0.03, 0.024], { pos: [sx * 0.0065, mid[0], mid[1]], color: "#a65a26" });
  }
  return { trail: [[0, 0.5, -0.02], [0, 0.62, -0.28]] };
}

function machete(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  grip(w, 0.32, 0.032, "#1d1d1f", "#3a3a40", 4);
  m.box([0.05, 0.03, 0.15], { pos: [0, 0.165, -0.006], color: "#b8322a", top: "#e0483c" });
  segYZ(m, [0.18, 0.005], [0.8, -0.01], 0.1, 0.008, 0, "#7d8994", "#d9e2ea");
  segYZ(m, [0.18, -0.05], [0.8, -0.065], 0.016, 0.009, 0, "#ffffff");
  segYZ(m, [0.78, -0.02], [0.88, -0.05], 0.06, 0.008, 0, "#9aa6b1", "#eef4f8");
  return { trail: [[0, 0.42, -0.03], [0, 0.84, -0.035]] };
}

function shears(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  // Two green handles (one in the hand, its twin beside it) meeting at a gold pivot.
  w.cyl(0.026, 0.03, 0.37, 8, { pos: [0, 0.015, 0], color: "#3f8f4f", top: "#5fbf6a" });
  rod(w, [0.012, -0.15, 0.08], [0.012, 0.22, 0.012], 0.03, 0.026, 8, "#3f8f4f", "#5fbf6a");
  w.cyl(0.034, 0.034, 0.03, 8, { pos: [0, -0.17, 0], color: "#2f6f3a" });
  w.cyl(0.034, 0.034, 0.03, 8, { pos: [0.012, -0.16, 0.082], rot: [-0.18, 0, 0], color: "#2f6f3a" });
  m.cyl(0.03, 0.03, 0.05, 8, { pos: [0.006, 0.255, 0.008], rot: [0, 0, Math.PI / 2], color: "#e0b04a", top: "#f2d06a" });
  // Two long blades, slightly open.
  for (const [x, tipZ] of [[0.008, -0.16], [-0.008, 0.15]] as const) {
    segYZ(m, [0.24, 0.006], [0.6, (0.006 + tipZ) * 0.55], 0.075, 0.009, x, "#8a96a1", "#d9e2ea");
    segYZ(m, [0.6, (0.006 + tipZ) * 0.55], [0.88, tipZ], 0.045, 0.009, x, "#9aa6b1", "#eef4f8");
    segYZ(m, [0.88, tipZ], [0.93, tipZ - Math.sign(tipZ) * 0.005], 0.016, 0.008, x, "#ffffff");
  }
  return { trail: [[0, 0.45, -0.06], [0, 0.88, -0.16]] };
}

function scythe(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  w.cyl(0.026, 0.03, 1.72, 7, { pos: [0, 0.11, 0], color: "#5a3a1e", top: "#7a5230" });
  w.cyl(0.034, 0.034, 0.2, 8, { pos: [0, 0, 0], color: "#2f6a42", top: "#3f8a52" });
  rod(w, [0, 0.45, 0], [0.13, 0.45, 0.02], 0.018, 0.016, 6, "#7a5230");
  w.ico(0.026, 0, { pos: [0.14, 0.45, 0.02], color: "#2f6a42" });
  m.cyl(0.036, 0.036, 0.05, 8, { pos: [0, 0.94, 0], color: "#2f5a4a", top: "#5f9a84" });
  // Long blade swept forward and curving sideways, flat across the snath.
  const pts: V3[] = [[0, 0.97, -0.02], [0.01, 0.985, -0.14], [0.03, 0.98, -0.26], [0.06, 0.955, -0.38], [0.1, 0.91, -0.5], [0.15, 0.85, -0.6], [0.2, 0.78, -0.66]];
  const wd = [0.09, 0.085, 0.075, 0.064, 0.05, 0.034, 0.016];
  // On a board / in another player's hand the blade is turned into the tool's plane so it shows.
  if (m === w) {
    for (let i = 0; i < pts.length - 1; i++) {
      segYZ(m, [pts[i][1], pts[i][2]], [pts[i + 1][1], pts[i + 1][2]], wd[i], 0.01, 0, "#8fd0b4", "#c8f4e0");
      segYZ(m, [pts[i][1] - wd[i] * 0.45, pts[i][2]], [pts[i + 1][1] - wd[i + 1] * 0.45, pts[i + 1][2]], 0.014, 0.012, 0, "#e8fff4");
    }
    return { trail: [[0, 0.98, -0.15], [0.15, 0.85, -0.6]] };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    beam(m, pts[i], pts[i + 1], wd[i], 0.009, "#8fd0b4", "#c8f4e0");
    const a = pts[i];
    const c = pts[i + 1];
    const s = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const ox = ((c[2] - a[2]) / s) * wd[i] * 0.45;
    const oz = (-(c[0] - a[0]) / s) * wd[i] * 0.45;
    beam(m, [a[0] - ox, a[1], a[2] - oz], [c[0] - ox, c[1], c[2] - oz], 0.012, 0.01, "#e8fff4");
  }
  rod(m, [0, 0.82, 0], [0.01, 0.97, -0.12], 0.006, 0.006, 4, "#2f5a4a");
  return { trail: [[0, 0.98, -0.15], [0.15, 0.85, -0.6]] };
}

function axe(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  w.cyl(0.026, 0.031, 0.96, 8, { pos: [0, 0.27, 0], color: "#2a1c16", top: "#3a2a20" });
  for (let i = 0; i < 4; i++) w.cyl(0.035, 0.035, 0.022, 8, { pos: [0, -0.12 + i * 0.06, 0], color: i % 2 ? "#a82a22" : "#d63a2f" });
  w.cyl(0.03, 0.038, 0.035, 8, { pos: [0, -0.205, 0], color: "#1a1210" });
  // Gold head: eye, cheek, a flared bit with a bright edge, and a back spike.
  m.box([0.07, 0.13, 0.11], { pos: [0, 0.66, -0.005], color: "#b07a18", top: "#e0a82a" });
  m.box([0.05, 0.11, 0.08], { pos: [0, 0.66, -0.09], color: "#c8901e", top: "#f2c230" });
  for (const end of [[0.81, -0.25], [0.66, -0.27], [0.51, -0.25]] as YZ[]) segYZ(m, [0.66, -0.1], end, 0.1, 0.03, 0, "#d89a22", "#ffe27a");
  const edge: YZ[] = [[0.84, -0.235], [0.74, -0.285], [0.58, -0.285], [0.48, -0.235]];
  for (let i = 0; i < edge.length - 1; i++) segYZ(m, edge[i], edge[i + 1], 0.03, 0.022, 0, "#fff6c8");
  m.cyl(0, 0.032, 0.1, 6, { pos: [0, 0.66, 0.1], rot: [Math.PI / 2, 0, 0], color: "#b07a18", top: "#e0a82a" });
  for (const sx of [-1, 1]) m.ico(0.018, 0, { pos: [sx * 0.037, 0.66, -0.005], color: "#d63a2f" });
  return { trail: [[0, 0.6, -0.15], [0, 0.8, -0.27]] };
}

function glaive(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w } = p;
  w.cyl(0.024, 0.028, 1.36, 8, { pos: [0, 0.07, 0], color: "#dfe7ee", top: "#ffffff" });
  w.cyl(0.032, 0.032, 0.22, 8, { pos: [0, 0, 0], color: "#9ad8f0", top: "#c8ecf8" });
  for (const y of [-0.3, 0.2, 0.45, 0.68]) w.cyl(0.032, 0.032, 0.03, 8, { pos: [0, y, 0], color: "#7a5cd6", top: "#a88cff" });
  w.cyl(0.028, 0, 0.09, 8, { pos: [0, -0.66, 0], color: "#7a5cd6" });
  m.cyl(0.046, 0.04, 0.05, 8, { pos: [0, 0.77, 0], color: "#7a5cd6", top: "#a88cff" });
  // Long crystal blade curving forward, a back hook, glowing shards at its root.
  const pts: YZ[] = [[0.79, 0], [0.97, -0.03], [1.14, -0.08], [1.28, -0.15], [1.38, -0.24]];
  const wd = [0.1, 0.11, 0.09, 0.06, 0.022];
  for (let i = 0; i < pts.length - 1; i++) {
    segYZ(m, pts[i], pts[i + 1], wd[i], 0.014, 0, "#4aa8d8", "#c8f4ff");
    segYZ(m, [pts[i][0], pts[i][1] - wd[i] * 0.45], [pts[i + 1][0], pts[i + 1][1] - wd[i + 1] * 0.45], 0.012, 0.016, 0, "#e8fbff", undefined, true);
  }
  segYZ(m, [0.88, 0.02], [0.97, 0.085], 0.03, 0.012, 0, "#4aa8d8", "#c8f4ff");
  for (const sx of [-1, 1]) m.ico(0.03, 0, { pos: [sx * 0.03, 0.81, 0.015], scale: [0.6, 1.7, 0.6], color: "#8ff0ff", glow: true });
  return { trail: [[0, 0.88, -0.02], [0, 1.36, -0.22]] };
}

/** Motor brush cutter: D-handle grip, long shaft, orange engine behind, spinning toothed disc in front. */
function grassCutter(p: ToolParts): ToolShapeInfo {
  const { metal: m, wood: w, spin: s } = p;
  grip(w, 0.26, 0.033, "#1d1d1f", "#3a3a40", 4);
  w.box([0.02, 0.06, 0.022], { pos: [0, 0.06, -0.036], color: "#ff6a1a" });
  for (const y of [0.14, -0.14]) w.box([0.085, 0.03, 0.03], { pos: [0.038, y, 0], color: "#2a2a2a" });
  const A: V3 = [0.075, -0.5, 0.17];
  const B: V3 = [0.075, 1.0, -0.23];
  rod(m, A, B, 0.022, 0.02, 8, "#8c949c", "#d0d8de");
  rod(w, [0.075, -0.08, 0.06], [0.075, 0.24, -0.025], 0.026, 0.026, 8, "#ff6a1a", "#ffb347");
  // Engine at the back end.
  w.box([0.17, 0.17, 0.21], { pos: [0.075, -0.56, 0.21], color: "#e8560f", top: "#ff8a3a" });
  w.box([0.13, 0.07, 0.13], { pos: [0.075, -0.68, 0.21], color: "#e8e4dc" });
  w.cyl(0.06, 0.06, 0.03, 10, { pos: [0.17, -0.56, 0.21], rot: [0, 0, Math.PI / 2], color: "#1a1a1a" });
  w.cyl(0.02, 0.02, 0.08, 6, { pos: [0.075, -0.52, 0.33], rot: [Math.PI / 2, 0, 0], color: "#3a3a3a" });
  w.box([0.03, 0.03, 0.03], { pos: [0.075, -0.47, 0.21], color: "#7dff6a", glow: true });
  // Gearbox head and an orange guard half over the disc.
  const C: V3 = [0.075, 1.07, -0.33];
  const rx = -0.95;
  m.cyl(0.042, 0.04, 0.1, 8, { pos: [0.075, 1.02, -0.26], rot: [-0.5, 0, 0], color: "#5a5f66", top: "#8c949c" });
  // First person: the disc is its own spinning mesh, tilted by rx. On a board or in another
  // player's hand it is baked in, turned flat-on to the side (facing you on the board).
  const own = s !== w && s !== m;
  const n: V3 = own ? [0, Math.cos(rx), Math.sin(rx)] : [-1, 0, 0];
  const guardRot: V3 = own ? [rx, 0, 0] : [0, 0, Math.PI / 2];
  w.cyl(0.17, 0.17, 0.012, 12, { pos: [C[0] + n[0] * 0.03, C[1] + n[1] * 0.03 + 0.05, C[2] + n[2] * 0.03 + 0.06], rot: guardRot, color: "#ff6a1a", top: "#ffb347" });
  const at = (x: number, y: number, z: number): V3 => (own ? [x, y, z] : [C[0] - y, C[1] + x, C[2] + z]);
  const rot: V3 = own ? [0, 0, 0] : [0, 0, Math.PI / 2];
  s.cyl(0.18, 0.18, 0.008, 14, { pos: at(0, 0, 0), rot, color: "#b8c0c8", top: "#eef4f8" });
  s.box([0.32, 0.011, 0.03], { pos: at(0, 0, 0), rot, color: "#5a5f66" });
  s.cyl(0.045, 0.045, 0.026, 8, { pos: at(0, 0, 0), rot, color: "#2a2a2a" });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s.box([0.03, 0.01, 0.03], { pos: at(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19), rot, color: "#ffffff" });
  }
  return { spinner: { pos: C, rx } };
}

const SHAPES: Record<ToolKey, (p: ToolParts) => ToolShapeInfo> = { sickle, machete, shears, scythe, axe, glaive, grassCutter };

export function buildToolShape(key: ToolKey, parts: ToolParts): ToolShapeInfo {
  return SHAPES[key](parts);
}

/** Tool-space height range (for fitting a tool on a shop board). */
export const TOOL_SPAN: Record<ToolKey, [number, number]> = {
  sickle: [-0.2, 0.66],
  machete: [-0.17, 0.88],
  shears: [-0.19, 0.93],
  scythe: [-0.75, 0.99],
  axe: [-0.22, 0.85],
  glaive: [-0.71, 1.4],
  grassCutter: [-0.72, 1.25],
};
