import type { PartBuilder } from "../geo/PartBuilder";
import type { Spot } from "../zones/baseLayout";
import type { LocalCollider } from "../../game/player/collision";

/**
 * Survival props for every camp, authored in a local frame (+Z faces the camp
 * centre). Each returns its colliders in local space.
 */
const C = {
  wood: "#8a5a34",
  woodLight: "#b5834e",
  woodDark: "#5e3b1f",
  thatch: "#c9a456",
  thatchDark: "#9c7a3c",
  canvas: "#c8b48a",
  canvasDark: "#a8925f",
  rope: "#d9c79a",
  metal: "#6d747a",
  water: "#3fa7d6",
  waterTop: "#7fd3f0",
  meat: "#b8443a",
  banana: "#f2d43a",
  berry: "#5a3fb0",
  leaf: "#2f7a3a",
  leafTop: "#4fae5c",
  tarp: "#3d6f8a",
  tarpTop: "#5a8fae",
  cargo: "#5f7a3a",
  cargoTop: "#7a9a4a",
  chute: "#e8742a",
  chuteTop: "#ff9a52",
  chuteWhite: "#f2ece0",
  stone: "#8d8a82",
  stoneTop: "#aaa69d",
};

/** Crooked branch pole from the ground to height h (salvaged-camp look). */
function branchPole(b: PartBuilder, x: number, z: number, h: number) {
  const lean = b.rand(-0.06, 0.06);
  b.cyl(0.05, 0.07, h, 5, { pos: [x, h / 2, z], rot: [lean, 0, -lean], color: C.woodDark, top: C.wood });
  b.cyl(0.03, 0.04, 0.35, 4, { pos: [x + 0.1, h * 0.7, z], rot: [0, 0, -0.8], color: C.woodDark }); // stub
}

/** Food cache: salvaged cargo crates and a suitcase full of food under a blue tarp on branch poles. */
export function foodStore(b: PartBuilder, s: Spot): LocalCollider[] {
  b.push([s.x, 0, s.z], s.rotY, s.scale ?? 1);
  const w = 2.4;
  const d = 1.6;
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) branchPole(b, x, z, z < 0 ? 2.0 : 2.45);
  // Tarp roof sloping to the back, ropes at the corners.
  b.box([w + 0.7, 0.04, d + 0.9], { pos: [0, 2.3, 0.15], rot: [-0.28, 0, 0.03], color: C.tarp, top: C.tarpTop, jitter: 0.05 });
  for (const sx of [-1, 1]) b.box([0.02, 0.02, 1.3], { pos: [sx * (w / 2 + 0.3), 1.6, -d / 2 - 0.5], rot: [0.8, 0, 0], color: C.rope });
  // Open cargo crates (food on top) and a stencilled crate.
  [-0.75, 0.05, 0.85].forEach((x, k) => {
    const h = k === 1 ? 0.9 : 0.65;
    b.box([0.75, h, 0.85], { pos: [x, h / 2, -0.2], rot: [0, (k - 1) * 0.12, 0], color: k === 1 ? C.cargo : C.woodLight, top: k === 1 ? C.cargoTop : "#d0a06a", jitter: 0.05 });
    const y = h + 0.02;
    if (k === 0) b.box([0.32, 0.12, 0.22], { pos: [x, y + 0.06, -0.2], rot: [0, 0.3, 0], color: C.meat, top: "#d8705f" });
    else if (k === 1) for (let j = 0; j < 3; j++) b.cyl(0.03, 0.04, 0.26, 5, { pos: [x - 0.06 + j * 0.06, y + 0.12, -0.2], rot: [0, 0, 1.2 - j * 0.2], color: C.banana });
    else for (let j = 0; j < 6; j++) b.ico(0.05, 0, { pos: [x + (j % 3) * 0.08 - 0.08, y + 0.05 + Math.floor(j / 3) * 0.06, -0.2], color: C.berry });
  });
  b.box([0.5, 0.06, 0.4], { pos: [0.05, 0.6, 0.23], color: "#ffffff" }); // stencil band on the cargo crate
  // Open suitcase with more food, and the name board hanging from the tarp.
  b.box([0.7, 0.18, 0.48], { pos: [-0.4, 0.09, 0.55], rot: [0, 0.4, 0], color: "#2f6fd6", top: "#4a8ae8" });
  b.box([0.7, 0.45, 0.05], { pos: [-0.47, 0.35, 0.33], rot: [-0.3, 0.4, 0], color: "#2f6fd6" });
  b.box([1.3, 0.36, 0.06], { pos: [0, 2.1, d / 2 + 0.3], color: "#f3e6c4", top: "#fff4d6" });
  for (const sx of [-0.55, 0.55]) b.box([0.02, 0.25, 0.02], { pos: [sx, 2.32, d / 2 + 0.3], color: C.rope });
  b.cyl(0.11, 0.09, 0.2, 6, { pos: [w / 2 - 0.1, 1.85, d / 2 + 0.35], color: "#ffd27a", glow: true });
  b.cyl(0.13, 0.13, 0.04, 6, { pos: [w / 2 - 0.1, 1.97, d / 2 + 0.35], color: C.metal });
  b.pop();
  return [{ kind: "box", x: 0, z: -0.05, hx: w / 2 + 0.15, hz: d / 2 + 0.1 }];
}

/** Rain catcher: a tarp funnel on four sticks pouring into a barrel, with a scoop and a drop sign. */
export function waterBarrel(b: PartBuilder, s: Spot): LocalCollider[] {
  b.push([s.x, 0, s.z], s.rotY, s.scale ?? 1);
  for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) branchPole(b, x, z, 2.1);
  b.cyl(1.05, 0.14, 0.55, 4, { pos: [0, 1.8, 0], rot: [0, Math.PI / 4, 0], color: C.tarp, top: C.tarpTop });
  b.cyl(0.05, 0.05, 0.35, 5, { pos: [0, 1.38, 0], color: C.tarpTop });
  b.box([1.1, 0.2, 1.1], { pos: [0, 0.1, 0], color: C.woodDark });
  b.cyl(0.46, 0.4, 1.0, 10, { pos: [0, 0.7, 0], color: C.wood, top: C.woodLight, jitter: 0.05 });
  for (const y of [0.35, 0.75, 1.12]) b.cyl(0.475, 0.475, 0.05, 10, { pos: [0, y, 0], color: C.metal });
  b.cyl(0.42, 0.42, 0.04, 10, { pos: [0, 1.17, 0], color: C.water, top: C.waterTop });
  b.cyl(0.03, 0.03, 0.5, 5, { pos: [0.25, 1.35, 0.1], rot: [0.4, 0, -0.5], color: C.woodLight });
  b.cyl(0.08, 0.06, 0.08, 6, { pos: [0.42, 1.55, 0.2], color: C.woodLight });
  // Tap + bucket.
  b.cyl(0.03, 0.03, 0.18, 5, { pos: [0, 0.45, 0.48], rot: [Math.PI / 2, 0, 0], color: C.metal });
  b.cyl(0.18, 0.14, 0.26, 8, { pos: [0.1, 0.33, 0.72], color: C.woodLight, top: C.water });
  // Sign post with a water drop.
  b.cyl(0.035, 0.04, 1.4, 5, { pos: [-0.6, 0.7, 0.2], color: C.woodDark });
  b.box([0.42, 0.42, 0.05], { pos: [-0.6, 1.45, 0.22], color: "#f3e6c4" });
  b.ico(0.11, 0, { pos: [-0.6, 1.42, 0.26], scale: [1, 1.3, 0.4], color: C.water });
  b.cyl(0, 0.08, 0.12, 5, { pos: [-0.6, 1.55, 0.26], color: C.water });
  b.pop();
  return [{ kind: "circle", x: 0, z: 0, r: 0.55, h: 1.15 }];
}

/** Parachute lean-to opening toward the camp (+Z): striped canopy draped from a ridge rope down to the ground at the back, a bedroll and a seat-cushion pillow. */
export function tent(b: PartBuilder, s: Spot): LocalCollider[] {
  b.push([s.x, 0, s.z], s.rotY, s.scale ?? 1);
  const len = 2.4;
  const gores = 6;
  // Gores side by side along X, each sloping from the ridge (z 0.7, y 1.75) down to the ground (z -1.15).
  for (let k = 0; k < gores; k++) {
    const x = -len / 2 + (k + 0.5) * (len / gores);
    const sag = Math.sin(((k + 0.5) / gores) * Math.PI) * 0.08;
    const col = k % 2 ? C.chuteWhite : C.chute;
    b.box([len / gores + 0.02, 0.04, 2.6], { pos: [x, 0.86 - sag, -0.22], rot: [-0.76, 0, 0], color: col, top: k % 2 ? "#ffffff" : C.chuteTop });
    b.box([len / gores + 0.02, 0.5, 0.04], { pos: [x, 1.5, 0.76], rot: [0.12, 0, 0], color: col });
  }
  for (const x of [-len / 2 - 0.1, len / 2 + 0.1]) branchPole(b, x, 0.7, 1.8);
  b.box([len + 0.5, 0.03, 0.03], { pos: [0, 1.78, 0.7], color: C.rope });
  // Guy lines from the ridge ends to stakes in front.
  for (const x of [-len / 2 - 0.1, len / 2 + 0.1]) {
    b.box([0.02, 0.02, 1.5], { pos: [x * 1.05, 1.15, 1.3], rot: [0.95, 0, 0], color: C.rope });
    b.cyl(0.03, 0.02, 0.25, 4, { pos: [x * 1.1, 0.08, 1.9], color: C.woodDark });
  }
  b.box([1.8, 0.12, 0.9], { pos: [0, 0.08, -0.25], color: "#7a3a2a", top: "#a8513c" });
  b.box([0.4, 0.14, 0.5], { pos: [-0.8, 0.2, -0.25], color: "#2f5f86", top: "#4a7fae" });
  b.pop();
  return [{ kind: "box", x: 0, z: -0.2, hx: len / 2 + 0.2, hz: 1.05 }];
}

/** Berry bush body (berries themselves are dynamic). */
export function berryBush(b: PartBuilder, x: number, z: number) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + b.rand(0, 1);
    b.ico(b.rand(0.42, 0.6), 0, {
      pos: [x + Math.cos(a) * 0.3, b.rand(0.4, 0.6), z + Math.sin(a) * 0.3],
      rot: [b.rand(0, 3), b.rand(0, 3), 0],
      color: C.leaf,
      top: C.leafTop,
      jitter: 0.12,
    });
  }
  b.cyl(0.05, 0.08, 0.35, 5, { pos: [x, 0.17, z], color: C.woodDark });
}

/** Little spring: irregular pond, stone rim and reeds. */
export function spring(b: PartBuilder, x: number, z: number) {
  b.cyl(1.5, 1.6, 0.06, 12, { pos: [x, 0.03, z], color: "#2e86b8", top: C.water });
  b.cyl(1.0, 1.0, 0.065, 10, { pos: [x + 0.2, 0.035, z - 0.1], color: C.waterTop });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.dodeca(b.rand(0.18, 0.3), { pos: [x + Math.cos(a) * 1.65, 0.1, z + Math.sin(a) * 1.65], scale: [1.2, 0.6, 1], color: C.stone, top: C.stoneTop, jitter: 0.15 });
  }
  for (let i = 0; i < 6; i++) {
    const a = b.rand(0, Math.PI * 2);
    b.cyl(0.02, 0.03, b.rand(0.6, 1.1), 4, { pos: [x + Math.cos(a) * 1.9, 0.4, z + Math.sin(a) * 1.9], rot: [b.rand(-0.2, 0.2), 0, b.rand(-0.2, 0.2)], color: "#5f8f3a", top: "#9bc25a" });
  }
}
