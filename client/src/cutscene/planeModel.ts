import type { BufferGeometry } from "three";
import { PartBuilder } from "../world/geo/PartBuilder";
import { mulberry32 } from "../world/geo/rng";

const C = {
  body: "#ffffff",
  bodyTop: "#ffffff",
  belly: "#e6edf2",
  stripe: "#ff6a1a",
  stripe2: "#00a896",
  frame: "#1d3a52",
  window: "#1b3f63",
  windowTop: "#8fd8ff",
  wing: "#f6f6f2",
  wingTop: "#ffffff",
  engine: "#4a5058",
  engineTop: "#9aa2aa",
  chrome: "#c8d0d8",
  prop: "#2a2a2a",
  gear: "#3a3a3a",
  tyre: "#1f1f1f",
  logo: "#ffd23f",
  red: "#ff3b30",
  green: "#3fff6a",
  torn: "#2a2622",
  tornEdge: "#9a958a",
  wire: ["#ff4d3a", "#ffd23f", "#3a8dff"],
};

export type PlanePiece = "nose" | "body" | "wingL" | "wingR";
export const PLANE_PIECES: PlanePiece[] = ["nose", "body", "wingL", "wingR"];

/** Where the fuselage breaks (plane-local z) and the wing roots (|x|). */
export const BREAK_Z = 1.8;
const ROOT_X = 1.15;

export interface PlanePart {
  solid: BufferGeometry;
  glow: BufferGeometry | null;
  /** Piece centre in plane-local space (geometry is re-centred on it). */
  pivot: [number, number, number];
}

const X = Math.PI / 2;

/** Jagged torn metal: a dark hole with ragged skin teeth around it (normal along +-Z). */
function tornRing(b: PartBuilder, z: number, dir: 1 | -1, r = 1.05) {
  b.cyl(r * 0.96, r * 0.96, 0.04, 16, { pos: [0, 0, z], rot: [X, 0, 0], color: C.torn });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const len = b.rand(0.12, 0.42);
    b.box([0.36, 0.06, len], { pos: [Math.cos(a) * r, Math.sin(a) * r, z + dir * len * 0.4], rot: [0, 0, a + X], color: i % 3 ? C.body : C.tornEdge });
  }
  // Loose wires hanging out of the hole.
  for (let i = 0; i < 3; i++) b.box([0.04, 0.04, 0.6], { pos: [-0.3 + i * 0.3, -0.2 - i * 0.12, z + dir * 0.3], rot: [dir * (0.5 + i * 0.2), 0, 0], color: C.wire[i] });
}

/** Ragged wing root (normal along +-X). */
function tornRoot(b: PartBuilder, x: number, dir: 1 | -1) {
  b.box([0.04, 0.2, 2.0], { pos: [x, 0.55, 0.6], color: C.torn });
  for (let i = 0; i < 6; i++) {
    const len = b.rand(0.12, 0.35);
    b.box([len, 0.06, 0.3], { pos: [x + dir * len * 0.4, 0.55 + (i % 2 ? 0.1 : -0.1), -0.25 + i * 0.34], color: i % 2 ? C.wing : C.tornEdge });
  }
}

function windowPane(b: PartBuilder, s: number, z: number) {
  b.box([0.06, 0.44, 0.54], { pos: [s * 1.03, 0.35, z], color: C.frame });
  b.box([0.07, 0.34, 0.44], { pos: [s * 1.035, 0.35, z], color: C.window, top: C.windowTop });
}

function nose(b: PartBuilder) {
  b.cyl(1.05, 1.05, 1.4, 16, { pos: [0, 0, 2.5], rot: [X, 0, 0], color: C.belly, top: C.bodyTop });
  b.cyl(0.38, 1.05, 1.7, 16, { pos: [0, -0.05, 4.05], rot: [X, 0, 0], color: C.body, top: C.bodyTop });
  b.cyl(0.0, 0.39, 0.5, 16, { pos: [0, -0.05, 5.15], rot: [X, 0, 0], color: C.stripe, top: "#ff9a52" });
  b.cyl(1.075, 1.075, 0.3, 16, { pos: [0, 0, 3.0], rot: [X, 0, 0], color: C.stripe2 });
  for (const s of [-1, 1]) {
    b.box([0.05, 0.28, 1.6], { pos: [s * 1.03, -0.12, 2.6], color: C.stripe });
    b.box([0.05, 0.08, 1.6], { pos: [s * 1.035, 0.08, 2.6], color: C.stripe2 });
    windowPane(b, s, 2.25);
    // Cockpit side glass with a dark frame.
    b.box([0.08, 0.46, 0.85], { pos: [s * 0.86, 0.42, 3.4], rot: [0, s * 0.35, 0], color: C.frame });
    b.box([0.09, 0.36, 0.72], { pos: [s * 0.865, 0.43, 3.4], rot: [0, s * 0.35, 0], color: C.window, top: C.windowTop });
  }
  // Windscreen: two panes with a centre post.
  b.box([1.62, 0.56, 0.07], { pos: [0, 0.5, 3.55], rot: [-0.65, 0, 0], color: C.frame });
  for (const s of [-1, 1]) b.box([0.72, 0.44, 0.08], { pos: [s * 0.4, 0.51, 3.56], rot: [-0.65, 0, 0], color: C.window, top: C.windowTop });
  // Pitot tube, nose gear.
  b.box([0.03, 0.03, 0.5], { pos: [0.55, -0.3, 4.6], color: C.chrome });
  b.box([0.1, 0.5, 0.1], { pos: [0, -1.1, 3.6], color: C.gear });
  b.cyl(0.18, 0.18, 0.15, 8, { pos: [0, -1.38, 3.6], rot: [0, 0, X], color: C.tyre });
  tornRing(b, BREAK_Z, -1);
}

function body(b: PartBuilder) {
  const len = BREAK_Z + 2.4;
  b.cyl(1.05, 1.05, len, 16, { pos: [0, 0, BREAK_Z - len / 2], rot: [X, 0, 0], color: C.belly, top: C.bodyTop });
  b.cyl(1.05, 0.32, 3.2, 16, { pos: [0, 0.22, -4.0], rot: [-X, 0, 0], color: C.body, top: C.bodyTop });
  for (const s of [-1, 1]) {
    b.box([0.05, 0.28, len], { pos: [s * 1.03, -0.12, BREAK_Z - len / 2], color: C.stripe });
    b.box([0.05, 0.08, len], { pos: [s * 1.035, 0.08, BREAK_Z - len / 2], color: C.stripe2 });
    for (const z of [-1.25, -0.45, 0.35, 1.15]) windowPane(b, s, z);
  }
  // Door with frame and handle.
  b.box([0.07, 1.3, 0.8], { pos: [-1.035, 0.0, -2.0], color: C.frame });
  b.box([0.075, 1.18, 0.68], { pos: [-1.04, 0.0, -2.0], color: C.body });
  b.box([0.08, 0.05, 0.2], { pos: [-1.05, 0.0, -1.78], color: C.chrome });
  // Wing centre box + antenna + main gear.
  b.box([ROOT_X * 2, 0.22, 2.1], { pos: [0, 0.55, 0.6], color: C.wing, top: C.wingTop });
  b.box([0.03, 0.55, 0.03], { pos: [0, 1.3, 1.0], rot: [-0.3, 0, 0], color: C.gear });
  for (const s of [-1, 1]) {
    b.box([0.12, 0.7, 0.12], { pos: [s * 0.9, -1.1, 0.9], color: C.gear });
    b.box([0.3, 0.35, 0.7], { pos: [s * 0.9, -1.35, 0.9], color: C.stripe });
    b.cyl(0.26, 0.26, 0.2, 10, { pos: [s * 0.9, -1.5, 0.9], rot: [0, 0, X], color: C.tyre });
  }
  // Swept tail fin (two panels) with the sun logo, stabiliser, beacon.
  b.box([0.18, 2.0, 1.6], { pos: [0, 1.25, -4.65], rot: [-0.32, 0, 0], color: C.body, top: C.stripe2 });
  b.box([0.2, 0.5, 1.0], { pos: [0, 2.1, -5.0], rot: [-0.32, 0, 0], color: C.stripe2 });
  for (const s of [-1, 1]) {
    b.cyl(0.32, 0.32, 0.03, 12, { pos: [s * 0.1, 1.25, -4.7], rot: [0, 0, X], color: C.logo });
    b.cyl(0.18, 0.18, 0.035, 12, { pos: [s * 0.1, 1.25, -4.7], rot: [0, 0, X], color: C.stripe });
    b.box([1.9, 0.14, 1.1], { pos: [s * 1.15, 0.38, -4.95], rot: [0, s * 0.15, 0], color: C.wing, top: C.wingTop });
    b.box([0.3, 0.15, 1.12], { pos: [s * 2.0, 0.38, -5.05], rot: [0, s * 0.15, 0], color: C.stripe });
  }
  b.ico(0.1, 0, { pos: [0, 2.3, -5.2], color: C.red, glow: true });
  tornRing(b, BREAK_Z, 1);
}

function wing(b: PartBuilder, s: 1 | -1) {
  const span = 5.9 - ROOT_X;
  const cx = s * (ROOT_X + span / 2);
  b.box([span, 0.22, 2.1], { pos: [cx, 0.55, 0.6], color: C.wing, top: C.wingTop });
  b.box([span - 0.4, 0.08, 0.5], { pos: [cx, 0.5, -0.65], color: C.belly });
  b.box([0.6, 0.24, 2.12], { pos: [s * 5.65, 0.55, 0.6], color: C.stripe });
  b.ico(0.12, 0, { pos: [s * 5.95, 0.58, 1.1], color: s < 0 ? C.red : C.green, glow: true });
  // Engine: nacelle, cowl ring, chrome lip, exhaust stacks, spinner, 3 tipped blades.
  const ex = s * 2.6;
  b.cyl(0.46, 0.4, 2.1, 12, { pos: [ex, 0.3, 1.5], rot: [X, 0, 0], color: C.engine, top: C.engineTop });
  b.cyl(0.48, 0.48, 0.2, 12, { pos: [ex, 0.3, 2.35], rot: [X, 0, 0], color: C.stripe });
  b.cyl(0.42, 0.42, 0.06, 12, { pos: [ex, 0.3, 2.48], rot: [X, 0, 0], color: C.chrome });
  for (const k of [-1, 1]) b.cyl(0.06, 0.08, 0.4, 6, { pos: [ex + k * 0.3, 0.05, 0.75], rot: [X, 0, 0], color: C.gear });
  b.cyl(0.0, 0.27, 0.58, 12, { pos: [ex, 0.3, 2.82], rot: [X, 0, 0], color: C.stripe, top: "#ff9a52" });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    b.box([0.17, 1.15, 0.05], { pos: [ex + Math.sin(a) * 0.58, 0.3 + Math.cos(a) * 0.58, 2.9], rot: [0, 0, -a], color: C.prop });
    b.box([0.18, 0.13, 0.06], { pos: [ex + Math.sin(a) * 1.08, 0.3 + Math.cos(a) * 1.08, 2.9], rot: [0, 0, -a], color: C.logo });
  }
  tornRoot(b, s * ROOT_X, s);
}

/**
 * Low-poly "Jungle Air" twin-prop tour plane, ~10.5 m long, nose = +Z, built
 * as four pieces so it can break apart in the intro: nose (the bit that ends
 * up at camp), body + tail, and both wings. Each piece = one merged
 * vertex-coloured geometry (+ a tiny glow part for nav lights), re-centred
 * on its pivot so it can tumble on its own.
 */
export function buildPlaneParts(): Record<PlanePiece, PlanePart> {
  const make = (fn: (b: PartBuilder) => void, seed: number): PlanePart => {
    const b = new PartBuilder(Infinity, mulberry32(seed));
    fn(b);
    const out = b.build();
    const solid = out.solid[0].geometry;
    const glow = out.glow[0]?.geometry ?? null;
    solid.computeBoundingBox();
    const bb = solid.boundingBox!;
    const pivot: [number, number, number] = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
    solid.translate(-pivot[0], -pivot[1], -pivot[2]);
    glow?.translate(-pivot[0], -pivot[1], -pivot[2]);
    solid.computeBoundingSphere();
    glow?.computeBoundingSphere();
    return { solid, glow, pivot };
  };
  return {
    nose: make(nose, 71),
    body: make(body, 72),
    wingL: make((b) => wing(b, -1), 73),
    wingR: make((b) => wing(b, 1), 74),
  };
}
