import type { BufferGeometry } from "three";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";

/** Small quest items (origin on the ground, +Z forward). */
const solid = (b: PartBuilder) => b.build().solid[0].geometry;
const glow = (b: PartBuilder) => b.build().glow[0].geometry;

export function suitcaseGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(201));
  b.box([0.7, 0.5, 0.28], { pos: [0, 0.3, 0], color: "#c0392b", top: "#e8533a" });
  for (const x of [-0.22, 0.22]) b.box([0.06, 0.52, 0.3], { pos: [x, 0.3, 0], color: "#7a4b2a" });
  b.box([0.22, 0.06, 0.06], { pos: [0, 0.6, 0], color: "#2a2a2a" });
  b.box([0.18, 0.14, 0.02], { pos: [0.12, 0.38, 0.15], color: "#ffd23f" });
  b.box([0.14, 0.1, 0.02], { pos: [-0.14, 0.24, 0.15], color: "#3fa7d6" });
  return solid(b);
}

export function frogGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(202));
  b.cyl(0.35, 0.38, 0.05, 10, { pos: [0, 0.03, 0], color: "#3f8f3a", top: "#6fbf4a" });
  b.ico(0.2, 1, { pos: [0, 0.2, 0], scale: [1, 0.7, 1.1], color: "#4caf3a", top: "#8fe05a" });
  b.ico(0.13, 0, { pos: [0, 0.17, 0.08], scale: [1, 0.7, 1], color: "#d6f0a0" });
  for (const s of [-1, 1]) {
    b.ico(0.065, 0, { pos: [s * 0.09, 0.33, 0.1], color: "#ffffff" });
    b.ico(0.035, 0, { pos: [s * 0.1, 0.34, 0.15], color: "#111111" });
    b.box([0.1, 0.05, 0.16], { pos: [s * 0.17, 0.08, -0.05], color: "#3f8f3a" });
  }
  return solid(b);
}

export function lanternGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(203));
  b.box([0.6, 0.15, 0.6], { pos: [0, 0.08, 0], color: "#7d7a72", top: "#a6a299" });
  b.cyl(0.12, 0.16, 0.7, 6, { pos: [0, 0.5, 0], color: "#8d8a82", top: "#a6a299" });
  b.box([0.5, 0.1, 0.5], { pos: [0, 0.9, 0], color: "#8d8a82" });
  b.box([0.38, 0.36, 0.38], { pos: [0, 1.13, 0], color: "#6d6a62" });
  b.cyl(0, 0.45, 0.3, 4, { pos: [0, 1.46, 0], rot: [0, Math.PI / 4, 0], color: "#7d7a72", top: "#a6a299" });
  b.ico(0.06, 0, { pos: [0, 1.65, 0], color: "#a6a299" });
  for (let i = 0; i < 4; i++) b.leaf(0.25, 0.12, { pos: [0.2, 0.2 + i * 0.25, 0.2], rot: [0.5, i, 0], color: "#4f8f3a" });
  return solid(b);
}

/** Lantern window glow (shown once lit). */
export function lanternFlameGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(204));
  b.box([0.4, 0.26, 0.4], { pos: [0, 1.13, 0], color: "#7fd3ff", glow: true });
  return glow(b);
}

export function butterflyGlowGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(205));
  for (const s of [-1, 1]) {
    b.box([0.26, 0.012, 0.2], { pos: [s * 0.14, 0, 0.02], color: "#ffd23f", glow: true });
    b.box([0.16, 0.012, 0.13], { pos: [s * 0.1, 0, -0.14], color: "#ff9a3c", glow: true });
  }
  b.box([0.04, 0.04, 0.24], { pos: [0, 0, 0], color: "#5a3a1c", glow: true });
  return glow(b);
}

/** Floating marker: a diamond (+ small orbiting sparkle look via scale). */
export function markerGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(206));
  b.cyl(0, 0.22, 0.32, 4, { pos: [0, 0.16, 0], color: "#ffffff", glow: true });
  b.cyl(0.22, 0, 0.32, 4, { pos: [0, -0.16, 0], color: "#ffffff", glow: true });
  return glow(b);
}
