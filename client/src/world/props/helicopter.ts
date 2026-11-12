import type { PartBuilder } from "../geo/PartBuilder";

const C = {
  pad: "#4a4f55",
  padTop: "#5b6066",
  mark: "#ffd23f",
  body: "#e8742a",
  bodyTop: "#ffb066",
  white: "#f3f3f3",
  glass: "#2f5f86",
  dark: "#2a2a2a",
  metal: "#8c949c",
};

/** Landing pad with a yellow "H" at (x, z) (static; the helicopter itself is dynamic, see EscapeSystem). */
export function helipad(b: PartBuilder, x: number, z: number) {
  b.push([x, 0, z]);
  b.cyl(4.2, 4.4, 0.18, 16, { pos: [0, 0.09, 0], color: C.pad, top: C.padTop });
  b.box([0.5, 0.05, 3.2], { pos: [-1.1, 0.2, 0], color: C.mark });
  b.box([0.5, 0.05, 3.2], { pos: [1.1, 0.2, 0], color: C.mark });
  b.box([2.2, 0.05, 0.5], { pos: [0, 0.2, 0], color: C.mark });
  b.cyl(4.25, 4.25, 0.04, 16, { pos: [0, 0.2, 0], color: C.mark });
  b.cyl(3.95, 3.95, 0.05, 16, { pos: [0, 0.21, 0], color: C.pad });
  b.pop();
}

/** Rescue helicopter body (local: skids on y = 0.2, nose = -Z), without the main rotor. */
export function helicopterBody(b: PartBuilder) {
  // Skids.
  for (const s of [-1, 1]) {
    b.box([0.12, 0.12, 3.4], { pos: [s * 0.9, 0.35, 0.2], color: C.dark });
    for (const zz of [-0.8, 1.0]) b.box([0.08, 0.5, 0.08], { pos: [s * 0.85, 0.6, zz], rot: [0, 0, s * 0.2], color: C.dark });
  }
  // Cabin, nose glass, white stripe.
  b.ico(1.25, 1, { pos: [0, 1.55, -0.2], scale: [1, 0.9, 1.45], color: C.body, top: C.bodyTop });
  b.ico(0.95, 1, { pos: [0, 1.6, -1.25], scale: [1, 0.85, 0.9], color: C.glass, top: "#6fa8d0" });
  b.box([2.3, 0.18, 2.6], { pos: [0, 1.25, 0.1], color: C.white });
  // Tail boom, fins, tail rotor.
  b.cyl(0.18, 0.4, 3.6, 8, { pos: [0, 1.75, 2.9], rot: [Math.PI / 2, 0, 0], color: C.body });
  b.box([0.1, 1.0, 0.6], { pos: [0, 2.15, 4.55], color: C.white });
  b.box([1.1, 0.08, 0.45], { pos: [0, 1.75, 4.3], color: C.white });
  b.box([0.06, 0.9, 0.12], { pos: [0.18, 2.0, 4.65], color: C.dark });
  b.cyl(0.1, 0.1, 0.5, 6, { pos: [0, 2.85, -0.1], color: C.metal });
}

/** Main rotor (local origin = rotor hub): two crossed blades. */
export function helicopterRotor(b: PartBuilder) {
  b.box([7.2, 0.06, 0.32], { pos: [0, 0, 0], color: C.dark });
  b.box([7.2, 0.06, 0.32], { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0], color: C.dark });
  b.cyl(0.18, 0.18, 0.1, 8, { pos: [0, 0.02, 0], color: C.metal });
}
