import { BufferAttribute, BufferGeometry, Color } from "three";
import type { PlantShape } from "../config/grass";
import { PLANT_SHAPES as S } from "../config/plants";
import { mulberry32 } from "../world/geo/rng";
import { makeClump } from "./bladeGeometry";

/**
 * Unit plant geometries (height 1, base at y=0, footprint ~0.5 m), scaled per
 * instance. Plain non-indexed triangles with vertex colours (dark base ->
 * bright top) that the per-instance tint multiplies. Flat-shaded, double-sided.
 * `detail` 1 = near LOD; lower values drop parts for far chunks / LOW quality.
 */
class TriWriter {
  pos: number[] = [];
  col: number[] = [];
  tri(a: number[], b: number[], c: number[], ca: Color, cb: Color, cc: Color) {
    this.pos.push(...a, ...b, ...c);
    this.col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
  }
  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.col), 3));
    // Flat shading derives face normals; this attribute only has to be non-zero.
    const n = new Float32Array(this.pos.length);
    for (let i = 1; i < n.length; i += 3) n[i] = 1;
    g.setAttribute("normal", new BufferAttribute(n, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const count = (near: number, detail: number) => Math.max(1, Math.round(near * detail));

/** Arching leaf from `base` along horizontal direction `a`: 2 triangles. */
function leaf(w: TriWriter, bx: number, by: number, bz: number, a: number, reach: number, rise: number, droop: number, width: number, dark: Color, light: Color) {
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const px = -dz * width;
  const pz = dx * width;
  const mid = [bx + dx * reach * 0.55, by + rise, bz + dz * reach * 0.55];
  const tip = [bx + dx * reach, by + rise - droop, bz + dz * reach];
  const base = [bx, by, bz];
  const ml = [mid[0] + px, mid[1], mid[2] + pz];
  const mr = [mid[0] - px, mid[1], mid[2] - pz];
  w.tri(base, ml, mr, dark, light, light);
  w.tri(ml, tip, mr, light, light, light);
}

export function makePlantGeometry(shape: PlantShape, detail: number, seed: number): BufferGeometry {
  if (shape === "grass") return makeClump(count(S.grass.blades, detail), seed);
  const rng = mulberry32(seed);
  const w = new TriWriter();
  const dark = new Color(S.darkBase);
  const white = new Color(1, 1, 1);

  if (shape === "fern") {
    const n = count(S.fern.fronds, detail);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      leaf(w, 0, 0.02, 0, a, 0.5 + rng() * 0.2, 0.75 + rng() * 0.2, 0.3, 0.09, dark, white);
    }
  } else if (shape === "reeds") {
    const n = count(S.reeds.stalks, detail);
    const brown = new Color(S.reeds.cattail);
    for (let i = 0; i < n; i++) {
      const x = (rng() - 0.5) * 0.35;
      const z = (rng() - 0.5) * 0.35;
      const h = 0.8 + rng() * 0.2;
      const lean = (rng() - 0.5) * 0.12;
      const hw = 0.02;
      w.tri([x - hw, 0, z], [x + hw, 0, z], [x + lean, h, z], dark, dark, white);
      if (detail >= 0.75) w.tri([x, 0, z - hw], [x, 0, z + hw], [x + lean, h, z], dark, dark, white);
      // Brown cattail head near the top.
      const cy = h * 0.82;
      w.tri([x + lean * 0.8 - 0.035, cy, z], [x + lean * 0.8 + 0.035, cy, z], [x + lean, h, z], brown, brown, brown);
    }
  } else if (shape === "bamboo") {
    // Rounded down: one stalk per cell on LOW (cells are only 0.5 m apart, still a dense stand).
    const n = Math.max(1, Math.floor(S.bamboo.stalks * detail));
    for (let i = 0; i < n; i++) {
      const x = (rng() - 0.5) * 0.3;
      const z = (rng() - 0.5) * 0.3;
      const r = 0.045 + rng() * 0.02;
      // Triangular prism stalk (6 tris); LOW/far detail drops one face (double-sided, too thin to notice).
      const faces = detail >= 0.75 ? 3 : 2;
      for (let k = 0; k < faces; k++) {
        const a0 = (k / 3) * Math.PI * 2;
        const a1 = ((k + 1) / 3) * Math.PI * 2;
        const p0 = [x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r];
        const p1 = [x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r];
        const q0 = [p0[0], 1, p0[2]];
        const q1 = [p1[0], 1, p1[2]];
        w.tri(p0, p1, q1, dark, dark, white);
        w.tri(p0, q1, q0, dark, white, white);
      }
      if (detail >= 1) leaf(w, x, 0.85, z, rng() * 6.28, 0.3, 0.05, 0.12, 0.05, white, white);
    }
  } else if (shape === "banana") {
    const n = count(S.banana.leaves, detail);
    w.tri([-0.04, 0, 0], [0.04, 0, 0], [0, 0.5, 0], dark, dark, white);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.6;
      leaf(w, 0, 0.45, 0, a, 0.55 + rng() * 0.15, 0.45, 0.35, 0.2, dark, white);
    }
  } else if (shape === "flowerBush") {
    const sides = detail >= 0.75 ? 6 : 4;
    const green = new Color(S.flowerBush.leaf);
    const greenTop = new Color(S.flowerBush.leafTop);
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      const r = 0.28;
      w.tri([Math.cos(a0) * r, 0.05, Math.sin(a0) * r], [Math.cos(a1) * r, 0.05, Math.sin(a1) * r], [0, 0.75, 0], green, green, greenTop);
    }
    const n = count(S.flowerBush.flowers, detail);
    for (let i = 0; i < n; i++) {
      const c = new Color(S.flowerBush.petals[Math.floor(rng() * S.flowerBush.petals.length)]);
      const a = rng() * Math.PI * 2;
      const t = 0.25 + rng() * 0.45;
      const x = Math.cos(a) * 0.28 * (1 - t) * 1.05;
      const z = Math.sin(a) * 0.28 * (1 - t) * 1.05;
      const y = 0.05 + t * 0.7 + 0.02;
      const s = 0.1;
      w.tri([x - s, y, z], [x + s, y, z + s * 0.4], [x, y + s * 1.2, z - s * 0.4], c, c, c);
    }
  }
  return w.build();
}
