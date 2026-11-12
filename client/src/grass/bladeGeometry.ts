import { BufferAttribute, BufferGeometry, Color } from "three";
import { GRASS_RENDER } from "../config/grass";
import { mulberry32 } from "../world/geo/rng";

/**
 * Unit grass clump (height 1, scaled per instance): `blades` flat triangles
 * fanning outward from the cell centre. Vertex colour goes dark at the base
 * to white at the tip, so the per-instance tint shows at the tips.
 * One triangle per blade, rendered double-sided.
 */
export function makeClump(blades: number, seed = 11): BufferGeometry {
  const rng = mulberry32(seed);
  const base = new Color(GRASS_RENDER.baseColor);
  // Lit side of each blade is a bit brighter (fake light, no extra triangles).
  const baseLit = base.clone().multiplyScalar(1.35);
  // Tip variety: bright, sun-yellowed, a little darker.
  const tips = [new Color(1, 1, 1), new Color(1, 1, 0.78), new Color(0.88, 0.95, 0.85), new Color(1, 0.97, 0.9)];
  const pos = new Float32Array(blades * 9);
  const col = new Float32Array(blades * 9);
  const nrm = new Float32Array(blades * 9);
  const [wMin, wMax] = GRASS_RENDER.bladeWidth;

  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + rng() * 0.8;
    const r = rng() * GRASS_RENDER.spread;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    // Blade faces roughly tangent so the fan reads from every side.
    const face = a + Math.PI / 2 + (rng() - 0.5) * 0.8;
    const hw = (wMin + rng() * (wMax - wMin)) / 2;
    const fx = Math.cos(face) * hw;
    const fz = Math.sin(face) * hw;
    const lean = GRASS_RENDER.lean * (0.35 + rng() * 0.65);
    const h = 0.75 + rng() * 0.25;
    const o = b * 9;
    pos.set([bx - fx, 0, bz - fz, bx + fx, 0, bz + fz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean], o);
    const tip = tips[Math.floor(rng() * tips.length)];
    col.set([base.r, base.g, base.b, baseLit.r, baseLit.g, baseLit.b, tip.r, tip.g, tip.b], o);
    nrm.set([0, 1, 0, 0, 1, 0, 0, 1, 0], o);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("color", new BufferAttribute(col, 3));
  // Flat shading derives face normals; this attribute only has to be non-zero.
  g.setAttribute("normal", new BufferAttribute(nrm, 3));
  g.computeBoundingSphere();
  return g;
}
