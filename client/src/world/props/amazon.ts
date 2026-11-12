import type { PartBuilder } from "../geo/PartBuilder";

/**
 * Deep-Amazon plants and creepy finds (world space, merged into chunk
 * meshes; glow parts go to the glow mesh): heliconia "lobster claws",
 * monstera, bromeliads, pitcher plants, acai palms, giant water lilies,
 * a spider on its web, a skull totem, a coiled snake and old bones.
 */
const TAU = Math.PI * 2;
const G = {
  stem: "#3f7a2a",
  leaf: "#2f7a32",
  leafTop: "#5fbf4a",
  dark: "#1d5a2c",
  darkTop: "#3f8f3a",
  red: "#d63a2f",
  yellow: "#f2c230",
  bone: "#e8dfc8",
  wood: "#5a3a24",
};

/** Heliconia: paddle leaves on tall stems and zig-zag red/yellow "lobster claw" flowers. */
export function heliconia(b: PartBuilder, x: number, z: number, s: number) {
  const stems = 3 + Math.floor(b.rand(0, 2));
  for (let i = 0; i < stems; i++) {
    const a = b.rand(0, TAU);
    const h = s * b.rand(1.6, 2.4);
    const sx = x + Math.cos(a) * 0.25 * s;
    const sz = z + Math.sin(a) * 0.25 * s;
    b.cyl(0.03 * s, 0.04 * s, h, 4, { pos: [sx, h / 2, sz], color: G.stem });
    b.leaf(1.5 * s, 0.55 * s, { pos: [sx, h * 0.75, sz], rot: [-0.25, a, 0], color: G.leaf, top: G.leafTop, jitter: 0.08 });
  }
  // The hanging flower: alternating boat-shaped bracts.
  const fy = s * 1.7;
  for (let k = 0; k < 5; k++) {
    const side = k % 2 ? 1 : -1;
    b.box([0.28 * s, 0.09 * s, 0.11 * s], { pos: [x + side * 0.1 * s, fy - k * 0.17 * s, z], rot: [0, 0, side * 0.6], color: G.red, top: G.yellow });
  }
  b.cyl(0.015 * s, 0.015 * s, 0.9 * s, 4, { pos: [x, fy - 0.3 * s, z], color: G.stem });
}

/** Monstera / elephant ear: huge glossy leaves on long stalks. */
export function monstera(b: PartBuilder, x: number, z: number, s: number) {
  const n = 5 + Math.floor(b.rand(0, 3));
  const a0 = b.rand(0, TAU);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU + b.rand(-0.2, 0.2);
    const h = s * b.rand(0.7, 1.3);
    b.cyl(0.03 * s, 0.04 * s, h, 4, { pos: [x + Math.cos(a) * 0.2 * s, h / 2, z + Math.sin(a) * 0.2 * s], rot: [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25], color: G.stem });
    b.leaf(1.5 * s, 1.25 * s, { pos: [x + Math.cos(a) * 0.35 * s, h, z + Math.sin(a) * 0.35 * s], rot: [0.35, Math.PI / 2 - a, 0], color: G.dark, top: G.darkTop, jitter: 0.1 });
  }
}

/** Bromeliad: a rosette of stiff leaves blushing red in the middle. */
export function bromeliad(b: PartBuilder, x: number, z: number, s: number) {
  const tip = b.rand() < 0.5 ? "#e8503a" : "#ff7ab8";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + b.rand(0, 0.3);
    b.leaf(0.7 * s, 0.22 * s, { pos: [x, 0.05, z], rot: [-0.75 - (i % 2) * 0.3, a, 0], color: "#3f8a3a", top: tip });
  }
  b.cyl(0, 0.09 * s, 0.35 * s, 5, { pos: [x, 0.2 * s, z], color: tip, glow: true });
}

/** Pitcher plants: striped tubes with lids (they eat bugs!). */
export function pitcherPlant(b: PartBuilder, x: number, z: number, s: number) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + b.rand(0, 0.5);
    const px = x + Math.cos(a) * 0.3 * s;
    const pz = z + Math.sin(a) * 0.3 * s;
    const h = s * b.rand(0.45, 0.7);
    const tilt = 0.25;
    b.cyl(0.12 * s, 0.06 * s, h, 6, { pos: [px, h / 2, pz], rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], color: "#8a2a3a", top: "#5f9a3a" });
    b.cyl(0.14 * s, 0.14 * s, 0.04 * s, 6, { pos: [px + Math.cos(a) * h * 0.12, h, pz + Math.sin(a) * h * 0.12], color: "#c84a5a" });
    b.leaf(0.25 * s, 0.22 * s, { pos: [px + Math.cos(a) * h * 0.12, h + 0.02, pz + Math.sin(a) * h * 0.12], rot: [-1.0, Math.PI / 2 - a, 0], color: "#6b2a3a" });
  }
  b.leaf(0.6 * s, 0.25 * s, { pos: [x, 0.03, z], rot: [-0.2, b.rand(0, TAU), 0], color: G.leaf });
}

/** Acai palm: slender ringed trunk, feathery crown, purple berry clusters. */
export function acaiPalm(b: PartBuilder, x: number, z: number, h: number) {
  const lean = b.rand(-0.08, 0.08);
  b.cyl(0.11, 0.15, h, 5, { pos: [x, h / 2, z], rot: [lean, 0, lean], color: "#8a7a5a", top: "#a8987a" });
  for (let k = 1; k < 6; k++) b.cyl(0.16, 0.16, 0.05, 5, { pos: [x + lean * h * (k / 6) * 0.5, (h * k) / 6, z + lean * h * (k / 6) * 0.5], color: "#6b5a44" });
  const tx = x + lean * h * 0.5;
  const tz = z + lean * h * 0.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + b.rand(0, 0.4);
    b.leaf(3.0, 0.55, { pos: [tx, h, tz], rot: [0.55 + b.rand(0, 0.3), a, 0], color: "#3f8a2a", top: "#8fd65a", jitter: 0.08 });
  }
  for (let i = 0; i < 4; i++) b.ico(0.16, 0, { pos: [tx + b.rand(-0.25, 0.25), h - 0.45 - i * 0.12, tz + b.rand(-0.25, 0.25)], color: "#4a1f5a" });
}

/** Giant water lilies in a dark little pond, with a pink lotus and reeds. */
export function lilyPond(b: PartBuilder, x: number, z: number, r: number) {
  b.cyl(r + 0.4, r + 0.5, 0.05, 14, { pos: [x, 0.03, z], color: "#5a4a2a" });
  b.cyl(r, r, 0.06, 14, { pos: [x, 0.05, z], color: "#1f4a4a", top: "#2f6a6a" });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + b.rand(0, 0.6);
    const d = b.rand(0.2, r - 0.7);
    const pr = b.rand(0.45, 0.85);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    b.cyl(pr, pr, 0.04, 10, { pos: [px, 0.1, pz], color: "#3f8a3a", top: "#6fbf4a" });
    b.cyl(pr + 0.04, pr + 0.04, 0.08, 10, { pos: [px, 0.12, pz], color: "#8a3a3a", top: "#5f8a3a" }); // the raised rim
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.leaf(0.35, 0.18, { pos: [x + 0.3, 0.14, z - 0.2], rot: [-0.9, a, 0], color: "#ff9ac4", top: "#ffffff" });
  }
  b.ico(0.08, 0, { pos: [x + 0.3, 0.2, z - 0.2], color: "#ffe066", glow: true });
  for (let i = 0; i < 7; i++) {
    const a = b.rand(0, TAU);
    const h = b.rand(0.8, 1.5);
    b.cyl(0.01, 0.025, h, 3, { pos: [x + Math.cos(a) * (r + 0.2), h / 2, z + Math.sin(a) * (r + 0.2)], color: "#6b8a3a", top: "#a8c05a" });
  }
}

/** A big spider in its web, strung between two dead branches. */
export function spiderWeb(b: PartBuilder, x: number, z: number, rot: number, s: number) {
  b.push([x, 0, z], rot);
  const cy = 2.0 * s;
  for (const side of [-1, 1]) b.cyl(0.05, 0.08, 3.2 * s, 4, { pos: [side * 1.4 * s, 1.6 * s, 0], rot: [0, 0, side * 0.12], color: "#4a3a2a" });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    b.box([0.015, 1.25 * s, 0.015], { pos: [Math.sin(a) * 0.62 * s, cy + Math.cos(a) * 0.62 * s, 0], rot: [0, 0, -a], color: "#f0f0f0" });
  }
  for (const rr of [0.45, 0.95]) {
    for (let k = 0; k < 6; k++) {
      const a = ((k + 0.5) / 6) * TAU;
      const seg = 2 * rr * s * Math.sin(Math.PI / 6);
      b.box([seg, 0.012, 0.012], { pos: [Math.sin(a) * rr * s * 0.92, cy + Math.cos(a) * rr * s * 0.92, 0], rot: [0, 0, -a + Math.PI / 2], color: "#e8e8e8" });
    }
  }
  // The spider: fat abdomen, body, eight bent legs, red eyes.
  b.ico(0.26 * s, 0, { pos: [0.1 * s, cy + 0.25 * s, 0.05], scale: [1, 1.2, 0.8], color: "#1a1a1a", top: "#3a2a2a" });
  b.ico(0.15 * s, 0, { pos: [0.1 * s, cy - 0.05 * s, 0.05], color: "#1a1a1a" });
  for (let k = 0; k < 8; k++) {
    const side = k < 4 ? -1 : 1;
    const a = (k % 4) * 0.45 - 0.7;
    b.box([0.5 * s, 0.03 * s, 0.03 * s], { pos: [0.1 * s + side * 0.25 * s, cy + a * 0.35 * s, 0.06], rot: [0, 0, side * (0.5 - a)], color: "#2a1a1a" });
  }
  for (const ex of [-0.04, 0.04]) b.ico(0.025 * s, 0, { pos: [0.1 * s + ex * s, cy - 0.1 * s, 0.17], color: "#ff2a2a", glow: true });
  b.pop();
}

/** Skull totem: a carved pole with a skull on top, feathers and crossed bones ("turn back!"). */
export function skullTotem(b: PartBuilder, x: number, z: number, rot: number) {
  b.push([x, 0, z], rot);
  b.cyl(0.14, 0.18, 2.2, 6, { pos: [0, 1.1, 0], color: G.wood, top: "#7a5232" });
  for (const y of [0.7, 1.4]) {
    b.box([0.34, 0.3, 0.34], { pos: [0, y, 0], color: "#6b4423" });
    for (const ex of [-0.08, 0.08]) b.box([0.06, 0.06, 0.02], { pos: [ex, y + 0.04, 0.18], color: G.red });
    b.box([0.16, 0.04, 0.02], { pos: [0, y - 0.07, 0.18], color: "#1a1a1a" });
  }
  b.box([0.34, 0.3, 0.32], { pos: [0, 2.38, 0], color: G.bone, top: "#fff4e0" });
  b.box([0.22, 0.12, 0.26], { pos: [0, 2.2, 0.03], color: G.bone });
  for (const ex of [-0.08, 0.08]) b.box([0.08, 0.08, 0.04], { pos: [ex, 2.4, 0.15], color: "#1a1a1a" });
  for (const [c, a] of [["#d63a2f", -0.5], ["#2f6fd6", 0], ["#f2c230", 0.5]] as [string, number][]) b.leaf(0.45, 0.12, { pos: [0, 2.5, -0.1], rot: [-1.1, a, 0], color: c });
  for (const s of [-1, 1]) b.cyl(0.03, 0.03, 0.7, 4, { pos: [0, 0.3, 0.25], rot: [0, 0, s * 0.8], color: G.bone });
  b.pop();
}

/** Coiled snake: green with yellow bands, head up, yellow eyes. */
export function coiledSnake(b: PartBuilder, x: number, z: number, s: number) {
  const segs = 12;
  for (let k = 0; k < segs; k++) {
    const a = (k / segs) * TAU * 1.6;
    const rr = (0.45 - k * 0.022) * s;
    const nx = x + Math.cos(a) * rr;
    const nz = z + Math.sin(a) * rr;
    b.cyl(0.08 * s, 0.08 * s, 0.3 * s, 5, { pos: [nx, 0.08 * s + k * 0.012 * s, nz], rot: [Math.PI / 2, -a, 0], color: k % 3 ? "#3f8a2a" : "#e8c23a" });
  }
  b.cyl(0.06 * s, 0.07 * s, 0.4 * s, 5, { pos: [x, 0.3 * s, z], rot: [0.3, 0, 0], color: "#3f8a2a" });
  b.box([0.16 * s, 0.09 * s, 0.22 * s], { pos: [x, 0.52 * s, z + 0.08 * s], color: "#2f7a22", top: "#4f9a32" });
  for (const ex of [-0.05, 0.05]) b.ico(0.02 * s, 0, { pos: [x + ex * s, 0.56 * s, z + 0.15 * s], color: "#ffe066", glow: true });
  b.box([0.01 * s, 0.01 * s, 0.12 * s], { pos: [x, 0.5 * s, z + 0.25 * s], color: "#d63a2f" });
}

/** Old bones half sunk in the leaf litter: a skull and a ribcage. */
export function oldBones(b: PartBuilder, x: number, z: number) {
  b.box([0.3, 0.24, 0.32], { pos: [x, 0.12, z], rot: [0.2, b.rand(0, 3), 0.15], color: G.bone, top: "#fff4e0" });
  for (const ex of [-0.07, 0.07]) b.box([0.07, 0.07, 0.04], { pos: [x + ex, 0.15, z + 0.16], color: "#1a1a1a" });
  for (let k = 0; k < 4; k++) b.cyl(0.02, 0.02, 0.5, 4, { pos: [x + 0.5 + k * 0.12, 0.12, z + 0.2], rot: [0, 0, 1.2], color: G.bone });
  b.cyl(0.025, 0.025, 0.7, 4, { pos: [x + 0.65, 0.04, z + 0.2], rot: [Math.PI / 2, 0, 0], color: G.bone });
}
