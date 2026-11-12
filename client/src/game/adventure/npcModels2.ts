import type { PartBuilder } from "../../world/geo/PartBuilder";
import { person } from "./npcModels";

/**
 * Misty Gorge's quest givers (chapter 2): new faces, nobody from chapter 1.
 * Same scale and style: facing +Z, feet at y = 0, ~2 m tall.
 */

/** Ranger Moss: olive ranger shirt, badge, wide-brim hat, radio. */
export function ranger(b: PartBuilder) {
  person(b, { skin: "#c68642", shirt: "#5a6b3a", shirtTop: "#6f8048", pants: "#4a3a24", shoes: "#2a1a10", hair: "#2a1a10" });
  for (const s of [-1, 1]) b.box([0.16, 0.12, 0.03], { pos: [s * 0.15, 1.38, 0.19], color: "#4a5a30" });
  b.box([0.1, 0.12, 0.03], { pos: [-0.16, 1.22, 0.195], color: "#e2b54a" });
  b.cyl(0.5, 0.5, 0.04, 12, { pos: [0, 2.14, 0], color: "#a8875a", top: "#c4a06c" });
  b.cyl(0.26, 0.3, 0.24, 10, { pos: [0, 2.28, 0], color: "#a8875a", top: "#c4a06c" });
  b.box([0.6, 0.04, 0.02], { pos: [0, 2.18, 0], color: "#5a3a1c" });
  b.box([0.12, 0.2, 0.08], { pos: [0.36, 1.05, 0.12], color: "#2a2a2a" });
  b.cyl(0.01, 0.01, 0.16, 4, { pos: [0.39, 1.22, 0.12], color: "#2a2a2a" });
}

/** Climber Kip: red jacket, harness, orange helmet with a lamp, rope coil on the shoulder. */
export function climber(b: PartBuilder) {
  person(b, { skin: "#f0c8a0", shirt: "#c0392b", shirtTop: "#e04a3a", pants: "#2f3a4a", shoes: "#3a3a3a", hair: "#c87a2a" });
  b.box([0.7, 0.06, 0.4], { pos: [0, 0.95, 0], color: "#ffd23f" });
  for (const s of [-1, 1]) b.box([0.06, 0.6, 0.4], { pos: [s * 0.2, 1.2, 0.01], rot: [0, 0, s * 0.15], color: "#ffd23f" });
  b.ico(0.32, 1, { pos: [0, 2.17, 0], scale: [1, 0.7, 1], color: "#ff8a2a", top: "#ffb05a" });
  b.box([0.12, 0.1, 0.06], { pos: [0, 2.2, 0.3], color: "#ffffff", glow: true });
  for (let i = 0; i < 3; i++) b.cyl(0.24 - i * 0.02, 0.24 - i * 0.02, 0.05, 10, { pos: [-0.3, 1.45 - i * 0.05, -0.12], rot: [0.3, 0, 0.9], color: i % 2 ? "#d9c08c" : "#c8a868" });
  b.cyl(0.02, 0.02, 0.6, 4, { pos: [0.58, 1.0, 0.18], rot: [0.3, 0, -0.25], color: "#8a8f96" });
  b.box([0.18, 0.06, 0.04], { pos: [0.66, 1.3, 0.22], rot: [0, 0, 0.5], color: "#8a8f96" });
}

/** Old Yodel: green alpine jacket, braces, feathered hat, white beard, a long horn. */
export function yodeler(b: PartBuilder) {
  person(b, { skin: "#f0c0a0", shirt: "#f3f0e6", shirtTop: "#ffffff", pants: "#5a3a1c", shoes: "#2a1a10", hair: "#e8e8e8" });
  for (const s of [-1, 1]) b.box([0.06, 0.8, 0.02], { pos: [s * 0.13, 1.2, 0.19], color: "#2f6a3a" });
  b.box([0.66, 0.1, 0.37], { pos: [0, 1.05, 0], color: "#2f6a3a" });
  b.box([0.4, 0.22, 0.06], { pos: [0, 1.72, 0.25], color: "#e8e8e8" });
  b.box([0.3, 0.12, 0.05], { pos: [0, 1.6, 0.25], color: "#d8d8d8" });
  b.cyl(0.36, 0.38, 0.05, 10, { pos: [0, 2.15, 0], color: "#2f6a3a", top: "#3f7f4a" });
  b.cyl(0.2, 0.26, 0.22, 8, { pos: [0, 2.28, 0], color: "#2f6a3a", top: "#3f7f4a" });
  b.box([0.03, 0.3, 0.1], { pos: [0.2, 2.4, -0.05], rot: [0, 0, -0.3], color: "#e8a83a" });
  // Alphorn resting on the ground in front.
  b.cyl(0.03, 0.05, 1.6, 6, { pos: [0.5, 1.0, 0.55], rot: [0.9, 0, -0.2], color: "#a8743e", top: "#c8945e" });
  b.cyl(0.16, 0.06, 0.3, 8, { pos: [0.66, 0.2, 1.1], rot: [1.3, 0, 0], color: "#a8743e" });
}

/** Granny Fog: grey-violet hooded cloak, shawl, crooked staff with a misty lantern. */
export function fogWitch(b: PartBuilder) {
  person(b, { skin: "#e0c0b0", shirt: "#6a5a7a", shirtTop: "#7a6a8a", pants: "#4a3f5a", shoes: "#2a2430", hair: "#d8d8e0" });
  b.cyl(0.42, 0.66, 1.25, 10, { pos: [0, 0.64, 0], color: "#4f4560", top: "#6a5a7a" });
  b.ico(0.38, 1, { pos: [0, 2.0, -0.08], scale: [1, 1.05, 1], color: "#4f4560", top: "#6a5a7a" });
  b.box([0.7, 0.18, 0.42], { pos: [0, 1.52, 0.02], color: "#8a7aa0" });
  b.cyl(0.03, 0.04, 2.2, 5, { pos: [-0.62, 1.1, 0.12], rot: [0, 0, 0.06], color: "#5a4a3a" });
  b.box([0.22, 0.06, 0.06], { pos: [-0.54, 2.2, 0.12], rot: [0, 0, -0.8], color: "#5a4a3a" });
  b.box([0.18, 0.24, 0.18], { pos: [-0.44, 1.98, 0.14], color: "#c8ecff", glow: true });
  b.cyl(0.02, 0.12, 0.08, 4, { pos: [-0.44, 2.14, 0.14], color: "#3a3a3a" });
}

/** Chief Bongo: a big silverback gorilla with a leaf crown, sitting on a mossy rock. */
export function gorillaChief(b: PartBuilder) {
  b.box([1.8, 0.7, 1.4], { pos: [0, 0.35, 0], color: "#6a6f66", top: "#5a8a4a" });
  b.ico(0.75, 1, { pos: [0, 1.35, 0], scale: [1.1, 1.05, 0.85], color: "#2a2a2e", top: "#4a4a50" });
  b.ico(0.5, 1, { pos: [0, 1.4, 0.28], scale: [1, 1, 0.5], color: "#3a3a40" });
  b.ico(0.45, 1, { pos: [0, 2.15, 0.12], color: "#2a2a2e", top: "#3a3a40" });
  b.ico(0.3, 1, { pos: [0, 2.08, 0.38], scale: [1.1, 0.8, 0.7], color: "#4a4038" });
  for (const s of [-1, 1]) {
    b.box([0.06, 0.06, 0.02], { pos: [s * 0.13, 2.22, 0.5], color: "#ffd27a" });
    b.box([0.32, 1.0, 0.32], { pos: [s * 0.82, 1.0, 0.2], rot: [-0.2, 0, s * 0.2], color: "#2a2a2e", top: "#4a4a50" });
    b.box([0.38, 0.22, 0.42], { pos: [s * 0.9, 0.5, 0.36], color: "#3a3a40" });
  }
  b.box([1.2, 0.4, 0.5], { pos: [0, 1.0, -0.25], color: "#8a8f8a" });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.leaf(0.3, 0.14, { pos: [Math.sin(a) * 0.32, 2.5, 0.12 + Math.cos(a) * 0.32], rot: [-1.0, a, 0], color: "#3f9a3a", top: "#7fd35a" });
  }
}

/** Netty the Collector: khaki safari outfit, pith helmet, specimen box and a big butterfly net. */
export function collector(b: PartBuilder) {
  person(b, { skin: "#8d5524", shirt: "#d9c79a", shirtTop: "#e8d8ac", pants: "#a8946a", shoes: "#5a3a1c", hair: "#2a1a10" });
  b.ico(0.34, 1, { pos: [0, 2.16, 0], scale: [1.05, 0.6, 1.05], color: "#efe3c8", top: "#fff4dc" });
  b.box([0.6, 0.04, 0.6], { pos: [0, 2.08, 0], color: "#e0d0b0" });
  b.box([0.3, 0.24, 0.12], { pos: [-0.42, 0.95, 0.15], color: "#7a4a2a", top: "#9a6a3a" });
  b.box([0.24, 0.16, 0.02], { pos: [-0.42, 0.97, 0.215], color: "#e8f4ff" });
  b.cyl(0.02, 0.02, 1.7, 4, { pos: [0.6, 1.35, 0.15], rot: [0.15, 0, -0.15], color: "#a8743e" });
  b.cyl(0.26, 0.26, 0.03, 12, { pos: [0.74, 2.2, 0.28], rot: [0.6, 0, 0], color: "#d8d8d8" });
  b.cyl(0.24, 0.05, 0.45, 8, { pos: [0.74, 1.98, 0.22], rot: [0.6, 0, 0], color: "#f3f3f3" });
}
