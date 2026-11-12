import type { PartBuilder } from "../geo/PartBuilder";
import { leafPuff } from "./storyTree";

const BARK = "#33241a";
const BARK_TOP = "#4a3424";
const LEAVES = [
  { dark: "#0f3320", mid: "#17462a", light: "#22603a", sun: "#3a7a44" },
  { dark: "#143a26", mid: "#1d4f33", light: "#2a6a40", sun: "#45864c" },
];

/**
 * Cheap creepy tree for the edges of the outposts (~300 triangles): a dark,
 * leaning trunk with root flares, two deep-green leaf clumps and vines hanging
 * down. World space.
 */
export function darkTree(b: PartBuilder, x: number, z: number, h: number) {
  const c = LEAVES[Math.floor(b.rand(0, LEAVES.length))];
  const lean = b.rand(-0.12, 0.12);
  b.cyl(0.22, 0.42, h, 6, { pos: [x, h / 2, z], rot: [lean, 0, -lean * 0.6], color: BARK, top: BARK_TOP, jitter: 0.08 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + b.rand(0, 1);
    b.box([0.16, 0.6, 0.5], { pos: [x + Math.sin(a) * 0.38, 0.22, z + Math.cos(a) * 0.38], rot: [0.5, a, 0], color: BARK });
  }
  const tx = x - lean * h * 0.3;
  const tz = z + lean * h * 0.5;
  leafPuff(b, tx, h - 0.6, tz, h * 0.28, c);
  const a = b.rand(0, Math.PI * 2);
  leafPuff(b, tx + Math.sin(a) * h * 0.18, h - 1.6, tz + Math.cos(a) * h * 0.18, h * 0.2, c);
  for (let k = 0; k < 2; k++) {
    const va = b.rand(0, Math.PI * 2);
    const len = b.rand(2.5, 5);
    const vx = tx + Math.sin(va) * h * 0.18;
    const vz = tz + Math.cos(va) * h * 0.18;
    b.box([0.05, len, 0.05], { pos: [vx, h - 1.2 - len / 2, vz], color: "#1f4a24" });
    b.leaf(0.4, 0.26, { pos: [vx, h - 1.2 - len * 0.7, vz], rot: [0.7, va, 0], color: "#1f4a24", top: "#2f6a30" });
  }
}
