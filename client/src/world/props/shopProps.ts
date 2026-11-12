import type { PartBuilder } from "../geo/PartBuilder";
import type { LocalCollider } from "../../game/player/collision";
import { PALETTE as P } from "../../config/palette";

/** Camp 1 shop stands, local space, front = +Z. */

const X = Math.PI / 2;
const C = { hazard: "#1f1f1f" };

function pedestal(b: PartBuilder) {
  b.box([1.6, 0.9, 1.6], { pos: [0, 0.45, 0], color: P.stone, top: P.stoneTop, jitter: 0.06 });
  b.box([1.8, 0.15, 1.8], { pos: [0, 0.97, 0], color: P.stoneTop });
  b.box([1.82, 0.05, 1.82], { pos: [0, 1.07, 0], color: P.moss });
}

/** Wheel (axle along X) with a tread ring and a gold hub. */
function wheel(b: PartBuilder, x: number, y: number, z: number, r: number, w: number) {
  b.cyl(r, r, w, 12, { pos: [x, y, z], rot: [0, 0, X], color: P.tyre });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.box([w + 0.02, 0.08, r * 0.3], { pos: [x, y + Math.cos(a) * r, z + Math.sin(a) * r], rot: [-a, 0, 0], color: "#3a3a3a" });
  }
  b.cyl(r * 0.5, r * 0.5, w + 0.03, 8, { pos: [x, y, z], rot: [0, 0, X], color: P.gold });
  b.cyl(r * 0.18, r * 0.18, w + 0.06, 6, { pos: [x, y, z], rot: [0, 0, X], color: P.metalLight });
}

/**
 * Ride-on mower: a red tractor with headlights, grille, padded seat, steering
 * wheel, chrome exhaust and a spiked roller drum, on a striped platform with
 * a ramp, under a marquee board ringed with bulbs (its name is printed on it).
 */
export function mowerStand(b: PartBuilder): LocalCollider[] {
  b.box([5, 0.4, 3.6], { pos: [0, 0.2, 0], color: "#9a6a3c", top: "#b07c48" });
  for (let i = 0; i < 10; i++) b.box([0.5, 0.05, 0.12], { pos: [-2.25 + i * 0.5, 0.42, 1.74], color: i % 2 ? P.gold : C.hazard });
  b.box([1.8, 0.12, 0.9], { pos: [0, 0.2, 2.2], rot: [-0.3, 0, 0], color: P.wood, top: "#9c6a40" });
  for (const x of [-2.35, 2.35]) for (const z of [-1.65, 1.65]) b.cyl(0.07, 0.07, 0.8, 6, { pos: [x, 0.8, z], color: P.gold });
  const y0 = 0.4;
  const red = "#d63a2f";
  const redTop = "#ef5a4c";
  // Chassis, hood with grille + headlights, rear body.
  b.box([1.3, 0.35, 2.3], { pos: [0, y0 + 0.55, 0.05], color: "#3a3a3a" });
  b.box([1.2, 0.55, 1.0], { pos: [0, y0 + 0.95, 0.65], color: red, top: redTop });
  b.box([1.0, 0.12, 0.9], { pos: [0, y0 + 1.27, 0.6], rot: [0.12, 0, 0], color: redTop });
  b.box([0.9, 0.38, 0.05], { pos: [0, y0 + 0.93, 1.16], color: "#1f1f1f" });
  for (let i = 0; i < 5; i++) b.box([0.05, 0.32, 0.06], { pos: [-0.32 + i * 0.16, y0 + 0.93, 1.18], color: P.metalLight });
  for (const s of [-1, 1]) b.cyl(0.11, 0.11, 0.06, 8, { pos: [s * 0.45, y0 + 1.12, 1.17], rot: [X, 0, 0], color: "#fff4c0", glow: true });
  b.box([1.3, 0.5, 0.9], { pos: [0, y0 + 0.95, -0.55], color: red, top: redTop });
  for (const s of [-1, 1]) b.box([0.4, 0.06, 1.1], { pos: [s * 0.85, y0 + 1.0, -0.55], color: "#a82a20" }); // fenders
  // Seat, steering wheel, exhaust, flag.
  b.box([0.75, 0.14, 0.6], { pos: [0, y0 + 1.27, -0.6], color: "#1f1f1f", top: "#3a3a3a" });
  b.box([0.75, 0.55, 0.14], { pos: [0, y0 + 1.55, -0.92], rot: [-0.15, 0, 0], color: "#1f1f1f", top: "#3a3a3a" });
  b.cyl(0.04, 0.04, 0.7, 5, { pos: [0, y0 + 1.5, 0.05], rot: [-0.55, 0, 0], color: P.iron });
  b.cyl(0.26, 0.26, 0.05, 12, { pos: [0, y0 + 1.8, -0.12], rot: [-0.55 + X, 0, 0], color: P.tyre });
  b.cyl(0.07, 0.07, 0.07, 6, { pos: [0, y0 + 1.82, -0.1], rot: [-0.55 + X, 0, 0], color: P.gold });
  b.cyl(0.07, 0.08, 0.9, 6, { pos: [0.48, y0 + 1.55, 0.4], color: P.metalLight });
  b.cyl(0.1, 0.1, 0.08, 6, { pos: [0.48, y0 + 2.02, 0.4], color: P.iron });
  b.cyl(0.02, 0.02, 1.2, 4, { pos: [-0.55, y0 + 1.8, -1.0], color: P.iron });
  b.box([0.03, 0.26, 0.4], { pos: [-0.55, y0 + 2.27, -0.8], color: P.gold });
  // Wheels: big at the back, small at the front.
  for (const s of [-1, 1]) {
    wheel(b, s * 0.82, y0 + 0.45, -0.65, 0.45, 0.32);
    wheel(b, s * 0.78, y0 + 0.3, 0.75, 0.3, 0.24);
  }
  // Spiked roller drum on two arms.
  const dz = 1.55;
  const dy = y0 + 0.38;
  b.cyl(0.35, 0.35, 1.6, 10, { pos: [0, dy, dz], rot: [0, 0, X], color: P.metal });
  for (const x of [-0.82, 0.82]) b.box([0.08, 0.12, 0.8], { pos: [x, dy + 0.12, dz - 0.4], color: P.iron });
  for (let row = 0; row < 4; row++)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + row * 0.5;
      b.cyl(0, 0.07, 0.2, 4, { pos: [-0.6 + row * 0.4, dy + Math.cos(a) * 0.43, dz + Math.sin(a) * 0.43], rot: [a, 0, 0], color: P.metalLight });
    }
  // Marquee board with bulbs.
  for (const x of [-2.0, 2.0]) b.cyl(0.12, 0.12, 3.6, 6, { pos: [x, 2.2, -1.5], color: P.wood });
  b.box([4.4, 1.4, 0.12], { pos: [0, 3.45, -1.58], color: P.wood });
  b.box([4.2, 1.25, 0.15], { pos: [0, 3.45, -1.5], color: "#b8261c", top: red });
  for (let i = 0; i < 11; i++) {
    const x = -1.95 + (i * 3.9) / 10;
    for (const y of [2.88, 4.02]) b.ico(0.08, 0, { pos: [x, y, -1.4], color: P.bulb, glow: true });
  }
  return [{ kind: "box", x: 0, z: 0, hx: 2.5, hz: 1.85 }];
}

/** 2X Cash sign: teal board on posts with three bulbs. */
export function cashSign(b: PartBuilder): LocalCollider[] {
  for (const x of [-0.9, 0.9]) b.cyl(0.1, 0.11, 2.4, 6, { pos: [x, 1.2, 0], color: P.wood });
  b.box([2.35, 1.25, 0.08], { pos: [0, 1.9, -0.08], color: P.wood });
  b.box([2.2, 1.1, 0.12], { pos: [0, 1.9, 0], color: P.signTeal, top: "#27b5a3" });
  for (const x of [-0.6, 0, 0.6]) b.ico(0.12, 1, { pos: [x, 2.62, 0], color: P.bulb, glow: true });
  return [{ kind: "box", x: 0, z: 0, hx: 1.2, hz: 0.25 }];
}

/**
 * Nuke: a green missile on an octagonal launch pad with hazard stripes, an
 * orange gantry with a red warning beacon and a big red button on a post.
 */
export function nuke(b: PartBuilder): LocalCollider[] {
  b.cyl(1.15, 1.25, 0.35, 8, { pos: [0, 0.175, 0], color: P.stone, top: P.stoneTop, jitter: 0.05 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.box([0.42, 0.04, 0.16], { pos: [Math.sin(a) * 1.0, 0.37, Math.cos(a) * 1.0], rot: [0, a, 0], color: i % 2 ? P.gold : C.hazard });
  }
  b.cyl(0.5, 0.55, 0.25, 8, { pos: [0, 0.48, 0], color: P.iron });
  // Gantry: two rails, cross braces, beacon.
  for (const x of [-0.62, 0.62]) b.box([0.12, 3.1, 0.12], { pos: [x, 1.9, -0.25], color: "#e8742a" });
  for (const y of [1.2, 2.2, 3.2]) b.box([1.36, 0.08, 0.08], { pos: [0, y, -0.25], color: "#e8742a" });
  b.box([0.08, 1.2, 0.08], { pos: [0, 2.7, -0.25], rot: [0, 0, 0.85], color: "#c85a1a" });
  b.box([1.5, 0.48, 0.06], { pos: [0, 3.7, -0.25], color: "#c85a1a" }); // name board
  b.ico(0.12, 0, { pos: [0, 4.04, -0.25], color: "#ff3b30", glow: true });
  // Missile: nozzle, green body, white band, radiation sign, red nose, fins.
  b.cyl(0.24, 0.3, 0.25, 8, { pos: [0, 0.72, 0], color: "#2a2a2a" });
  b.cyl(0.38, 0.38, 1.8, 10, { pos: [0, 1.75, 0], color: "#3f9a3a", top: "#5ac24f" });
  b.cyl(0.39, 0.39, 0.2, 10, { pos: [0, 2.35, 0], color: "#ffffff" });
  b.cyl(0.39, 0.39, 0.08, 10, { pos: [0, 1.1, 0], color: "#ffffff" });
  b.cyl(0.0, 0.38, 0.7, 10, { pos: [0, 3.0, 0], color: P.red, top: "#ef5a4c" });
  b.cyl(0.22, 0.22, 0.03, 12, { pos: [0, 1.7, 0.38], rot: [X, 0, 0], color: P.gold });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.box([0.1, 0.14, 0.02], { pos: [Math.sin(a) * 0.11, 1.7 + Math.cos(a) * 0.11, 0.4], rot: [0, 0, -a], color: C.hazard });
  }
  b.cyl(0.04, 0.04, 0.035, 6, { pos: [0, 1.7, 0.4], rot: [X, 0, 0], color: C.hazard });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    b.box([0.06, 0.6, 0.45], { pos: [Math.sin(a) * 0.45, 1.05, Math.cos(a) * 0.45], rot: [0, a, 0], color: P.red, top: "#ef5a4c" });
  }
  // Big red button on a post at the front.
  b.box([0.12, 0.8, 0.12], { pos: [0.85, 0.75, 0.75], color: P.iron });
  b.box([0.36, 0.2, 0.36], { pos: [0.85, 1.2, 0.75], color: P.gold });
  b.ico(0.14, 0, { pos: [0.85, 1.34, 0.75], scale: [1, 0.6, 1], color: "#ff3b30", glow: true });
  return [{ kind: "box", x: 0, z: 0, hx: 1.15, hz: 1.15 }];
}

/** Money box: banded treasure chest with coins on a stone pedestal. */
export function moneyBox(b: PartBuilder): LocalCollider[] {
  pedestal(b);
  b.box([1.0, 0.55, 0.7], { pos: [0, 1.37, 0], color: "#8a5328", top: "#9c6232" });
  b.box([1.04, 0.25, 0.74], { pos: [0, 1.76, 0], color: "#9c6232" });
  b.box([1.0, 0.12, 0.5], { pos: [0, 1.94, 0], color: "#a86a38" });
  for (const x of [-0.3, 0.3]) b.box([0.08, 0.95, 0.76], { pos: [x, 1.55, 0], color: P.gold });
  b.box([0.18, 0.2, 0.06], { pos: [0, 1.6, 0.38], color: P.gold });
  for (let i = 0; i < 4; i++)
    b.cyl(0.13, 0.13, 0.05, 8, { pos: [b.rand(-0.6, 0.6), 1.12, 0.6 + b.rand(-0.1, 0.15)], color: P.gold });
  return [{ kind: "box", x: 0, z: 0, hx: 0.9, hz: 0.9 }];
}
