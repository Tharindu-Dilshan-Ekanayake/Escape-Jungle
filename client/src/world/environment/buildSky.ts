import { BufferAttribute, BufferGeometry, Color, SphereGeometry } from "three";
import { PartBuilder } from "../geo/PartBuilder";
import { mulberry32 } from "../geo/rng";
import { PALETTE } from "../../config/palette";
import { CAMP1 } from "../../config/camp1";

/**
 * Unit-radius sky dome (vertex gradient, horizon -> zenith) plus low-poly
 * clouds, merged into one unlit geometry. Rendered first with depthWrite off,
 * so its real radius only has to stay inside the far plane.
 */
export function buildSky(): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(CAMP1.seed + 7));
  const { clouds } = CAMP1;
  for (let i = 0; i < clouds.count; i++) {
    const az = (i / clouds.count) * Math.PI * 2 + b.rand(0, 0.5);
    const el = b.rand(clouds.minElevation, clouds.maxElevation);
    const d = 0.86;
    const cx = Math.cos(az) * Math.cos(el) * d;
    const cy = Math.sin(el) * d;
    const cz = Math.sin(az) * Math.cos(el) * d;
    const puffs = Math.round(b.rand(3, 5.99));
    for (let k = 0; k < puffs; k++) {
      const s = b.rand(0.05, 0.1);
      b.ico(s, 1, {
        pos: [cx + b.rand(-0.1, 0.1), cy + b.rand(-0.015, 0.02), cz + b.rand(-0.1, 0.1)],
        scale: [1.4, 0.55, 1],
        rot: [0, az, 0],
        color: PALETTE.cloudBottom,
        top: PALETTE.cloudTop,
      });
    }
  }
  const cloudGeo = b.build().solid[0]?.geometry;

  // Dome: inside-out sphere with a vertical colour gradient.
  const dome = new SphereGeometry(1, 20, 12);
  const pos = dome.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  const zen = new Color(PALETTE.skyZenith);
  const hor = new Color(PALETTE.skyHorizon);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i));
    c.copy(hor).lerp(zen, Math.pow(t, 0.6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  dome.setAttribute("color", new BufferAttribute(col, 3));
  const idx = dome.index!.array as ArrayLike<number>;
  const flipped: number[] = [];
  for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);

  // Merge dome + clouds (position + color only; the material is unlit).
  const parts = [{ g: dome, index: flipped }, ...(cloudGeo ? [{ g: cloudGeo, index: Array.from(cloudGeo.index!.array) }] : [])];
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (const { g, index } of parts) {
    const base = positions.length / 3;
    positions.push(...(g.getAttribute("position").array as Float32Array));
    colors.push(...(g.getAttribute("color").array as Float32Array));
    for (const i of index) indices.push(i + base);
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  out.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  out.setIndex(indices);
  out.computeBoundingSphere();
  return out;
}
