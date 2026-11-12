import { BufferAttribute, BufferGeometry, Color } from "three";
import { PALETTE } from "../../config/palette";
import { CAMP1 } from "../../config/camp1";
import { baseAt, corridorAt, inZones, zoneAt } from "../zones/buildZones";

/** Cheap deterministic 2D noise (sum of sines), range about -1..1. */
export function noise2(x: number, z: number) {
  return (
    Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4) * 0.6 +
    Math.sin(x * 0.53 + z * 0.41) * 0.3 +
    Math.cos(x * 1.31 - z * 1.07) * 0.1
  );
}

/**
 * Polar-grid ground disc with vertex colours: trampled-earth clearing in the middle,
 * noisy edge, then darker jungle floor. Flat (y=0) wherever the player can
 * walk; gentle bumps only outside the boundary.
 */
export function buildGround(): BufferGeometry {
  const { radius, rings, segments, edgeNoise, outerBump } = CAMP1.ground;
  const floor = new Color(PALETTE.floor);
  const floorDark = new Color(PALETTE.floorDark);
  const earth = new Color(PALETTE.floorEarth);
  const dirtDark = new Color(PALETTE.dirtDark);
  const campEarth = new Color(PALETTE.campEarth);
  const campEarthDark = new Color(PALETTE.campEarthDark);
  const campMoss = new Color(PALETTE.campMoss);
  const campSun = new Color(PALETTE.campSun);
  const c = new Color();
  const tmp = new Color();

  const positions: number[] = [0, 0, 0];
  const colors: number[] = [campEarth.r, campEarth.g, campEarth.b];
  const indices: number[] = [];

  for (let ri = 1; ri <= rings; ri++) {
    // Denser rings near the clearing edge, sparser far away.
    const r = radius * Math.pow(ri / rings, 1.6);
    for (let si = 0; si < segments; si++) {
      const a = (si / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const n = noise2(x, z);
      const edge = CAMP1.clearingRadius + n * edgeNoise;
      const walkable = r < CAMP1.boundRadius + 3 || inZones(x, z, 3);
      const y = walkable ? 0 : (n * 0.5 + 0.5) * outerBump;
      positions.push(x, y, z);

      const zf = zoneAt(x, z) ?? corridorAt(x, z);
      if (baseAt(x, z) && r > edge + 1.2) {
        // Outposts / plane wreck: trampled earth with moss creeping in (like the Landing Site).
        c.copy(campEarth).lerp(campEarthDark, Math.max(0, n) * 0.7);
        if (n < -0.35) c.lerp(campMoss, Math.min(1, (-n - 0.35) * 2.2));
      } else if (zf && r > edge + 1.2) {
        // Zone floor (each zone its own soil), revealed as plants are cut.
        c.set(zf.floor).lerp(dirtDark, (n * 0.5 + 0.5) * 0.45);
      } else if (r < edge - 1.2) {
        // Landing Site: mossy forest floor with a sunlit patch in the middle.
        c.copy(campEarth).lerp(campEarthDark, Math.max(0, n) * 0.7);
        if (n < -0.35) c.lerp(campMoss, Math.min(1, (-n - 0.35) * 2.2));
        if (r < 5.5) c.lerp(campSun, (1 - r / 5.5) * 0.65);
      } else if (r < edge + 1.2) {
        const t = (r - (edge - 1.2)) / 2.4;
        c.copy(campEarthDark).lerp(earth, t);
      } else {
        tmp.copy(floor).lerp(floorDark, n * 0.5 + 0.5);
        c.copy(tmp).lerp(earth, Math.max(0, -n) * 0.5);
      }
      colors.push(c.r, c.g, c.b);
    }
  }
  // Centre fan
  for (let si = 0; si < segments; si++) {
    const a = 1 + si;
    const bb = 1 + ((si + 1) % segments);
    indices.push(0, bb, a);
  }
  // Ring quads
  for (let ri = 1; ri < rings; ri++) {
    const inner = 1 + (ri - 1) * segments;
    const outer = 1 + ri * segments;
    for (let si = 0; si < segments; si++) {
      const sn = (si + 1) % segments;
      const a = inner + si;
      const bb = inner + sn;
      const cc = outer + si;
      const d = outer + sn;
      indices.push(a, bb, cc, bb, d, cc);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
