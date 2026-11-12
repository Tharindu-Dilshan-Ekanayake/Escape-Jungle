import { LOBBY_LAYOUT } from "@shared";
import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";

/**
 * Expedition pads: a wooden boardwalk under each row, each pad a worn plank
 * square with a glowing outline, and a wooden signboard on posts behind it
 * (its face is a live canvas, see PadSignBoards.tsx). Static parts are baked into
 * the lobby chunk meshes.
 */
export const PAD_SIGN = {
  /** Board face size (m) and how far behind the pad it stands. */
  w: 3.0,
  h: 1.5,
  behind: 0.45,
  /** Face centre height: the back row stands taller so it shows over the front row. */
  yFront: 2.55,
  yBack: 3.65,
};

const W = { plank: "#9a6a3c", plankTop: "#b9824a", beam: "#6b4423", post: "#5a3a20", face: "#3a2412" };

/** Where pad i's sign face is (world), facing +Z (toward the spawn). */
export function padSignSpot(i: number) {
  const p = LOBBY_LAYOUT.pads[i];
  const back = p.z < -12;
  return { x: p.x, y: back ? PAD_SIGN.yBack : PAD_SIGN.yFront, z: p.z - LOBBY_LAYOUT.padSize / 2 - PAD_SIGN.behind };
}

/** Wooden boardwalk under one row of pads (centred on z = rowZ). */
export function boardwalk(b: PartBuilder, x0: number, x1: number, rowZ: number) {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const depth = LOBBY_LAYOUT.padSize + 1.4;
  const n = Math.round(depth / 0.48);
  for (let k = 0; k < n; k++) {
    b.box([len, 0.06, 0.42], { pos: [cx, 0.04, rowZ - depth / 2 + 0.24 + k * 0.48], color: W.plank, top: W.plankTop, jitter: 0.07 });
  }
  for (const s of [-1, 1]) b.box([len + 0.2, 0.12, 0.16], { pos: [cx, 0.06, rowZ + s * (depth / 2 + 0.05)], color: W.beam });
}

/** One pad on the boardwalk: worn light planks inside a glowing outline. */
export function expeditionPad(b: PartBuilder, size: number, crew: number) {
  b.box([size - 0.3, 0.02, size - 0.3], { pos: [0, 0.08, 0], color: "#d9c39a", top: "#ecdcb8", jitter: 0.05 });
  const e = 0.12;
  for (const s of [-1, 1]) {
    b.box([size, 0.04, e], { pos: [0, 0.1, s * (size / 2 - e / 2)], color: "#fff4d0", glow: true });
    b.box([e, 0.04, size], { pos: [s * (size / 2 - e / 2), 0.1, 0], color: "#fff4d0", glow: true });
  }
  padNumber(b, crew);
}

/** Seven-segment digit segments (a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle). */
const DIGITS: Record<number, string> = { 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc" };

/** The pad's crew size as a big glowing number on its floor (read from the plaza side). */
function padNumber(b: PartBuilder, n: number) {
  const w = 1.0;
  const h = 1.7;
  const t = 0.26;
  const y = 0.11;
  // "Up" on the floor is north (-Z): players walk in from the south.
  const seg: Record<string, [number, number, number, number]> = {
    a: [0, -h / 2, w, t],
    d: [0, h / 2, w, t],
    g: [0, 0, w, t],
    b: [w / 2, -h / 4, t, h / 2],
    c: [w / 2, h / 4, t, h / 2],
    f: [-w / 2, -h / 4, t, h / 2],
    e: [-w / 2, h / 4, t, h / 2],
  };
  // A dark inlay under the digit so it pops, then the lit segments.
  b.box([w + 0.7, 0.01, h + 0.7], { pos: [0, 0.095, 0], color: "#7a5a34" });
  const dx = n === 1 ? -w / 2 : 0; // a lone 1 sits in the middle
  for (const k of DIGITS[n] ?? "") {
    const [x, z, sx, sz] = seg[k];
    b.box([sx, 0.03, sz], { pos: [x + dx, y, z], color: "#d6ff4a", glow: true });
  }
}

/** Signboard frame behind pad i: two posts, a dark backing board, a little roof. */
export function padSignFrame(b: PartBuilder, colliders: Collider[], i: number) {
  const s = padSignSpot(i);
  const { w, h } = PAD_SIGN;
  for (const sx of [-1, 1]) {
    const px = s.x + sx * (w / 2 - 0.1);
    const ph = s.y + h / 2 + 0.1;
    b.cyl(0.07, 0.09, ph, 6, { pos: [px, ph / 2, s.z - 0.08], color: W.post });
    colliders.push({ kind: "circle", x: px, z: s.z - 0.08, r: 0.12 });
  }
  b.box([w + 0.16, h + 0.16, 0.08], { pos: [s.x, s.y, s.z - 0.06], color: W.face });
  b.box([w + 0.5, 0.08, 0.5], { pos: [s.x, s.y + h / 2 + 0.16, s.z], rot: [0.18, 0, 0], color: W.beam, top: W.plankTop });
}
