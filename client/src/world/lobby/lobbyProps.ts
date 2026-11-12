import type { PartBuilder } from "../geo/PartBuilder";
import type { LocalCollider } from "../../game/player/collision";
import { PALETTE as P } from "../../config/palette";
import { LOBBY_VIEW as L } from "../../config/lobby";
import { bush, flower } from "../props/nature";
import { storyTree } from "../props/storyTree";


/** Party pad: dark base, lime inner tile, glowing border. Walkable (no collider). */
export function partyPad(b: PartBuilder, size: number) {
  b.box([size, 0.06, size], { pos: [0, 0.03, 0], color: L.pad.base });
  b.box([size - 0.6, 0.08, size - 0.6], { pos: [0, 0.05, 0], color: L.pad.inner, top: "#a6e35c" });
  const e = 0.18;
  for (const s of [-1, 1]) {
    b.box([size, 0.14, e], { pos: [0, 0.08, s * (size / 2 - e / 2)], color: L.pad.glow, glow: true });
    b.box([e, 0.14, size], { pos: [s * (size / 2 - e / 2), 0.08, 0], color: L.pad.glow, glow: true });
  }
}


/** Leaderboard board on posts (its title + list are printed banners, see buildLobby). */
export function board(b: PartBuilder): LocalCollider[] {
  for (const x of [-1.6, 1.6]) b.cyl(0.12, 0.12, 3.6, 6, { pos: [x, 1.8, 0], color: P.wood });
  b.box([3.4, 2.4, 0.12], { pos: [0, 2.4, -0.05], color: P.wood });
  b.box([3.1, 2.1, 0.14], { pos: [0, 2.4, 0], color: "#fff4d6", top: "#ffffff" });
  b.box([3.4, 0.35, 0.2], { pos: [0, 3.72, 0], color: P.signYellow });
  return [{ kind: "box", x: 0, z: 0, hx: 1.8, hz: 0.25 }];
}

export function lamp(b: PartBuilder): LocalCollider[] {
  b.cyl(0.08, 0.12, 3.4, 6, { pos: [0, 1.7, 0], color: P.iron });
  b.box([0.42, 0.08, 0.42], { pos: [0, 3.42, 0], color: P.iron });
  b.box([0.32, 0.4, 0.32], { pos: [0, 3.66, 0], color: P.lantern, glow: true });
  b.cyl(0.02, 0.3, 0.18, 4, { pos: [0, 3.95, 0], rot: [0, Math.PI / 4, 0], color: P.iron });
  return [{ kind: "circle", x: 0, z: 0, r: 0.25 }];
}

export function planter(b: PartBuilder): LocalCollider[] {
  b.box([2.2, 0.6, 2.2], { pos: [0, 0.3, 0], color: P.stone, top: P.stoneTop });
  // Capped rim stones.
  for (const [x, z, w, d] of [[0, 1.05, 2.3, 0.22], [0, -1.05, 2.3, 0.22], [1.05, 0, 0.22, 1.9], [-1.05, 0, 0.22, 1.9]] as [number, number, number, number][])
    b.box([w, 0.1, d], { pos: [x, 0.65, z], color: "#d8cdb9", jitter: 0.06 });
  b.box([1.9, 0.08, 1.9], { pos: [0, 0.62, 0], color: P.dirt });
  // A leafy shrub instead of a ball, flowers round it, ivy spilling over the edge.
  b.push([0, 0.62, 0]);
  bush(b, 0, 0, 0.75);
  b.pop();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    b.push([Math.cos(a) * 0.72, 0.62, Math.sin(a) * 0.72]);
    flower(b, 0, 0);
    b.pop();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.leaf(0.45, 0.22, { pos: [Math.cos(a) * 1.05, 0.66, Math.sin(a) * 1.05], rot: [1.1, Math.PI / 2 - a, 0], color: "#3f8f3a", top: "#6fbf4a" });
  }
  return [{ kind: "box", x: 0, z: 0, hx: 1.15, hz: 1.15 }];
}

/** Rounded park tree in a stone ring (lighter and friendlier than jungle trees). */
export function parkTree(b: PartBuilder): LocalCollider[] {
  b.cyl(1.3, 1.4, 0.45, 10, { pos: [0, 0.22, 0], color: P.stone, top: P.stoneTop });
  b.cyl(1.1, 1.1, 0.06, 10, { pos: [0, 0.46, 0], color: P.dirt });
  storyTree(b, 0, 0, 7.5, 0.34, { stones: true });
  return [{ kind: "circle", x: 0, z: 0, r: 1.45 }];
}

/** Wooden bench facing +Z. */
export function bench(b: PartBuilder): LocalCollider[] {
  b.box([2.2, 0.12, 0.6], { pos: [0, 0.5, 0], color: P.woodWarm, top: "#c98a4a" });
  b.box([2.2, 0.5, 0.1], { pos: [0, 0.85, -0.28], rot: [-0.15, 0, 0], color: P.woodWarm });
  for (const x of [-0.9, 0.9]) {
    b.box([0.1, 0.5, 0.5], { pos: [x, 0.25, 0], color: P.iron });
    b.box([0.08, 0.5, 0.08], { pos: [x, 0.75, -0.3], color: P.iron });
  }
  return [{ kind: "box", x: 0, z: 0, hx: 1.15, hz: 0.38, h: 0.95 }];
}

/** Low flower bed along +X, `len` metres long. */
export function flowerBed(b: PartBuilder, len: number): LocalCollider[] {
  b.box([len, 0.35, 1.2], { pos: [0, 0.17, 0], color: P.stone, top: P.stoneTop });
  b.box([len - 0.2, 0.06, 1.0], { pos: [0, 0.36, 0], color: P.dirt });
  const n = Math.round(len * 2.2);
  for (let i = 0; i < n; i++) {
    b.push([-len / 2 + 0.25 + (i / n) * (len - 0.5), 0.36, b.rand(-0.3, 0.3)]);
    flower(b, 0, 0);
    b.pop();
  }
  // Leafy clumps between the flowers.
  for (let i = 0; i < Math.round(len / 1.6); i++) {
    b.push([-len / 2 + 0.8 + i * 1.6, 0.36, b.rand(-0.25, 0.25)]);
    bush(b, 0, 0, 0.32);
    b.pop();
  }
  return [{ kind: "box", x: 0, z: 0, hx: len / 2, hz: 0.62, h: 0.6 }];
}

/** Straight fence run from (0,0) along +X for `len` metres. */
export function fence(b: PartBuilder, len: number) {
  const posts = Math.max(2, Math.round(len / 2.5) + 1);
  for (let i = 0; i < posts; i++) b.box([0.16, 1.1, 0.16], { pos: [(i / (posts - 1)) * len, 0.55, 0], color: P.wood });
  for (const y of [0.45, 0.85]) b.box([len, 0.1, 0.08], { pos: [len / 2, y, 0], color: "#9c6a3c" });
}

/** Bunting line from x0 to x1 at height h with alternating triangle flags. */
export function bunting(b: PartBuilder, x0: number, x1: number, h: number) {
  const len = x1 - x0;
  b.box([len, 0.03, 0.03], { pos: [x0 + len / 2, h, 0], color: "#f5f5f5" });
  const n = Math.floor(len / 0.8);
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * (len / n);
    const sag = Math.sin((i / (n - 1)) * Math.PI) * 0.5;
    b.cyl(0.22, 0, 0.45, 3, {
      pos: [x, h - sag - 0.22, 0],
      scale: [1, 1, 0.15],
      color: L.bunting.colors[i % L.bunting.colors.length],
    });
  }
}
