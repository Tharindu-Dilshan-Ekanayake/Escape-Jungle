import { LOBBY_VIEW as L } from "../../config/lobby";
import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import { bush } from "../props/nature";
import { storyTree } from "../props/storyTree";
import { acaiPalm } from "../props/amazon";

/**
 * Static part of the lobby waterfall: a mossy rock cliff, a ledge the water
 * pours over, a stone-rimmed pool, reeds and trees on top. The falling water,
 * foam and mist are animated in LobbyLife.
 */
const C = {
  rock: "#7d7a72",
  rockTop: "#9a968c",
  rockDark: "#5e5b54",
  moss: "#4f8f3a",
  mossTop: "#7fbf4a",
  water: "#2f9fd8",
  waterTop: "#6fd3f5",
};

export function addWaterfall(b: PartBuilder, colliders: Collider[]) {
  const w = L.waterfall;
  const half = w.cliffWidth / 2;
  // Cliff: layers of big boulders, darker at the bottom, mossy on top.
  for (let layer = 0; layer < 4; layer++) {
    const y = 1.6 + layer * 3.1;
    const count = 9 - layer;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = w.x - half + t * w.cliffWidth + b.rand(-1, 1);
      if (Math.abs(x - w.x) < w.fallWidth / 2 + 0.6 && layer < 3) continue; // leave the waterfall channel
      const r = b.rand(2.4, 3.4) - layer * 0.25;
      b.dodeca(r, {
        pos: [x, y, w.z - b.rand(0, 1.5) - layer * 0.6],
        scale: [1.25, 0.95, 0.9],
        rot: [b.rand(0, 3), b.rand(0, 3), 0],
        color: layer === 0 ? C.rockDark : C.rock,
        top: layer === 3 ? C.mossTop : C.rockTop,
        jitter: 0.12,
      });
    }
  }
  // Channel walls and the lip the water pours over.
  for (const s of [-1, 1]) {
    b.box([1.4, w.height, 2.4], { pos: [w.x + s * (w.fallWidth / 2 + 0.6), w.height / 2, w.z - 0.4], color: C.rockDark, top: C.rock, jitter: 0.08 });
  }
  b.box([w.fallWidth + 2.4, 0.8, 3], { pos: [w.x, w.height, w.z - 0.2], color: C.rock, top: C.moss });
  b.box([w.fallWidth + 0.2, 0.12, 2.4], { pos: [w.x, w.height + 0.45, w.z - 0.4], color: C.water, top: C.waterTop });
  // Real jungle along the cliff top: storybook trees and palms set back, ferns and bushes at the edge.
  const onTop = (x: number, z: number, fn: () => void) => {
    b.push([x, w.height + 0.35, z]);
    fn();
    b.pop();
  };
  for (let i = 0; i < 9; i++) {
    const x = w.x - half + (i + 0.5) * (w.cliffWidth / 9) + b.rand(-0.8, 0.8);
    const overFall = Math.abs(x - w.x) < w.fallWidth / 2 + 1.2;
    if (!overFall) onTop(x, w.z - 1.2, () => bush(b, 0, 0, b.rand(1.1, 1.7)));
    if (i % 2 === 0 && !overFall) onTop(x + b.rand(-0.5, 0.5), w.z - 3.4, () => storyTree(b, 0, 0, b.rand(7, 9.5), 0.38));
    else if (!overFall) onTop(x, w.z - 3, () => acaiPalm(b, 0, 0, b.rand(6, 8.5)));
  }
  onTop(w.x, w.z - 3.6, () => bush(b, 0, 0, 1.3));
  // Vines hanging down the rock face (not over the falling water).
  for (let i = 0; i < 14; i++) {
    const x = w.x - half + 1 + b.rand(0, w.cliffWidth - 2);
    if (Math.abs(x - w.x) < w.fallWidth / 2 + 1.4) continue;
    const len = b.rand(3, 7);
    const z = w.z + 2.3;
    b.box([0.07, len, 0.07], { pos: [x, w.height - len / 2, z], color: "#2c5a24" });
    for (let k = 0; k < 3; k++) b.leaf(0.55, 0.36, { pos: [x, w.height - len * (0.25 + k * 0.3), z + 0.05], rot: [0.9, b.rand(0, 6.28), 0], color: "#2f7a32", top: "#5fbf4a" });
  }
  // Pool: water disc with a rocky rim and reeds.
  b.cyl(w.poolR, w.poolR + 0.2, 0.1, 16, { pos: [w.x, 0.04, w.poolZ], color: C.water, top: C.waterTop });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (Math.sin(a) > 0.82) continue; // open side toward the plaza
    b.dodeca(b.rand(0.35, 0.6), { pos: [w.x + Math.cos(a) * (w.poolR + 0.2), 0.2, w.poolZ + Math.sin(a) * (w.poolR + 0.2)], scale: [1.3, 0.6, 1], color: C.rock, top: C.rockTop, jitter: 0.15 });
  }
  for (let i = 0; i < 10; i++) {
    const a = b.rand(0, Math.PI * 2);
    const d = w.poolR + b.rand(0.4, 1.4);
    b.cyl(0.02, 0.03, b.rand(0.7, 1.3), 4, { pos: [w.x + Math.cos(a) * d, 0.5, w.poolZ + Math.sin(a) * d], color: "#5f8f3a", top: "#9bc25a" });
  }
  // Ferns and broad-leaf plants round the pool (not on the plaza side).
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    if (Math.sin(a) > 0.3) continue;
    bush(b, w.x + Math.cos(a) * (w.poolR + 1.3), w.poolZ + Math.sin(a) * (w.poolR + 1.3), b.rand(0.8, 1.3));
  }
  colliders.push({ kind: "circle", x: w.x, z: w.poolZ, r: w.poolR });
}

/** Mushroom stems (the caps are animated: they squash when you bounce). */
export function addMushroomStems(b: PartBuilder, colliders: Collider[]) {
  for (const [x, z] of L.mushrooms) {
    b.cyl(0.38, 0.5, 1.0, 8, { pos: [x, 0.5, z], color: "#f1e6cf", top: "#fff6e0" });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.ico(0.12, 0, { pos: [x + Math.cos(a) * 0.65, 0.08, z + Math.sin(a) * 0.65], color: "#7fbf4a" });
    }
    colliders.push({ kind: "circle", x, z, r: 0.45 });
  }
}
