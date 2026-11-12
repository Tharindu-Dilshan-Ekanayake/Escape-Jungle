import { BufferAttribute, CylinderGeometry, type BufferGeometry } from "three";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";

/**
 * Small low-poly models for loot (built once per run, vertex coloured):
 * a firewood log and one model per treasure kind (same order as TREASURES).
 * Treasures are centred on the origin, about 0.25 m across.
 */
const solid = (b: PartBuilder) => b.build().solid[0].geometry;

/** Firewood: bark log lying along X with pale cut ends and a branch stub. */
export function logGeometry(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(3));
  b.cyl(0.085, 0.095, 0.72, 7, { pos: [0, 0.09, 0], rot: [0, 0, Math.PI / 2], color: "#5e3b1f", top: "#7a4e2a", jitter: 0.1 });
  for (const s of [-1, 1]) b.cyl(0.075, 0.075, 0.012, 7, { pos: [s * 0.362, 0.09, 0], rot: [0, 0, Math.PI / 2], color: "#e0c08c" });
  b.cyl(0.02, 0.03, 0.16, 5, { pos: [0.1, 0.17, 0.05], rot: [0.5, 0, -0.6], color: "#6b4423" });
  b.leaf(0.12, 0.07, { pos: [0.16, 0.24, 0.08], rot: [-0.6, 0.4, 0], color: "#4f9a3a" });
  return solid(b);
}

type Maker = (b: PartBuilder) => void;

const coin: Maker = (b) => {
  b.cyl(0.11, 0.11, 0.025, 12, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: "#d9a520", top: "#ffd34a" });
  b.cyl(0.08, 0.08, 0.03, 12, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: "#f2c230" });
  b.box([0.035, 0.035, 0.034], { pos: [0, 0, 0], rot: [0, 0, 0.785], color: "#7a5a10" });
};

const shell: Maker = (b) => {
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.3;
    b.cyl(0.0, 0.045, 0.2, 4, { pos: [Math.sin(a) * 0.06, 0.06 + Math.cos(a) * 0.04, 0], rot: [0, 0, -a], color: "#f2c6c9", top: "#fff2ee" });
  }
  b.ico(0.045, 1, { pos: [0, 0.0, 0.04], color: "#ffffff", top: "#f1f1ff" });
  b.box([0.08, 0.04, 0.05], { pos: [0, -0.04, 0], color: "#e8aeb2" });
};

const beetle: Maker = (b) => {
  b.ico(0.1, 1, { pos: [0, 0, 0], scale: [0.75, 0.55, 1.1], color: "#c45f12", top: "#ffb347" });
  b.box([0.004, 0.06, 0.2], { pos: [0, 0.03, 0], color: "#7a3a08" });
  b.ico(0.045, 0, { pos: [0, 0.0, 0.12], color: "#3a2208" });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box([0.08, 0.012, 0.012], { pos: [s * 0.08, -0.03, -0.05 + i * 0.05], rot: [0, 0, s * 0.4], color: "#2a1a08" });
};

const compass: Maker = (b) => {
  b.cyl(0.11, 0.11, 0.04, 12, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: "#a8782a", top: "#d9a84a" });
  b.cyl(0.09, 0.09, 0.045, 12, { pos: [0, 0, 0.002], rot: [Math.PI / 2, 0, 0], color: "#f3ead2" });
  b.box([0.018, 0.07, 0.05], { pos: [0, 0.035, 0], color: "#d63a2f" });
  b.box([0.018, 0.07, 0.05], { pos: [0, -0.035, 0], color: "#f5f5f5" });
  b.cyl(0.03, 0.03, 0.03, 8, { pos: [0, 0.125, 0], color: "#d9a84a" });
};

const frog: Maker = (b) => {
  b.ico(0.1, 1, { pos: [0, 0, 0], scale: [1, 0.65, 1.1], color: "#1e8a5a", top: "#5fe0a0" });
  for (const s of [-1, 1]) {
    b.ico(0.035, 0, { pos: [s * 0.05, 0.065, 0.06], color: "#7dffc0" });
    b.ico(0.016, 0, { pos: [s * 0.05, 0.075, 0.09], color: "#0a2a1a" });
    b.box([0.05, 0.03, 0.09], { pos: [s * 0.09, -0.045, -0.03], color: "#167048" });
  }
};

const orchid: Maker = (b) => {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.ico(0.06, 0, { pos: [Math.cos(a) * 0.07, 0.03, Math.sin(a) * 0.07], rot: [0, -a, 0], scale: [1.6, 0.35, 0.8], color: "#b48cff", top: "#f0e2ff" });
  }
  b.ico(0.035, 1, { pos: [0, 0.06, 0], color: "#ffe066" });
  b.cyl(0.012, 0.012, 0.14, 5, { pos: [0, -0.04, 0], color: "#3f8f4f" });
};

const skull: Maker = (b) => {
  b.ico(0.1, 1, { pos: [0, 0.03, 0], scale: [0.9, 0.9, 1], color: "#a8121e", top: "#ff4a5a" });
  b.box([0.11, 0.05, 0.08], { pos: [0, -0.06, 0.03], color: "#8e0f19" });
  for (const s of [-1, 1]) b.box([0.035, 0.035, 0.02], { pos: [s * 0.035, 0.03, 0.09], color: "#2a0306" });
  for (let i = 0; i < 4; i++) b.box([0.014, 0.022, 0.014], { pos: [-0.03 + i * 0.02, -0.065, 0.075], color: "#ffd34a" });
};

const idol: Maker = (b) => {
  b.box([0.16, 0.05, 0.12], { pos: [0, -0.1, 0], color: "#b8860b", top: "#d9a520" });
  b.box([0.11, 0.13, 0.09], { pos: [0, -0.01, 0], color: "#d9a520", top: "#ffd34a" });
  b.box([0.13, 0.1, 0.1], { pos: [0, 0.1, 0], color: "#e6b422", top: "#ffe066" });
  for (const s of [-1, 1]) b.box([0.025, 0.02, 0.02], { pos: [s * 0.03, 0.11, 0.05], color: "#3a2a08" });
  b.box([0.05, 0.015, 0.02], { pos: [0, 0.07, 0.05], color: "#3a2a08" });
  for (let i = 0; i < 5; i++) b.cyl(0, 0.025, 0.08, 4, { pos: [-0.06 + i * 0.03, 0.18, -0.01], color: i % 2 ? "#2fbf71" : "#ffd34a" });
};

const MAKERS: Maker[] = [coin, shell, beetle, compass, frog, orchid, skull, idol];

export function treasureGeometries(): BufferGeometry[] {
  return MAKERS.map((make, i) => {
    const b = new PartBuilder(Infinity, mulberry32(100 + i));
    make(b);
    return solid(b);
  });
}

/** Open light-beam cylinder (base at y=0) with a white -> black gradient for additive fading. */
export function beamGeometry(radius: number, height: number): BufferGeometry {
  const g = new CylinderGeometry(radius * 0.6, radius, height, 10, 1, true);
  g.translate(0, height / 2, 0);
  const pos = g.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.pow(1 - pos.getY(i) / height, 1.5);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}
