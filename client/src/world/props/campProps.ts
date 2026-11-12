import type { PartBuilder } from "../geo/PartBuilder";
import type { LocalCollider } from "../../game/player/collision";
import { PALETTE as P } from "../../config/palette";
import { BALANCE } from "../../config/balance";
import type { ToolKey } from "../../game/economy/economy";
import { TOOL_SPAN, buildToolShape } from "./toolShapes";

/** Camp economy props, authored in local space: base at y=0, front = +Z. */

const X = Math.PI / 2;
const C = {
  plank: "#2f7a3f",
  roof: "#e8742a",
  roofTop: "#ff9a52",
  slate: "#2f3b33",
  slateTop: "#3c4c42",
  grass: ["#9BE22D", "#C6F03A", "#6CC81E"],
  mouth: "#1b1410",
  hazard: "#1f1f1f",
};

/** Toothed gear in the local YZ plane (axle along X). */
function gear(b: PartBuilder, x: number, y: number, z: number, r: number, teeth: number, color: string) {
  b.cyl(r, r, 0.16, Math.max(10, teeth), { pos: [x, y, z], rot: [0, 0, X], color });
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    b.box([0.16, r * 0.26, r * 0.24], { pos: [x, y + Math.cos(a) * r * 1.08, z + Math.sin(a) * r * 1.08], rot: [-a, 0, 0], color });
  }
  for (let i = 0; i < 3; i++) b.box([0.18, r * 1.7, 0.09], { pos: [x + 0.02, y, z], rot: [(i * Math.PI) / 3, 0, 0], color: P.metalLight });
  b.cyl(r * 0.24, r * 0.24, 0.24, 8, { pos: [x + 0.04, y, z], rot: [0, 0, X], color: P.gold });
}

/**
 * Grinder: a green plank mill with an orange roof, a big funnel overflowing
 * with grass, two meshing gears on the side, a chimney, a glowing lantern and
 * a coin tray spilling gold at the front. Its name is printed on the front.
 */
export function grinder(b: PartBuilder): LocalCollider[] {
  b.box([3.6, 0.3, 3.0], { pos: [0, 0.15, 0], color: P.stone, top: P.stoneTop, jitter: 0.05 });
  // Plank walls with trim bands and corner posts.
  b.box([2.6, 1.9, 2.0], { pos: [0, 1.25, -0.1], color: P.millGreen, top: P.millGreenTop });
  for (let i = 0; i < 5; i++) b.box([0.04, 1.8, 0.02], { pos: [-1.04 + i * 0.52, 1.25, 0.91], color: C.plank });
  for (const y of [0.42, 2.18]) b.box([2.72, 0.14, 2.12], { pos: [0, y, -0.1], color: P.cream });
  for (const x of [-1.33, 1.33]) for (const z of [-1.13, 0.93]) b.box([0.2, 2.2, 0.2], { pos: [x, 1.4, z], color: P.wood });
  // Grass intake mouth on the front.
  b.box([1.1, 0.5, 0.06], { pos: [0, 1.05, 0.93], color: C.mouth });
  b.box([1.26, 0.1, 0.1], { pos: [0, 1.32, 0.95], color: P.iron });
  // Roof: two orange panels on a ridge beam.
  for (const s of [-1, 1]) {
    b.box([1.62, 0.12, 2.5], { pos: [s * 0.7, 2.62, -0.1], rot: [0, 0, -s * 0.48], color: C.roof, top: C.roofTop });
    for (let k = 0; k < 3; k++) b.box([1.62, 0.03, 0.05], { pos: [s * 0.7, 2.69, -0.9 + k * 0.8], rot: [0, 0, -s * 0.48], color: "#c85a1a" });
  }
  b.box([0.2, 0.2, 2.6], { pos: [0, 2.98, -0.1], color: P.wood });
  // Funnel on the ridge, heaped with grass.
  b.cyl(1.1, 0.42, 0.9, 6, { pos: [0, 3.5, -0.1], color: P.metal, top: P.metalLight });
  b.cyl(1.16, 1.16, 0.12, 6, { pos: [0, 3.96, -0.1], color: P.iron });
  b.ico(0.85, 0, { pos: [0, 4.02, -0.1], scale: [1, 0.35, 1], color: "#5aa82a", top: C.grass[0] });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.leaf(0.7, 0.16, { pos: [Math.cos(a) * 0.5, 4.25, -0.1 + Math.sin(a) * 0.5], rot: [0.3, a, 0.2], color: C.grass[2], top: C.grass[i % 2] });
  }
  // Gears on the right side.
  gear(b, 1.46, 1.3, 0.05, 0.72, 12, P.iron);
  gear(b, 1.46, 2.28, -0.75, 0.36, 8, P.metal);
  // Chimney at the back left.
  b.cyl(0.2, 0.22, 1.9, 7, { pos: [-0.85, 3.4, -0.85], color: P.iron });
  b.cyl(0.24, 0.24, 0.12, 7, { pos: [-0.85, 3.6, -0.85], color: P.red });
  b.cyl(0.36, 0.28, 0.18, 7, { pos: [-0.85, 4.42, -0.85], color: P.iron });
  // Lantern on a bracket by the door.
  b.box([0.5, 0.06, 0.06], { pos: [-1.2, 2.0, 1.1], color: P.iron });
  b.box([0.22, 0.3, 0.22], { pos: [-1.4, 1.8, 1.1], color: P.lantern, glow: true });
  b.cyl(0.02, 0.18, 0.12, 4, { pos: [-1.4, 2.0, 1.1], rot: [0, Math.PI / 4, 0], color: P.iron });
  // Chute + tray spilling coins.
  b.box([0.9, 0.08, 0.9], { pos: [0, 0.7, 1.3], rot: [0.4, 0, 0], color: P.metalLight });
  for (const s of [-1, 1]) b.box([0.06, 0.18, 0.9], { pos: [s * 0.45, 0.78, 1.3], rot: [0.4, 0, 0], color: P.metal });
  b.box([1.6, 0.24, 0.85], { pos: [0, 0.42, 1.78], color: P.woodWarm, top: "#c98a4a" });
  b.box([1.4, 0.06, 0.7], { pos: [0, 0.55, 1.78], color: P.gold });
  for (let i = 0; i < 14; i++) {
    b.cyl(0.13, 0.13, 0.05, 8, {
      pos: [b.rand(-0.65, 0.65), 0.6 + (i % 4) * 0.035, 1.78 + b.rand(-0.3, 0.3)],
      rot: [b.rand(-0.3, 0.3), 0, b.rand(-0.3, 0.3)],
      color: P.gold,
    });
  }
  for (let i = 0; i < 5; i++) b.cyl(0.13, 0.13, 0.05, 8, { pos: [b.rand(-1.1, 1.1), 0.33, 2.35 + b.rand(0, 0.35)], rot: [0.1, 0, 0.1], color: P.gold });
  return [{ kind: "box", x: 0, z: 0.38, hx: 1.8, hz: 1.8 }];
}

/** The tool a shop sells, hung big in the middle of its board (its real model, fitted to the board). */
function saleTool(b: PartBuilder, tool: ToolKey, x: number) {
  const [lo, hi] = TOOL_SPAN[tool];
  // Bigger than life and hung diagonally so it reads from across the camp.
  const s = Math.min(1.6, 1.5 / (hi - lo));
  b.box([0.07, 0.07, 0.22], { pos: [x + 0.32, 2.12, 0.08], color: P.iron }); // peg
  // Turned so the cutting side faces right and side parts (engine, grips) stick out toward you.
  b.push([x, 1.62, 0.13], -Math.PI / 2, s, -0.6);
  b.push([0, -(lo + hi) / 2, 0]);
  buildToolShape(tool, { metal: b, wood: b, spin: b });
  b.pop();
  b.pop();
  b.ico(0.05, 0, { pos: [x + 0.32, 2.1, 0.2], color: "#fff6c8", glow: true });
}

/** Spare kit hung on the board at x (local): an old sickle or a weed bomb. */
function hungTool(b: PartBuilder, kind: number, x: number) {
  const z = 0.13;
  b.box([0.07, 0.07, 0.22], { pos: [x, 2.05, 0.08], color: P.iron }); // peg
  if (kind === 0) {
    b.box([0.08, 0.46, 0.08], { pos: [x, 1.32, z], color: P.wood });
    b.box([0.12, 0.08, 0.1], { pos: [x, 1.58, z], color: P.gold });
    for (let i = 0; i < 6; i++) {
      const a = -0.5 + i * 0.42;
      b.box([0.2, 0.07, 0.04], { pos: [x + 0.06 + Math.cos(a) * 0.22, 1.86 + Math.sin(a) * 0.16, z], rot: [0, 0, a + 1.2], color: i === 5 ? "#ffffff" : P.metalLight });
    }
  } else {
    for (const dx of [-0.11, 0.11, 0]) b.cyl(0.09, 0.09, 0.56, 7, { pos: [x + dx, 1.62, z + (dx === 0 ? 0.08 : 0)], color: P.red, top: "#ef5a4c" });
    b.cyl(0.25, 0.25, 0.07, 8, { pos: [x, 1.66, z + 0.04], color: P.iron });
    b.box([0.03, 0.26, 0.03], { pos: [x, 2.0, z + 0.08], rot: [0, 0, 0.3], color: "#d8c8a0" });
    b.ico(0.05, 0, { pos: [x - 0.04, 2.13, z + 0.08], color: "#ffd23f", glow: true });
  }
}

/** Tool rack: log posts with lanterns, a lean-to roof, a dark slate board, the tool for sale and spare kit. */
export function toolBoard(b: PartBuilder, tool: ToolKey = BALANCE.shopTools[0]): LocalCollider[] {
  for (const x of [-1.85, 1.85]) {
    b.cyl(0.16, 0.18, 2.9, 6, { pos: [x, 1.45, 0], color: P.wood, jitter: 0.1 });
    b.box([0.26, 0.32, 0.26], { pos: [x, 3.08, 0.05], color: P.lantern, glow: true });
    b.box([0.34, 0.06, 0.34], { pos: [x, 3.27, 0.05], color: P.iron });
  }
  // Slate board in a wooden frame.
  b.box([3.6, 1.75, 0.1], { pos: [0, 1.7, -0.06], color: P.wood });
  b.box([3.4, 1.55, 0.12], { pos: [0, 1.7, -0.03], color: C.slate, top: C.slateTop });
  b.box([3.9, 0.18, 0.26], { pos: [0, 0.82, 0], color: P.wood });
  // Lean-to roof with shingle lines.
  b.box([4.3, 0.1, 0.95], { pos: [0, 2.92, 0.12], rot: [0.32, 0, 0], color: C.roof, top: C.roofTop });
  for (let k = 0; k < 4; k++) b.box([4.3, 0.03, 0.05], { pos: [0, 2.99 - k * 0.07, -0.18 + k * 0.22], rot: [0.32, 0, 0], color: "#c85a1a" });
  // Header plank (the TOOLS name is printed on it).
  b.box([2.6, 0.42, 0.08], { pos: [0, 2.48, 0.04], color: P.woodLight });
  hungTool(b, 0, -1.25);
  saleTool(b, tool, 0);
  hungTool(b, 3, 1.25);
  // Shelf with a toolbox and a whetstone.
  b.box([3.4, 0.08, 0.45], { pos: [0, 0.95, 0.24], color: P.woodLight });
  b.box([0.7, 0.3, 0.32], { pos: [-1.1, 1.14, 0.24], color: P.red, top: "#ef5a4c" });
  b.box([0.3, 0.06, 0.06], { pos: [-1.1, 1.33, 0.24], color: P.iron });
  b.box([0.5, 0.12, 0.2], { pos: [0.9, 1.05, 0.24], color: "#7f8a92", top: "#a8b2ba" });
  return [{ kind: "box", x: 0, z: 0.05, hx: 2.05, hz: 0.38 }];
}

/** Bag upgrade table: wooden table with a burlap sack and a glowing gold sack. */
export function bagTable(b: PartBuilder): LocalCollider[] {
  b.box([2.4, 0.15, 1.2], { pos: [0, 0.95, 0], color: P.woodWarm, top: "#c98a4a" });
  for (const x of [-1.05, 1.05]) for (const z of [-0.45, 0.45]) b.box([0.15, 0.9, 0.15], { pos: [x, 0.45, z], color: P.wood });
  b.box([2.2, 0.36, 0.06], { pos: [0, 0.7, 0.56], color: P.woodLight });
  b.ico(0.45, 1, { pos: [-0.55, 1.45, 0], scale: [1, 1.1, 1], color: P.burlap, top: "#dcbc84" });
  b.cyl(0.1, 0.14, 0.16, 6, { pos: [-0.55, 1.98, 0], color: "#a8844e" });
  b.ico(0.45, 1, { pos: [0.55, 1.45, 0], scale: [1, 1.1, 1], color: P.goldGlow, top: "#fff0a0", glow: true });
  b.cyl(0.1, 0.14, 0.16, 6, { pos: [0.55, 1.98, 0], color: P.gold });
  b.box([0.7, 0.7, 0.7], { pos: [1.6, 0.35, 0.3], rot: [0, 0.3, 0], color: P.wood, top: "#9c6a40" });
  b.box([0.74, 0.08, 0.74], { pos: [1.6, 0.5, 0.3], rot: [0, 0.3, 0], color: P.iron });
  return [{ kind: "box", x: 0.38, z: 0.1, hx: 1.6, hz: 0.75 }];
}
