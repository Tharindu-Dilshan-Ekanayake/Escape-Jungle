import type { PartBuilder } from "../geo/PartBuilder";

/**
 * Static campfire pit at (x, z): ring of stones, ash bed, two log benches and
 * a little "drop wood here" sign. The logs and flames are dynamic (CampfireSystem).
 */
export function firePit(b: PartBuilder, x: number, z: number) {
  b.push([x, 0, z], b.rand(0, Math.PI * 2));
  b.cyl(0.62, 0.68, 0.04, 10, { pos: [0, 0.02, 0], color: "#2e2a26", top: "#4a433c" });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.dodeca(b.rand(0.16, 0.22), {
      pos: [Math.cos(a) * 0.78, 0.1, Math.sin(a) * 0.78],
      scale: [1.2, 0.75, 1],
      rot: [0, -a, 0],
      color: "#7d7a72",
      top: "#a6a299",
      jitter: 0.15,
    });
  }
  // Log benches.
  for (const a of [0.4, 0.4 + Math.PI * 0.9]) {
    const bx = Math.cos(a) * 2.1;
    const bz = Math.sin(a) * 2.1;
    b.cyl(0.18, 0.2, 1.5, 7, { pos: [bx, 0.2, bz], rot: [0, Math.PI / 2 - a, Math.PI / 2], color: "#5e3b1f", top: "#7a4e2a", jitter: 0.08 });
    b.cyl(0.16, 0.16, 0.02, 7, { pos: [bx + Math.sin(a) * 0.75, 0.2, bz - Math.cos(a) * 0.75], rot: [0, Math.PI / 2 - a, Math.PI / 2], color: "#d9b98a" });
  }
  // Sign post with a flame icon.
  b.cyl(0.04, 0.05, 1.1, 5, { pos: [1.3, 0.55, -1.0], color: "#6b4423" });
  b.box([0.5, 0.36, 0.05], { pos: [1.3, 1.1, -1.0], rot: [0, 0.5, 0], color: "#c89a62", top: "#e0b880" });
  b.cyl(0, 0.09, 0.2, 4, { pos: [1.3, 1.12, -0.97], rot: [0, 0.5, 0], color: "#ff8a1c" });
  b.pop();
}
