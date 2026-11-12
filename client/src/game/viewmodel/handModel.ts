import type { BufferGeometry } from "three";
import { PartBuilder, type V3 } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";

/**
 * The explorer's right hand gripping the tool handle (grip at the origin, axis
 * +Y), with a leather wrist band, forearm and rolled-up khaki sleeve running
 * back toward the camera. Low-poly, flat-shaded vertex colours.
 */
const C = {
  skin: "#d99a6c",
  skinLight: "#e8b48a",
  skinDark: "#b97a50",
  nail: "#f0c9a8",
  band: "#5a3a1e",
  bandMetal: "#c9a24a",
  sleeve: "#7d7048",
  sleeveLight: "#a09060",
  cuff: "#b3a273",
};

/** Euler (YXZ) that turns +Y onto the unit direction d. */
function alignY(d: V3): V3 {
  const rx = Math.acos(Math.max(-1, Math.min(1, d[1])));
  const s = Math.sin(rx);
  const ry = s > 1e-5 ? Math.atan2(d[0] / s, d[2] / s) : 0;
  return [rx, ry, 0];
}

export function buildHand(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(23));
  // Fingers wrap the front (-Z) and curl onto the left (-X) side; knuckles face +X.
  const rows = [0.088, 0.056, 0.024, -0.008];
  rows.forEach((y, i) => {
    const s = i === 3 ? 0.85 : 1;
    b.box([0.03, 0.028 * s, 0.03], { pos: [0.03, y, -0.03], color: C.skinDark, top: C.skin, jitter: 0.05 });
    b.box([0.062, 0.027 * s, 0.026], { pos: [0, y, -0.045], color: C.skin, top: C.skinLight, jitter: 0.05 });
    b.box([0.024, 0.026 * s, 0.042], { pos: [-0.037, y, -0.02], color: C.skin, top: C.skinLight, jitter: 0.05 });
    b.box([0.006, 0.016 * s, 0.018], { pos: [-0.05, y, -0.012], color: C.nail });
  });
  // Back of the hand (knuckle side) and the palm heel behind the grip.
  b.box([0.03, 0.13, 0.08], { pos: [0.036, 0.04, 0.004], color: C.skinDark, top: C.skin });
  b.box([0.066, 0.12, 0.03], { pos: [-0.006, 0.02, 0.04], color: C.skin, top: C.skinLight });
  // Thumb: base on the left/back, tip lying over the index finger.
  b.box([0.03, 0.05, 0.034], { pos: [-0.03, 0.074, 0.028], rot: [0.3, 0, 0.2], color: C.skin, top: C.skinLight });
  b.box([0.026, 0.026, 0.06], { pos: [-0.04, 0.108, -0.012], rot: [-0.15, 0.25, 0], color: C.skin, top: C.skinLight });
  b.box([0.008, 0.016, 0.02], { pos: [-0.054, 0.112, -0.034], rot: [-0.15, 0.25, 0], color: C.nail });

  // Wrist -> forearm -> sleeve, heading down/back toward the camera.
  const d: V3 = [0.25, -0.55, 0.8];
  const len = Math.hypot(...d);
  const dir: V3 = [d[0] / len, d[1] / len, d[2] / len];
  const rot = alignY([-dir[0], -dir[1], -dir[2]]);
  const at = (t: number): V3 => [0.012 + dir[0] * t, -0.03 + dir[1] * t, 0.02 + dir[2] * t];
  const seg = (t0: number, t1: number, r0: number, r1: number, color: string, top: string) =>
    b.cyl(r0, r1, t1 - t0, 9, { pos: at((t0 + t1) / 2), rot, color, top });
  seg(0.0, 0.07, 0.036, 0.04, C.skin, C.skinDark);
  seg(0.045, 0.085, 0.043, 0.043, C.band, C.band);
  b.box([0.02, 0.02, 0.012], { pos: at(0.065), rot, color: C.bandMetal });
  seg(0.08, 0.26, 0.042, 0.05, C.skinDark, C.skin);
  seg(0.25, 0.31, 0.062, 0.062, C.cuff, C.cuff);
  seg(0.3, 0.75, 0.066, 0.075, C.sleeve, C.sleeveLight);
  return b.build().solid[0].geometry;
}
