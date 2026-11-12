import { Vector3, type BufferGeometry } from "three";
import { PartBuilder } from "../world/geo/PartBuilder";
import { mulberry32 } from "../world/geo/rng";
import { INTRO } from "../config/cutscene";

/**
 * Parachute jumpers for the intro: a blocky person (feet at the origin,
 * facing +Z, arms up on the risers) and a striped canopy with suspension
 * lines (origin at the shoulders). Motion: freefall from the plane door, the
 * canopy snaps open with a bounce, then a guided, swaying descent that lands
 * exactly on the jumper's spot; after landing the canopy collapses.
 */
const LOOKS = {
  you: { shirt: "#6fae3a", shirtTop: "#8fce4a", pants: "#7a5a3a", skin: "#e0a878", hair: "#4a2a14", chute: ["#e8742a", "#fff4e0"] },
  rusty: { shirt: "#1f2f5a", shirtTop: "#2f4580", pants: "#1a2440", skin: "#e8b48a", hair: "#2a2a2a", chute: ["#d63a2f", "#fff4e0"] },
  red: { shirt: "#c0392b", shirtTop: "#e0503c", pants: "#3a3a48", skin: "#b07a52", hair: "#1a1a1a", chute: ["#2f6fd6", "#fff4e0"] },
  purple: { shirt: "#7a4fc0", shirtTop: "#9a6ae0", pants: "#4a4a5a", skin: "#f0c8a0", hair: "#c88a3a", chute: ["#f2c230", "#fff4e0"] },
};
export type JumperKind = keyof typeof LOOKS;

/** Height of the shoulders above the feet (canopy lines meet here). */
export const SHOULDER = 1.55;

export function jumperGeometry(kind: JumperKind): BufferGeometry {
  const L = LOOKS[kind];
  const b = new PartBuilder(Infinity, mulberry32(9100));
  for (const sx of [-0.13, 0.13]) {
    b.box([0.22, 0.72, 0.26], { pos: [sx, 0.36, 0], color: L.pants });
    b.box([0.24, 0.12, 0.32], { pos: [sx, 0.06, 0.03], color: "#2a2a2a" });
  }
  b.box([0.6, 0.72, 0.32], { pos: [0, 1.08, 0], color: L.shirt, top: L.shirtTop });
  // Harness straps and the pack on the back.
  for (const sx of [-0.17, 0.17]) b.box([0.07, 0.74, 0.34], { pos: [sx, 1.08, 0], color: "#2a2a2a" });
  b.box([0.5, 0.55, 0.2], { pos: [0, 1.15, -0.26], color: "#3a4a2a", top: "#4a5a34" });
  // Arms raised, hands on the risers.
  for (const sx of [-1, 1]) {
    b.box([0.2, 0.68, 0.22], { pos: [sx * 0.42, 1.62, 0], rot: [0, 0, sx * -0.25], color: L.shirt, top: L.skin });
    b.box([0.18, 0.16, 0.2], { pos: [sx * 0.5, 1.98, 0], color: L.skin });
  }
  b.box([0.42, 0.42, 0.42], { pos: [0, 1.68, 0.02], color: L.skin });
  b.box([0.44, 0.14, 0.44], { pos: [0, 1.92, 0.01], color: L.hair });
  if (kind === "rusty") b.box([0.48, 0.1, 0.52], { pos: [0, 1.99, 0.04], color: "#1a1a1a" }); // captain's cap
  for (const sx of [-0.09, 0.09]) b.box([0.06, 0.07, 0.02], { pos: [sx, 1.72, 0.235], color: "#1a1a1a" });
  return b.build().solid[0].geometry;
}

/** Striped canopy + suspension lines; origin at the shoulders. */
export function canopyGeometry(kind: JumperKind): BufferGeometry {
  const [c1, c2] = LOOKS[kind].chute;
  const b = new PartBuilder(Infinity, mulberry32(9200));
  const top = 3.4;
  const gores = 10;
  for (let k = 0; k < gores; k++) {
    const a = (k / gores) * Math.PI * 2;
    b.push([0, top, 0], a);
    // Inner and outer panel of each gore: a rounded dome.
    b.box([0.75, 0.05, 1.05], { pos: [0, -0.12, 0.6], rot: [0.32, 0, 0], color: k % 2 ? c2 : c1, top: k % 2 ? "#ffffff" : c1 });
    b.box([0.95, 0.05, 0.9], { pos: [0, -0.62, 1.48], rot: [0.85, 0, 0], color: k % 2 ? c2 : c1 });
    b.pop();
  }
  b.cyl(0.28, 0.28, 0.08, 10, { pos: [0, top + 0.05, 0], color: c1 });
  // Suspension lines from the rim down to the shoulders.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const rx = Math.sin(a) * 1.75;
    const rz = Math.cos(a) * 1.75;
    const ry = top - 0.95;
    const sx = Math.sin(a) * 0.3;
    const sz = Math.cos(a) * 0.12;
    const dx = rx - sx;
    const dy = ry - 0.3;
    const dz = rz - sz;
    const len = Math.hypot(dx, dy, dz);
    b.push([sx, 0.3, sz], Math.atan2(dx, dz));
    const t = Math.acos(dy / len);
    b.box([0.025, len, 0.025], { pos: [0, (Math.cos(t) * len) / 2, (Math.sin(t) * len) / 2], rot: [t, 0, 0], color: "#e8e2d2" });
    b.pop();
  }
  return b.build().solid[0].geometry;
}

const easeOutBack = (x: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

export interface JumperState {
  pos: Vector3;
  /** Heading (rotation.y) and body tilt (pitch, roll). */
  yaw: number;
  pitch: number;
  roll: number;
  /** Canopy: 0 = packed, 1 = open; collapse 0..1 after landing; visible at all. */
  canopy: number;
  collapse: number;
  out: boolean;
}

/**
 * Pose of jumper j at cutscene time t. `exit`/`vel` = plane door position and
 * the jumper's push-off velocity at the moment they jumped (filled by the director).
 */
export function jumperPose(j: (typeof INTRO.jumpers)[number], t: number, exit: Vector3, vel: Vector3, s: JumperState, tmp: Vector3) {
  const tau = t - j.exit;
  s.out = tau >= 0;
  if (!s.out) return;
  const ff = INTRO.freefallS;
  const g = INTRO.gravity;
  if (tau < ff) {
    // Freefall: tumble forward, belly to the ground.
    s.pos.copy(exit).addScaledVector(vel, tau);
    s.pos.y -= 0.5 * g * tau * tau;
    s.yaw = Math.atan2(vel.x, vel.z);
    s.pitch = Math.min(1.2, tau * 2.2);
    s.roll = Math.sin(tau * 9) * 0.25;
    s.canopy = 0;
    s.collapse = 0;
    return;
  }
  // Guided descent (cubic Hermite) from where the canopy opened to the landing spot.
  const p0x = exit.x + vel.x * ff;
  const p0y = exit.y + vel.y * ff - 0.5 * g * ff * ff;
  const p0z = exit.z + vel.z * ff;
  const v0x = vel.x * 0.3;
  const v0y = (vel.y - g * ff) * 0.25;
  const v0z = vel.z * 0.3;
  const T = Math.max(1, j.land - j.exit - ff);
  const u = Math.min(1, (tau - ff) / T);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  const [tx, tz] = j.to;
  const x = h00 * p0x + h10 * T * v0x + h01 * tx;
  // Height: holds altitude early (time to look around), then eases down for a soft landing.
  const sU = Math.pow(u, 1.5);
  const y = p0y * (1 - (3 * sU * sU - 2 * sU * sU * sU)) + h10 * T * v0y * 0.3;
  void h11;
  const z = h00 * p0z + h10 * T * v0z + h01 * tz;
  // Gentle swing under the canopy, fading out just before touchdown.
  const swing = Math.sin((tau - ff) * 1.7 + j.exit) * (1 - u) * 0.18;
  tmp.set(x, y, z).sub(s.pos);
  if (tmp.lengthSq() > 1e-6 && u < 0.98) s.yaw += Math.atan2(Math.sin(Math.atan2(tmp.x, tmp.z) - s.yaw), Math.cos(Math.atan2(tmp.x, tmp.z) - s.yaw)) * 0.08;
  s.pos.set(x, Math.max(0, y), z);
  s.pitch = swing * 0.6 * (u < 1 ? 1 : 0);
  s.roll = swing;
  const open = Math.min(1, (tau - ff) / INTRO.openS);
  s.canopy = easeOutBack(open);
  // Landed: the canopy flops over and collapses.
  s.collapse = t > j.land ? Math.min(1, (t - j.land) / INTRO.collapseS) : 0;
}
