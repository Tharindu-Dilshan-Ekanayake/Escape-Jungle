import { LOBBY_LAYOUT } from "@shared";
import { LOBBY_VIEW as L } from "../../config/lobby";
import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import { stringLights } from "../props/decor";

/**
 * Lobby dressing, baked into the merged chunk meshes (almost free at runtime):
 * flower pots round the open centre, a paved walkway from the spawn to the
 * pads (the glowing arrows run along it), lawn islands with flowers under the
 * park trees, string lights between the lamps and a big expedition sign behind the pads.
 */
export const ARCH_Z = LOBBY_LAYOUT.pads[0].z + 3.4;

const C = {
  cream: "#f3e2b8",
  gold: "#e8b94a",
  path: "#cfae78",
  pathEdge: "#a8875a",
  lawn: "#6fb34a",
  lawnTop: "#86c95a",
  bulbs: ["#ffd27a", "#ff9a7a", "#9ad8ff", "#c8ff8a", "#ffb0e0"],
  petals: ["#ff6fae", "#ffd23f", "#ff8c2a", "#b77bff", "#ffffff"],
  pot: "#b5603a",
  potTop: "#d07a4a",
  stone: "#bfb3a0",
  stoneTop: "#d8cdb9",
  wood: "#7a4b2a",
  sign: "#f3e6c4",
  vine: "#2f7a3a",
};

function flowers(b: PartBuilder, x: number, z: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const a = b.rand(0, Math.PI * 2);
    const d = Math.sqrt(b.rand(0, 1)) * r;
    const fx = x + Math.cos(a) * d;
    const fz = z + Math.sin(a) * d;
    const h = b.rand(0.18, 0.35);
    b.box([0.03, h, 0.03], { pos: [fx, h / 2 + 0.06, fz], color: "#3f8f3a" });
    b.ico(b.rand(0.07, 0.11), 0, { pos: [fx, h + 0.08, fz], scale: [1, 0.6, 1], color: C.petals[i % C.petals.length], jitter: 0.1 });
  }
}

export function addLobbyDecor(b: PartBuilder, colliders: Collider[]) {
  const c = L.centre;
  // Flower pots around the open centre (kept clear of the walkway).
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = c.x + Math.sin(a) * (c.r + 1.9);
    const z = c.z + Math.cos(a) * (c.r + 1.9);
    if (Math.abs(x - L.arrows.x) < 2) continue;
    b.cyl(0.32, 0.24, 0.42, 8, { pos: [x, 0.25, z], color: C.pot, top: C.potTop });
    b.ico(0.38, 0, { pos: [x, 0.62, z], scale: [1, 0.7, 1], color: "#3f8f4f", top: "#55aa62" });
    flowers(b, x, z, 0.3, 5);
    colliders.push({ kind: "circle", x, z, r: 0.35, h: 0.75 });
  }
  // Walkway from the spawn to the arch (the arrows glow along it).
  const z0 = ARCH_Z - 0.5;
  const z1 = LOBBY_LAYOUT.bounds.maxZ;
  const len = z1 - z0;
  b.box([2.4, 0.03, len], { pos: [L.arrows.x, 0.043, z0 + len / 2], color: C.path });
  for (const sx of [-1, 1]) b.box([0.16, 0.034, len], { pos: [L.arrows.x + sx * 1.25, 0.045, z0 + len / 2], color: C.pathEdge });
  // Lawn islands with flowers under the park trees.
  for (const [x, z] of L.parkTrees) {
    b.cyl(2.7, 2.8, 0.08, 14, { pos: [x, 0.05, z], color: C.lawn, top: C.lawnTop });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      b.dodeca(0.16, { pos: [x + Math.cos(a) * 2.8, 0.1, z + Math.sin(a) * 2.8], scale: [1.3, 0.6, 1], color: C.stone, top: C.stoneTop });
    }
    flowers(b, x, z, 2.4, 22);
  }
  // String lights around the centre square and out to the side lamps.
  const lampAt = (x: number, z: number) => L.lamps.some(([lx, lz]) => lx === x && lz === z);
  const pairs: [number, number, number, number][] = [
    [-5, 8, 5, 8],
    [-5, -4, 5, -4],
    [-5, -4, -5, 8],
    [5, -4, 5, 8],
    [-5, -4, -13, -6],
    [5, -4, 13, -6],
  ];
  for (const [x0, zz0, x1, zz1] of pairs) if (lampAt(x0, zz0) && lampAt(x1, zz1)) stringLights(b, x0, zz0, x1, zz1, 3.95, 0.3);
  // Big "JUNGLE EXPEDITION" sign standing behind the back row of pads (its words are a banner).
  const { x: sx0, z: sz, halfW, y: sy, h: sh } = BIG_SIGN;
  for (const s of [-1, 1]) {
    const px = sx0 + s * (halfW + 0.2);
    b.cyl(0.32, 0.4, sy + sh / 2 + 0.9, 7, { pos: [px, (sy + sh / 2 + 0.9) / 2, sz], color: C.wood, top: "#9c6a3c", jitter: 0.06 });
    b.ico(0.42, 0, { pos: [px, sy + sh / 2 + 1.0, sz], color: C.stoneTop });
    for (let k = 0; k < 7; k++) b.leaf(0.8, 0.4, { pos: [px + s * 0.32, 0.8 + k * 0.85, sz + (k % 2 ? 0.25 : -0.25)], rot: [0.4, s * 1.4, 0], color: C.vine, top: "#4fae5c" });
    b.box([0.3, 0.4, 0.3], { pos: [px, sy - sh / 2 - 0.3, sz + 0.35], color: "#ffcf6a", glow: true });
    colliders.push({ kind: "circle", x: px, z: sz, r: 0.5 });
  }
  b.box([halfW * 2 + 0.5, sh + 0.4, 0.2], { pos: [sx0, sy, sz - 0.08], color: "#3a2412" });
  b.box([halfW * 2 + 1.2, 0.35, 0.7], { pos: [sx0, sy + sh / 2 + 0.35, sz], color: C.wood, top: "#9c6a3c" });
  for (let i = 0; i < 15; i++) b.ico(0.1, 0, { pos: [sx0 - halfW + (i * halfW * 2) / 14, sy + sh / 2 + 0.6, sz], color: C.bulbs[i % C.bulbs.length], glow: true });
}

/** The big expedition sign behind the pads (centre, half width, face height/centre). */
export const BIG_SIGN = { x: 0, z: LOBBY_LAYOUT.pads[LOBBY_LAYOUT.pads.length - 1].z - 5.3, halfW: 6.2, y: 6.3, h: 2.3 };

