import { ZONES1 } from "../../config/zones1";
import { MISTY as K } from "../../config/mistyForest";
import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import { bush } from "../props/nature";
import { leafPuff } from "../props/storyTree";

type Point = () => { x: number; z: number } | null;

/** Tall thin dark trunk disappearing up into the mist, with a few leaves near the top. */
function tallTrunk(b: PartBuilder, x: number, z: number, h: number) {
  const r = b.rand(0.22, 0.4);
  b.cyl(r * 0.7, r, h, 5, { pos: [x, h / 2, z], rot: [b.rand(-0.04, 0.04), 0, b.rand(-0.04, 0.04)], color: "#24302a", top: "#3a4a3a" });
  b.box([r * 2.2, r * 1.6, r * 0.5], { pos: [x, r * 0.6, z], rot: [0.4, b.rand(0, 3), 0], color: "#24302a" });
  for (let i = 0; i < 3; i++) b.leaf(2.2, 0.9, { pos: [x, h - 2 - i * 1.5, z], rot: [0.5, b.rand(0, 6.28), 0], color: "#163a2a", top: "#24543a" });
}

/** Liana sagging between two points (x0, z0) -> (x1, z1) at height y, with dark leaves along it. */
function liana(b: PartBuilder, x0: number, z0: number, x1: number, z1: number, y: number) {
  const segs = 7;
  let px = x0;
  let pz = z0;
  let py = y;
  for (let k = 1; k <= segs; k++) {
    const t = k / segs;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const yy = y - Math.sin(t * Math.PI) * K.lianas.sag;
    const dx = x - px;
    const dy = yy - py;
    const dz = z - pz;
    const len = Math.hypot(dx, dy, dz);
    // Segment as a thin box from the previous point to this one.
    b.push([(x + px) / 2, (yy + py) / 2, (z + pz) / 2], Math.atan2(dx, dz));
    b.box([0.07, 0.07, len], { pos: [0, 0, 0], rot: [-Math.atan2(dy, Math.hypot(dx, dz)), 0, 0], color: "#2a3a1c" });
    b.pop();
    if (k < segs) b.leaf(0.5, 0.32, { pos: [x, yy - 0.05, z], rot: [0.9, b.rand(0, 6.28), 0], color: "#1f4a2a", top: "#2f6a38" });
    px = x;
    py = yy;
    pz = z;
  }
}

/** Big boulder, blue-grey with a mossy back. */
function boulder(b: PartBuilder, x: number, z: number, s: number) {
  b.dodeca(s, { pos: [x, s * 0.35, z], scale: [1.5, 0.75, 1], rot: [b.rand(-0.2, 0.2), b.rand(0, 3), b.rand(-0.1, 0.1)], color: "#7a8a94", top: "#5f7a3a", jitter: 0.06 });
}

export function forest(b: PartBuilder, colliders: Collider[], at: Point, n: { trunks: number; lianas: number; boulders: number; ferns: number }, walkable: (x: number, z: number) => boolean) {
  for (let i = 0; i < n.trunks; i++) {
    const p = at();
    if (!p) continue;
    tallTrunk(b, p.x, p.z, b.rand(K.trunks.minH, K.trunks.maxH));
    if (walkable(p.x, p.z)) colliders.push({ kind: "circle", x: p.x, z: p.z, r: 0.4 });
  }
  for (let i = 0; i < n.lianas; i++) {
    const p = at();
    if (!p) continue;
    const a = b.rand(0, Math.PI * 2);
    const len = b.rand(K.lianas.len[0], K.lianas.len[1]);
    liana(b, p.x, p.z, p.x + Math.cos(a) * len, p.z + Math.sin(a) * len, b.rand(K.lianas.height[0], K.lianas.height[1]));
  }
  for (let i = 0; i < n.boulders; i++) {
    const p = at();
    if (!p) continue;
    const s = b.rand(1.2, 1.9);
    boulder(b, p.x, p.z, s);
    if (walkable(p.x, p.z)) colliders.push({ kind: "circle", x: p.x, z: p.z, r: s * 1.1 });
  }
  for (let i = 0; i < n.ferns; i++) {
    const p = at();
    if (p) bush(b, p.x, p.z, b.rand(1.0, 1.6));
  }
}

/** High canopy hanging over an area's edge (the "under the jungle roof" feeling). */
export function canopyOverhang(b: PartBuilder, at: Point, n: number) {
  for (let i = 0; i < n; i++) {
    const p = at();
    if (!p) continue;
    const y = b.rand(10.5, 15);
    const s = b.rand(3, 4.6);
    leafPuff(b, p.x, y, p.z, s * 1.3, CANOPY);
    const len = b.rand(3, 7);
    b.box([0.06, len, 0.06], { pos: [p.x + b.rand(-1, 1), y - len / 2 - 0.4, p.z + b.rand(-1, 1)], color: "#2c5a24" });
  }
}
const CANOPY = { dark: "#123a24", mid: "#1b4f30", light: "#2a6a3c", sun: "#3f8a4a" };

/**
 * The misty forest of tall dark trunks, lianas, boulders and ferns round the
 * Landing Site (`campPoint` gives free spots there) and round the Meadow.
 */
export function addMistyForest(b: PartBuilder, colliders: Collider[], campPoint: Point, walkable: (x: number, z: number) => boolean, blocked: (x: number, z: number) => boolean) {
  forest(b, colliders, campPoint, { trunks: K.trunks.camp, lianas: K.lianas.camp, boulders: K.boulders.camp, ferns: K.ferns.camp }, walkable);
  const r = ZONES1[0].rect;
  const meadowPoint: Point = () => {
    for (let t = 0; t < 30; t++) {
      const x = b.rand(r.minX - 10, r.maxX + 10);
      const z = b.rand(r.minZ - 10, r.maxZ + 6);
      if (blocked(x, z) || Math.hypot(x, z) < 24) continue;
      return { x, z };
    }
    return null;
  };
  forest(b, colliders, meadowPoint, { trunks: K.trunks.meadow, lianas: K.lianas.meadow, boulders: K.boulders.meadow, ferns: K.ferns.meadow }, walkable);
}
