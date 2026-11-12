import type { BufferGeometry } from "three";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import type { NpcLook } from "../../config/adventures";

/**
 * Quest-giver characters: chunky blocky people (and one frog, one golden
 * statue), facing +Z, feet at y = 0, ~2 m tall. One merged geometry each
 * (+ glow parts for lanterns/eyes).
 */
interface Person {
  skin: string;
  shirt: string;
  shirtTop?: string;
  pants: string;
  shoes: string;
  hair?: string;
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
};

/** A friendly blocky person: proper face (eyes with whites and pupils, brows, nose, ears, cheeks, smile), neck, collar, belt, cuffs, soled shoes. */
function person(b: PartBuilder, p: Person) {
  const top = p.shirtTop ?? p.shirt;
  for (const s of [-1, 1]) {
    b.box([0.26, 0.75, 0.28], { pos: [s * 0.16, 0.42, 0], color: p.pants, top: shade(p.pants, 1.15) });
    b.box([0.3, 0.1, 0.4], { pos: [s * 0.16, 0.08, 0.05], color: p.shoes });
    b.box([0.31, 0.04, 0.41], { pos: [s * 0.16, 0.02, 0.05], color: shade(p.shoes, 0.6) });
    b.box([0.22, 0.62, 0.24], { pos: [s * 0.46, 1.22, 0], rot: [0, 0, s * 0.08], color: p.shirt, top });
    b.box([0.24, 0.08, 0.26], { pos: [s * 0.475, 0.92, 0], rot: [0, 0, s * 0.08], color: shade(p.shirt, 0.8) });
    b.box([0.2, 0.17, 0.22], { pos: [s * 0.49, 0.8, 0.01], color: p.skin });
  }
  b.box([0.66, 0.78, 0.36], { pos: [0, 1.2, 0], color: p.shirt, top });
  b.box([0.68, 0.09, 0.38], { pos: [0, 0.86, 0], color: "#3a2a1c" });
  b.box([0.12, 0.09, 0.02], { pos: [0, 0.86, 0.195], color: "#e2b54a" });
  b.box([0.5, 0.06, 0.38], { pos: [0, 1.6, 0.0], color: shade(top, 1.12) });
  b.box([0.2, 0.1, 0.2], { pos: [0, 1.62, 0], color: shade(p.skin, 0.92) });
  // Head.
  b.box([0.52, 0.5, 0.48], { pos: [0, 1.9, 0], color: p.skin, top: shade(p.skin, 1.05) });
  for (const s of [-1, 1]) {
    b.box([0.06, 0.13, 0.1], { pos: [s * 0.28, 1.88, 0.01], color: shade(p.skin, 0.9) });
    b.box([0.1, 0.09, 0.02], { pos: [s * 0.11, 1.95, 0.245], color: "#ffffff" });
    b.box([0.05, 0.07, 0.02], { pos: [s * 0.11 + 0.012, 1.945, 0.252], color: "#1a1a1a" });
    b.box([0.018, 0.018, 0.01], { pos: [s * 0.11 + 0.025, 1.96, 0.26], color: "#ffffff" });
    b.box([0.12, 0.03, 0.02], { pos: [s * 0.11, 2.03, 0.248], rot: [0, 0, s * -0.12], color: p.hair ?? "#3a2a1c" });
    b.box([0.08, 0.04, 0.015], { pos: [s * 0.17, 1.82, 0.247], color: "#f08a8a" });
  }
  b.box([0.07, 0.09, 0.06], { pos: [0, 1.86, 0.26], color: shade(p.skin, 0.9) });
  b.box([0.16, 0.035, 0.02], { pos: [0, 1.75, 0.246], color: "#7a2a1a" });
  for (const s of [-1, 1]) b.box([0.04, 0.035, 0.02], { pos: [s * 0.095, 1.765, 0.246], rot: [0, 0, s * 0.5], color: "#7a2a1a" });
  if (p.hair) {
    b.box([0.54, 0.14, 0.5], { pos: [0, 2.15, -0.01], color: p.hair });
    b.box([0.54, 0.32, 0.1], { pos: [0, 1.98, -0.22], color: p.hair });
  }
}

/** Captain Rusty: navy captain's uniform with gold buttons, shoulder boards and wings, cap with a gold band, curled mustache, orange scarf. */
function pilot(b: PartBuilder) {
  person(b, { skin: "#e8b48a", shirt: "#23395d", shirtTop: "#2f4a78", pants: "#1d2a40", shoes: "#111111", hair: "#5a3a1c" });
  b.box([0.2, 0.5, 0.02], { pos: [0, 1.25, 0.185], color: "#f3f3f3" });
  b.box([0.07, 0.38, 0.025], { pos: [0, 1.22, 0.19], color: "#c0392b" });
  for (const y of [1.36, 1.18, 1.0]) for (const s of [-1, 1]) b.box([0.05, 0.05, 0.03], { pos: [s * 0.16, y, 0.19], color: "#ffd23f" });
  for (const s of [-1, 1]) {
    b.box([0.24, 0.05, 0.3], { pos: [s * 0.42, 1.6, 0], color: "#ffd23f" });
    b.box([0.2, 0.025, 0.31], { pos: [s * 0.42, 1.63, 0], color: "#1d2a40" });
  }
  b.box([0.2, 0.05, 0.02], { pos: [-0.16, 1.48, 0.19], color: "#ffd23f" });
  b.box([0.1, 0.03, 0.02], { pos: [-0.27, 1.5, 0.19], rot: [0, 0, 0.3], color: "#ffd23f" });
  b.box([0.1, 0.03, 0.02], { pos: [-0.05, 1.5, 0.19], rot: [0, 0, -0.3], color: "#ffd23f" });
  b.box([0.7, 0.13, 0.4], { pos: [0, 1.58, 0.02], color: "#e8742a" });
  b.box([0.12, 0.3, 0.06], { pos: [0.18, 1.45, 0.2], rot: [0.2, 0, 0.3], color: "#e8742a" });
  // Cap: crown, gold band, badge, peak; goggles pushed up.
  b.box([0.56, 0.18, 0.54], { pos: [0, 2.22, 0], color: "#23395d", top: "#2f4a78" });
  b.box([0.57, 0.05, 0.55], { pos: [0, 2.15, 0], color: "#ffd23f" });
  b.box([0.58, 0.05, 0.3], { pos: [0, 2.12, 0.34], color: "#111111" });
  b.box([0.12, 0.1, 0.03], { pos: [0, 2.24, 0.275], color: "#ffd23f" });
  for (const s of [-1, 1]) b.cyl(0.07, 0.07, 0.04, 8, { pos: [s * 0.12, 2.33, 0.2], rot: [Math.PI / 2, 0, 0], color: "#7fb8e0" });
  // Big curled mustache.
  b.box([0.3, 0.06, 0.03], { pos: [0, 1.8, 0.262], color: "#5a3a1c" });
  for (const s of [-1, 1]) b.box([0.08, 0.05, 0.03], { pos: [s * 0.18, 1.83, 0.262], rot: [0, 0, s * 0.6], color: "#5a3a1c" });
}

function professor(b: PartBuilder) {
  person(b, { skin: "#f0c8a0", shirt: "#c8b48a", shirtTop: "#d9c79a", pants: "#7a6a48", shoes: "#4a3420" });
  b.cyl(0.42, 0.42, 0.05, 10, { pos: [0, 2.12, 0], color: "#e8dcc0" });
  b.ico(0.3, 1, { pos: [0, 2.2, 0], scale: [1, 0.55, 1], color: "#efe3c8" });
  b.box([0.56, 0.05, 0.02], { pos: [0, 2.12, 0.0], color: "#5a3a1c" });
  for (const s of [-1, 1]) b.cyl(0.08, 0.08, 0.03, 10, { pos: [s * 0.11, 1.92, 0.255], rot: [Math.PI / 2, 0, 0], color: "#2a2a2a" });
  b.box([0.34, 0.12, 0.06], { pos: [0, 1.66, 0.24], color: "#f3f3f3" });
  b.box([0.26, 0.34, 0.05], { pos: [-0.5, 0.95, 0.2], rot: [0.3, 0, 0], color: "#2f6fd6" });
}

function botanist(b: PartBuilder) {
  person(b, { skin: "#8d5524", shirt: "#3f8f4f", shirtTop: "#55aa62", pants: "#3f8f4f", shoes: "#5a3a1c" });
  b.cyl(0.42, 0.55, 0.6, 10, { pos: [0, 0.65, 0], color: "#3f8f4f", top: "#55aa62" });
  b.box([0.5, 0.6, 0.04], { pos: [0, 1.1, 0.2], color: "#f3e6c4" });
  b.cyl(0.45, 0.45, 0.05, 12, { pos: [0, 2.12, 0], color: "#e8c873" });
  b.cyl(0.26, 0.28, 0.2, 10, { pos: [0, 2.24, 0], color: "#e8c873" });
  b.ico(0.08, 0, { pos: [0.25, 2.2, 0.15], color: "#ff6fae" });
  b.cyl(0.02, 0.02, 1.4, 4, { pos: [0.62, 1.2, 0.2], rot: [0.2, 0, -0.2], color: "#a8743e" });
  b.cyl(0.24, 0.24, 0.03, 10, { pos: [0.78, 1.95, 0.32], rot: [0.9, 0, 0], color: "#f3f3f3" });
  for (let i = 0; i < 4; i++) b.box([0.04, 0.06, 0.02], { pos: [-0.12 + i * 0.08, 2.02, 0.245], color: i % 2 ? "#5a3a1c" : "#1a1a1a" });
}

function monk(b: PartBuilder) {
  person(b, { skin: "#e0ac69", shirt: "#e8892a", shirtTop: "#f0a040", pants: "#e8892a", shoes: "#5a3a1c" });
  b.cyl(0.4, 0.62, 1.2, 10, { pos: [0, 0.62, 0], color: "#d9771e", top: "#e8892a" });
  b.box([0.18, 0.9, 0.04], { pos: [0.12, 1.25, 0.19], rot: [0, 0, 0.5], color: "#a8321e" });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI + Math.PI;
    b.ico(0.035, 0, { pos: [Math.cos(a) * 0.22, 1.5 + Math.sin(a) * 0.12, 0.2], color: "#5a3a1c" });
  }
  b.cyl(0.03, 0.035, 2.2, 5, { pos: [0.62, 1.1, 0.1], color: "#7a4b2a" });
  b.box([0.2, 0.26, 0.2], { pos: [0.62, 2.3, 0.1], color: "#7fd3ff", glow: true });
  b.cyl(0.03, 0.15, 0.1, 4, { pos: [0.62, 2.48, 0.1], color: "#3a3a3a" });
}

function frog(b: PartBuilder) {
  // DJ Croak: a big frog on a stump with headphones, gold chain and speakers.
  b.cyl(0.6, 0.7, 0.6, 10, { pos: [0, 0.3, 0], color: "#6b4423", top: "#c89a62" });
  b.ico(0.75, 1, { pos: [0, 1.1, 0], scale: [1, 0.75, 0.9], color: "#3f9f3a", top: "#7fd35a" });
  b.ico(0.55, 1, { pos: [0, 1.0, 0.25], scale: [0.9, 0.7, 0.8], color: "#d6f0a0" });
  for (const s of [-1, 1]) {
    b.ico(0.22, 1, { pos: [s * 0.32, 1.62, 0.3], color: "#7fd35a" });
    b.ico(0.13, 0, { pos: [s * 0.34, 1.66, 0.46], color: "#ffffff" });
    b.ico(0.07, 0, { pos: [s * 0.35, 1.67, 0.56], color: "#111111" });
    b.cyl(0.15, 0.15, 0.1, 10, { pos: [s * 0.7, 1.35, 0], rot: [0, 0, Math.PI / 2], color: "#222222" });
    b.box([0.5, 0.7, 0.45], { pos: [s * 1.25, 0.35, -0.1], color: "#2a2a2a", top: "#3a3a3a" });
    b.cyl(0.16, 0.16, 0.03, 10, { pos: [s * 1.25, 0.45, 0.13], rot: [Math.PI / 2, 0, 0], color: "#555555" });
  }
  b.box([1.4, 0.06, 0.08], { pos: [0, 1.9, 0], rot: [0, 0, 0], color: "#222222" });
  for (let i = 0; i < 7; i++) b.ico(0.04, 0, { pos: [-0.24 + i * 0.08, 0.9 - Math.sin((i / 6) * Math.PI) * 0.12, 0.62], color: "#ffd23f" });
  b.box([0.4, 0.05, 0.03], { pos: [0, 1.25, 0.66], color: "#7a2a1a" });
}

function monkeyKing(b: PartBuilder) {
  // Golden statue on a stone throne with a crown, cape and a ruby.
  const gold = "#e6b422";
  const goldTop = "#ffe066";
  b.box([2.0, 0.6, 1.6], { pos: [0, 0.3, 0], color: "#8d8a82", top: "#aaa69d" });
  b.box([1.8, 1.8, 0.3], { pos: [0, 1.5, -0.6], color: "#8d8a82", top: "#aaa69d" });
  b.box([1.4, 0.7, 0.04], { pos: [0, 1.1, -0.44], color: "#c0392b" });
  b.ico(0.55, 1, { pos: [0, 1.15, 0], scale: [1, 1.1, 0.8], color: gold, top: goldTop });
  b.ico(0.42, 1, { pos: [0, 1.95, 0.05], color: gold, top: goldTop });
  b.ico(0.28, 1, { pos: [0, 1.88, 0.3], scale: [1, 0.75, 0.8], color: "#f2d08a" });
  for (const s of [-1, 1]) {
    b.ico(0.16, 1, { pos: [s * 0.42, 2.05, 0], scale: [0.5, 1, 1], color: gold });
    b.box([0.07, 0.07, 0.02], { pos: [s * 0.12, 2.0, 0.41], color: "#ff3b30", glow: true });
    b.box([0.2, 0.7, 0.2], { pos: [s * 0.62, 1.15, 0.15], rot: [-0.5, 0, s * 0.3], color: gold, top: goldTop });
    b.box([0.22, 0.25, 0.5], { pos: [s * 0.3, 0.72, 0.4], color: gold });
  }
  b.cyl(0.36, 0.42, 0.22, 8, { pos: [0, 2.38, 0.02], color: gold, top: goldTop });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.cyl(0, 0.08, 0.22, 4, { pos: [Math.sin(a) * 0.36, 2.58, 0.02 + Math.cos(a) * 0.36], color: goldTop });
  }
  b.ico(0.07, 0, { pos: [0, 2.4, 0.43], color: "#ff2a4a", glow: true });
  b.cyl(0.08, 0.06, 1.0, 6, { pos: [0.7, 0.95, 0.35], rot: [0, 0, -0.3], color: "#f2d43a" });
}

const MAKERS: Record<NpcLook, (b: PartBuilder) => void> = { pilot, professor, frog, monk, monkeyKing, botanist };

export function npcGeometry(look: NpcLook): { solid: BufferGeometry; glow: BufferGeometry | null } {
  const b = new PartBuilder(Infinity, mulberry32(look.length * 31));
  MAKERS[look](b);
  const out = b.build();
  return { solid: out.solid[0].geometry, glow: out.glow[0]?.geometry ?? null };
}
