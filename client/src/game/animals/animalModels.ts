import type { BufferGeometry } from "three";
import { PartBuilder, type V3 } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";

/**
 * Low-poly animal parts (forward = +Z, feet at y = 0). Each species is a body
 * (with head) + one leg geometry (pivot at the hip, hanging down) + optional
 * tail, drawn as instanced parts so all animals of a species cost 2-3 draw calls.
 */
export interface Species {
  body: BufferGeometry;
  leg: BufferGeometry;
  tail: BufferGeometry | null;
  /** Glowing eyes (unlit), drawn with the body transform. */
  eyes: BufferGeometry | null;
  hips: V3[];
  tailBase: V3;
  legSwing: number;
  stepFreq: number;
}

const geo = (b: PartBuilder) => b.build().solid[0].geometry;

export function boarParts(): Species {
  const b = new PartBuilder(Infinity, mulberry32(41));
  b.ico(1, 1, { pos: [0, 0.62, -0.02], scale: [0.42, 0.38, 0.62], color: "#4e3322", top: "#7a5236", jitter: 0.05 });
  for (let i = 0; i < 6; i++) b.box([0.07, 0.14, 0.14], { pos: [0, 0.98 - Math.abs(i - 2.5) * 0.02, 0.32 - i * 0.14], rot: [0.3, 0, 0], color: "#2e1d12" });
  b.box([0.36, 0.34, 0.36], { pos: [0, 0.64, 0.6], color: "#5e3d2a", top: "#7a5236" });
  b.cyl(0.11, 0.12, 0.2, 7, { pos: [0, 0.56, 0.86], rot: [Math.PI / 2, 0, 0], color: "#b98572" });
  b.cyl(0.1, 0.1, 0.02, 7, { pos: [0, 0.56, 0.965], rot: [Math.PI / 2, 0, 0], color: "#d6a08c" });
  for (const s of [-1, 1]) {
    b.box([0.025, 0.03, 0.02], { pos: [s * 0.035, 0.56, 0.975], color: "#3a2018" });
    b.cyl(0, 0.026, 0.15, 5, { pos: [s * 0.1, 0.52, 0.84], rot: [-0.7, 0, s * 0.3], color: "#f3ead2" });
    b.box([0.08, 0.13, 0.05], { pos: [s * 0.15, 0.85, 0.52], rot: [0.2, 0, s * 0.5], color: "#3a2618" });
    b.box([0.045, 0.045, 0.02], { pos: [s * 0.15, 0.71, 0.775], color: "#111111" });
  }
  b.box([0.04, 0.2, 0.04], { pos: [0, 0.72, -0.64], rot: [0.7, 0, 0], color: "#2e1d12" });
  const body = geo(b);

  const l = new PartBuilder(Infinity, mulberry32(42));
  l.box([0.12, 0.4, 0.13], { pos: [0, -0.2, 0], color: "#2e1d12", top: "#4e3322" });
  l.box([0.13, 0.06, 0.15], { pos: [0, -0.42, 0.01], color: "#1a120c" });
  return {
    body,
    leg: geo(l),
    tail: null,
    eyes: null,
    hips: [
      [-0.22, 0.45, 0.33],
      [0.22, 0.45, 0.33],
      [-0.22, 0.45, -0.36],
      [0.22, 0.45, -0.36],
    ],
    tailBase: [0, 0, 0],
    legSwing: 0.7,
    stepFreq: 2.6,
  };
}

export function jaguarParts(): Species {
  const b = new PartBuilder(Infinity, mulberry32(51));
  b.ico(1, 1, { pos: [0, 0.68, 0], scale: [0.33, 0.32, 0.8], color: "#c98a2a", top: "#e8b850", jitter: 0.04 });
  b.ico(1, 1, { pos: [0, 0.52, 0.02], scale: [0.27, 0.18, 0.62], color: "#f3e2b8" });
  // Rosettes on the back and flanks.
  for (let i = 0; i < 22; i++) {
    const t = b.rand(-0.85, 0.85);
    const a = b.rand(-1.2, 1.2) + (i % 2 ? Math.PI / 2 : -Math.PI / 2) * 0.6;
    const x = Math.sin(a) * 0.33 * Math.sqrt(1 - t * t);
    const y = 0.68 + Math.cos(a) * 0.32 * Math.sqrt(1 - t * t);
    b.ico(0.055, 0, { pos: [x, y, t * 0.8], scale: [1, 1, 1.3], color: "#2a1a0a" });
  }
  // Head.
  b.ico(0.25, 1, { pos: [0, 0.86, 0.84], scale: [1, 0.88, 1.05], color: "#d49530", top: "#e8b850" });
  b.box([0.2, 0.14, 0.16], { pos: [0, 0.78, 1.04], color: "#f3e2b8" });
  b.box([0.07, 0.05, 0.04], { pos: [0, 0.83, 1.12], color: "#3a1a10" });
  for (const s of [-1, 1]) {
    b.cyl(0, 0.07, 0.12, 4, { pos: [s * 0.14, 1.07, 0.8], rot: [0, 0, s * -0.3], color: "#c98a2a" });
    b.box([0.06, 0.035, 0.02], { pos: [s * 0.095, 0.92, 1.03], color: "#d6ff3a" });
    b.box([0.02, 0.03, 0.021], { pos: [s * 0.095, 0.92, 1.035], color: "#111111" });
    for (let k = 0; k < 2; k++) b.ico(0.04, 0, { pos: [s * 0.18, 0.9 + k * 0.08, 0.72], color: "#2a1a0a" });
  }
  const body = geo(b);

  const l = new PartBuilder(Infinity, mulberry32(52));
  l.box([0.12, 0.52, 0.13], { pos: [0, -0.26, 0], color: "#c98a2a", top: "#d49530" });
  l.box([0.16, 0.07, 0.19], { pos: [0, -0.54, 0.03], color: "#f3e2b8" });
  l.ico(0.035, 0, { pos: [0.07, -0.3, 0.06], color: "#2a1a0a" });

  const e = new PartBuilder(Infinity, mulberry32(54));
  for (const s of [-1, 1]) e.box([0.07, 0.045, 0.03], { pos: [s * 0.095, 0.92, 1.04], color: "#e8ff4a", glow: true });

  const t = new PartBuilder(Infinity, mulberry32(53));
  t.cyl(0.035, 0.055, 0.9, 6, { pos: [0, 0, -0.45], rot: [Math.PI / 2, 0, 0], color: "#c98a2a", top: "#d49530" });
  for (let k = 0; k < 4; k++) t.cyl(0.05, 0.05, 0.06, 6, { pos: [0, 0, -0.25 - k * 0.18], rot: [Math.PI / 2, 0, 0], color: "#2a1a0a" });
  t.ico(0.05, 0, { pos: [0, 0, -0.92], color: "#111111" });
  return {
    body,
    leg: geo(l),
    tail: geo(t),
    eyes: e.build().glow[0].geometry,
    hips: [
      [-0.17, 0.56, 0.52],
      [0.17, 0.56, 0.52],
      [-0.17, 0.56, -0.5],
      [0.17, 0.56, -0.5],
    ],
    tailBase: [0, 0.78, -0.74],
    legSwing: 0.85,
    stepFreq: 2.2,
  };
}

export function monkeyParts(): Species {
  const b = new PartBuilder(Infinity, mulberry32(61));
  b.ico(1, 1, { pos: [0, 0.55, -0.02], scale: [0.26, 0.3, 0.36], color: "#6b4423", top: "#8a5a34" });
  b.ico(1, 1, { pos: [0, 0.5, 0.08], scale: [0.18, 0.2, 0.22], color: "#d9b48a" });
  // Head with a cheeky face and big ears.
  b.ico(0.22, 1, { pos: [0, 0.86, 0.3], color: "#6b4423", top: "#8a5a34" });
  b.ico(0.15, 1, { pos: [0, 0.83, 0.42], scale: [1.1, 0.85, 0.7], color: "#e8c89a" });
  for (const s of [-1, 1]) {
    b.cyl(0.1, 0.1, 0.04, 8, { pos: [s * 0.23, 0.9, 0.28], rot: [0, 0, Math.PI / 2], color: "#e8c89a" });
    b.ico(0.035, 0, { pos: [s * 0.065, 0.9, 0.5], color: "#111111" });
  }
  b.box([0.12, 0.025, 0.02], { pos: [0, 0.79, 0.52], color: "#7a2a1a" });
  b.ico(0.05, 0, { pos: [0.18, 1.08, 0.25], color: "#ffd23f" });
  const body = b.build().solid[0].geometry;

  const l = new PartBuilder(Infinity, mulberry32(62));
  l.box([0.08, 0.4, 0.08], { pos: [0, -0.2, 0], color: "#6b4423", top: "#8a5a34" });
  l.box([0.1, 0.05, 0.12], { pos: [0, -0.4, 0.02], color: "#e8c89a" });

  const t = new PartBuilder(Infinity, mulberry32(63));
  t.cyl(0.025, 0.04, 0.6, 5, { pos: [0, 0.2, -0.25], rot: [-0.6, 0, 0], color: "#6b4423" });
  t.cyl(0.02, 0.025, 0.35, 5, { pos: [0, 0.55, -0.42], rot: [0.5, 0, 0], color: "#6b4423" });
  return {
    body,
    leg: l.build().solid[0].geometry,
    tail: t.build().solid[0].geometry,
    eyes: null,
    hips: [
      [-0.13, 0.42, 0.18],
      [0.13, 0.42, 0.18],
      [-0.13, 0.42, -0.18],
      [0.13, 0.42, -0.18],
    ],
    tailBase: [0, 0.5, -0.32],
    legSwing: 1.0,
    stepFreq: 3.4,
  };
}
