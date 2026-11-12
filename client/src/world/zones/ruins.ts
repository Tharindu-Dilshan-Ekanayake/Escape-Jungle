import { ZONES1 } from "../../config/zones1";
import type { PartBuilder } from "../geo/PartBuilder";

/**
 * Ancient ruins, one landmark per zone, standing at the jungle edge and facing
 * into the grass: a stepped temple with a shrine, a carved gateway with
 * statues and lamps, a colonnade, a small shrine on stairs. Mossy stone,
 * strangler-fig roots spilling over, glowing lamps and fireflies.
 * Box-built (cheap), baked into the chunk meshes; glow parts go to the glow mesh.
 */
const S = {
  stone: "#6f7266",
  stoneTop: "#8c8f80",
  dark: "#4a4c44",
  moss: "#4f7a2a",
  mossTop: "#78a83c",
  void: "#14140f",
  root: "#5a4632",
  rootTop: "#7a6448",
  lamp: "#ffcf6a",
  fly: "#d8ff8a",
};

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
const overlap = (a: Rect, b: Rect, m: number) => a.minX - m < b.maxX && a.maxX + m > b.minX && a.minZ - m < b.maxZ && a.maxZ + m > b.minZ;

export interface RuinSpot {
  x: number;
  z: number;
  /** Faces into the zone (+Z of the ruin points here). */
  rotY: number;
  kind: number;
}

/** Each zone's ruin: on a side of its rect that has neither its corridor nor its exit, just outside the grass. */
export function ruinSpots(): RuinSpot[] {
  return ZONES1.map((zn, i) => {
    const r = zn.rect;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    const out = 6.5;
    const sides = [
      { x: cx, z: r.minZ - out, rotY: 0, edge: { minX: r.minX, maxX: r.maxX, minZ: r.minZ - 2, maxZ: r.minZ + 2 } },
      { x: r.maxX + out, z: cz, rotY: -Math.PI / 2, edge: { minX: r.maxX - 2, maxX: r.maxX + 2, minZ: r.minZ, maxZ: r.maxZ } },
      { x: cx, z: r.maxZ + out, rotY: Math.PI, edge: { minX: r.minX, maxX: r.maxX, minZ: r.maxZ - 2, maxZ: r.maxZ + 2 } },
      { x: r.minX - out, z: cz, rotY: Math.PI / 2, edge: { minX: r.minX - 2, maxX: r.minX + 2, minZ: r.minZ, maxZ: r.maxZ } },
    ];
    const busy = (e: Rect) => ZONES1.some((o) => overlap(e, o.corridor, 3) || overlap(e, o.exit, 3) || Math.hypot(o.base.x - (e.minX + e.maxX) / 2, o.base.z - (e.minZ + e.maxZ) / 2) < o.base.r + 12);
    const pick = sides.find((s) => !busy(s.edge)) ?? sides[(i + 2) % 4];
    return { x: pick.x, z: pick.z, rotY: pick.rotY, kind: i % 4 };
  });
}

function block(b: PartBuilder, x: number, y: number, z: number, w: number, h: number, d: number, mossy = false) {
  b.box([w, h, d], { pos: [x, y, z], rot: [0, b.rand(-0.04, 0.04), b.rand(-0.02, 0.02)], color: S.stone, top: mossy ? S.moss : S.stoneTop, jitter: 0.08 });
}

function stairs(b: PartBuilder, w: number, steps: number, rise: number, run: number, z0: number) {
  for (let k = 0; k < steps; k++) block(b, 0, rise * (k + 0.5), z0 - k * run, w - k * 0.1, rise, run + 0.02, k % 3 === 2);
}

/** Strangler-fig roots spilling down a wall from (x, top) to the ground. */
function roots(b: PartBuilder, x: number, top: number, z: number, n: number) {
  for (let k = 0; k < n; k++) {
    const ox = x + (k - (n - 1) / 2) * 0.35 + b.rand(-0.1, 0.1);
    const h = top * b.rand(0.6, 1);
    b.cyl(0.05, 0.1, h, 4, { pos: [ox, top - h / 2, z + b.rand(-0.05, 0.05)], rot: [b.rand(-0.15, 0.15), 0, b.rand(-0.12, 0.12)], color: S.root, top: S.rootTop });
  }
  b.leaf(1.3, 0.8, { pos: [x, top + 0.1, z], rot: [0.9, 0, 0], color: S.moss, top: S.mossTop });
}

function pillar(b: PartBuilder, x: number, z: number, h: number) {
  b.box([0.75, 0.3, 0.75], { pos: [x, 0.15, z], color: S.dark });
  for (let k = 0; k < 3; k++) block(b, x, 0.3 + (h / 3) * (k + 0.5), z, 0.55, h / 3 - 0.02, 0.55);
  b.box([0.8, 0.28, 0.8], { pos: [x, h + 0.44, z], color: S.stone, top: S.moss });
}

function lamp(b: PartBuilder, x: number, y: number, z: number) {
  b.box([0.22, 0.28, 0.22], { pos: [x, y, z], color: S.lamp, glow: true });
  b.box([0.3, 0.06, 0.3], { pos: [x, y + 0.17, z], color: S.dark });
}

function fireflies(b: PartBuilder, n: number, w: number, h: number) {
  for (let k = 0; k < n; k++) b.ico(0.05, 0, { pos: [b.rand(-w, w), b.rand(0.6, h), b.rand(-2, 3)], color: S.fly, glow: true });
}

/** Stepped temple with a little shrine on top (first picture). */
function temple(b: PartBuilder) {
  for (let t = 0; t < 3; t++) block(b, 0, 0.6 + t * 1.2, -2.2 - t * 0.6, 7 - t * 1.8, 1.2, 6 - t * 1.6, true);
  stairs(b, 2.2, 9, 0.4, 0.42, 1.6);
  block(b, 0, 4.4, -3.6, 2.4, 1.8, 2.2);
  b.box([0.8, 1.2, 0.1], { pos: [0, 4.2, -2.45], color: S.void });
  b.box([2.8, 0.4, 2.6], { pos: [0, 5.5, -3.6], color: S.stone, top: S.moss });
  b.cyl(0, 1.3, 1.2, 4, { pos: [0, 6.3, -3.6], rot: [0, Math.PI / 4, 0], color: S.stone, top: S.mossTop });
  for (const sx of [-1, 1]) {
    lamp(b, sx * 1.4, 1.7, 1.2);
    roots(b, sx * 2.9, 2.4, -0.4, 4);
  }
  fireflies(b, 9, 4, 5);
}

/** Carved gateway with guardian statues and lamps (second picture). */
function gateway(b: PartBuilder) {
  for (const sx of [-1, 1]) {
    block(b, sx * 1.9, 2.0, 0, 1.4, 4, 1.4, true);
    // Guardian statue in a niche.
    b.box([0.9, 1.6, 0.1], { pos: [sx * 1.9, 2.0, 0.72], color: S.void });
    b.box([0.45, 0.9, 0.4], { pos: [sx * 1.9, 1.7, 0.8], color: S.stoneTop });
    b.box([0.34, 0.34, 0.34], { pos: [sx * 1.9, 2.35, 0.8], color: S.stoneTop });
    lamp(b, sx * 2.9, 1.3, 0.9);
    roots(b, sx * 2.6, 4.2, 0.6, 5);
  }
  b.box([5.4, 0.9, 1.6], { pos: [0, 4.45, 0], color: S.stone, top: S.moss, jitter: 0.06 });
  b.box([3.2, 0.5, 0.12], { pos: [0, 4.4, 0.82], color: S.dark });
  for (let k = 0; k < 5; k++) b.box([0.4, 0.4, 0.1], { pos: [-1.2 + k * 0.6, 4.4, 0.86], rot: [0, 0, 0.785], color: S.stoneTop });
  b.box([2.4, 3.6, 0.2], { pos: [0, 1.8, -0.4], color: S.void });
  stairs(b, 3.2, 4, 0.3, 0.45, 1.6);
  // A broken wall running off into the jungle behind.
  for (let k = 0; k < 4; k++) block(b, 3.8 + k * 1.5, 1.0 - k * 0.15, -0.6 - k * 0.3, 1.4, 2 - k * 0.3, 0.9, k % 2 === 0);
  fireflies(b, 10, 4, 4);
}

/** Colonnade: two rows of mossy pillars, a fallen one, a lintel still standing (third picture). */
function colonnade(b: PartBuilder) {
  b.box([7.5, 0.35, 5], { pos: [0, 0.17, -1.5], color: S.dark, top: S.moss });
  for (const z of [0, -3]) for (let k = 0; k < 4; k++) if (!(z === 0 && k === 3)) pillar(b, -2.7 + k * 1.8, z, 3.2);
  b.box([5.6, 0.5, 0.9], { pos: [-0.9, 4.0, 0], color: S.stone, top: S.moss });
  b.box([7.0, 0.5, 0.9], { pos: [0, 4.0, -3], color: S.stone, top: S.moss });
  // Fallen pillar drums.
  for (let k = 0; k < 3; k++) b.cyl(0.3, 0.3, 0.9, 6, { pos: [3.4 + k * 0.95, 0.65, 1.1 + k * 0.2], rot: [0, 0, Math.PI / 2], color: S.stone, top: S.moss });
  roots(b, -2.7, 4.0, 0.4, 4);
  roots(b, 0.9, 4.0, -2.6, 3);
  lamp(b, -0.9, 0.6, 1.2);
  fireflies(b, 9, 4, 4);
}

/** Small shrine on a flight of mossy stairs with lamps (fourth picture). */
function shrine(b: PartBuilder) {
  stairs(b, 2.4, 7, 0.32, 0.5, 2.2);
  block(b, 0, 1.2, -2.6, 4.2, 2.4, 3.6, true);
  block(b, 0, 3.4, -2.8, 2.6, 2.0, 2.4);
  b.box([1.0, 1.5, 0.1], { pos: [0, 3.2, -1.55], color: S.void });
  b.box([3.2, 0.35, 3.0], { pos: [0, 4.55, -2.8], color: S.stone, top: S.moss });
  b.box([0.5, 0.5, 0.5], { pos: [0, 5.0, -2.8], rot: [0, 0.785, 0], color: S.stoneTop });
  for (const sx of [-1, 1]) {
    b.box([0.3, 1.1, 0.3], { pos: [sx * 1.6, 0.55, 2.4], color: S.stone, top: S.moss });
    lamp(b, sx * 1.6, 1.25, 2.4);
    roots(b, sx * 1.8, 2.4, -0.8, 3);
  }
  fireflies(b, 10, 3, 4);
}

const BUILD = [temple, gateway, colonnade, shrine];

export function addZoneRuins(b: PartBuilder) {
  for (const r of ruinSpots()) {
    b.push([r.x, 0, r.z], r.rotY);
    BUILD[r.kind](b);
    b.pop();
  }
}
