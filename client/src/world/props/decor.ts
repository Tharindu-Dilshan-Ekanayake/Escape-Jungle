import type { PartBuilder } from "../geo/PartBuilder";

/** Small decorative builders shared by the lobby and the jungle camps (world space). */
export const DECOR = {
  wire: "#3a3a3a",
  bulbs: ["#ffd27a", "#ff9a7a", "#9ad8ff", "#c8ff8a", "#ffb0e0"],
  wood: "#7a4b2a",
  woodLight: "#a8743e",
  sign: "#f3e6c4",
  flags: ["#e8742a", "#1f9a8a", "#ffd23f", "#e8533a", "#3f8f4f"],
};

/** Catenary of glowing bulbs between two points at height h (sagging `sag` m). */
export function stringLights(b: PartBuilder, x0: number, z0: number, x1: number, z1: number, h: number, sag: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(4, Math.round(len / 0.9));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const y = h - sag * 4 * t * (1 - t);
    if (i < n) {
      const t2 = (i + 1) / n;
      const y2 = h - sag * 4 * t2 * (1 - t2);
      const seg = len / n;
      b.box([0.014, 0.014, Math.hypot(seg, y2 - y)], {
        pos: [x + ((x1 - x0) / n) * 0.5, (y + y2) / 2, z + ((z1 - z0) / n) * 0.5],
        rot: [Math.atan2(y - y2, seg), yaw, 0],
        color: DECOR.wire,
      });
    }
    if (i > 0 && i < n) b.ico(0.055, 0, { pos: [x, y - 0.07, z], color: DECOR.bulbs[i % DECOR.bulbs.length], glow: true });
  }
}

/** Wooden pole with a little lantern on top (for string lights). */
export function lightPole(b: PartBuilder, x: number, z: number, h: number) {
  b.cyl(0.07, 0.1, h, 6, { pos: [x, h / 2, z], color: DECOR.wood, top: DECOR.woodLight });
  b.box([0.2, 0.26, 0.2], { pos: [x, h + 0.13, z], color: "#ffd27a", glow: true });
  b.cyl(0.02, 0.18, 0.12, 4, { pos: [x, h + 0.32, z], rot: [0, Math.PI / 4, 0], color: "#3a3a3a" });
}

/** Signpost with a plank pointing toward angle `a` (radians, world XZ). */
export function signpost(b: PartBuilder, x: number, z: number, a: number) {
  b.cyl(0.06, 0.08, 2.4, 6, { pos: [x, 1.2, z], color: DECOR.wood });
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  b.box([1.3, 0.32, 0.06], { pos: [x + dx * 0.55, 2.0, z + dz * 0.55], rot: [0, -a, 0], color: DECOR.sign, top: "#fff4d6" });
  b.cyl(0, 0.2, 0.3, 3, { pos: [x + dx * 1.3, 2.0, z + dz * 1.3], rot: [0, -a, -Math.PI / 2], color: DECOR.sign });
}

/** Flag pole with a two-colour pennant. */
export function flagPole(b: PartBuilder, x: number, z: number, i: number) {
  b.cyl(0.05, 0.07, 4.6, 6, { pos: [x, 2.3, z], color: "#d8d8d8" });
  b.ico(0.1, 0, { pos: [x, 4.65, z], color: "#ffd23f" });
  b.box([1.1, 0.5, 0.03], { pos: [x + 0.58, 4.25, z], color: DECOR.flags[i % DECOR.flags.length] });
  b.box([0.5, 0.5, 0.035], { pos: [x + 0.32, 4.25, z], color: DECOR.flags[(i + 2) % DECOR.flags.length] });
}
