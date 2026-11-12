import { ZONES1 } from "../../config/zones1";
import { BASE_PATH as K } from "../../config/zonesDecor";
import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
type P2 = { x: number; z: number };

/** Ends of a corridor's long axis: [nearest to `from`, farthest]. */
function corridorEnds(c: Rect, from: P2): [P2, P2] {
  const cx = (c.minX + c.maxX) / 2;
  const cz = (c.minZ + c.maxZ) / 2;
  const alongX = c.maxX - c.minX > c.maxZ - c.minZ;
  const a = alongX ? { x: c.minX + K.inset, z: cz } : { x: cx, z: c.minZ + K.inset };
  const b = alongX ? { x: c.maxX - K.inset, z: cz } : { x: cx, z: c.maxZ - K.inset };
  const da = Math.hypot(a.x - from.x, a.z - from.z);
  const db = Math.hypot(b.x - from.x, b.z - from.z);
  return da < db ? [a, b] : [b, a];
}

/**
 * A little stepping-stone trail from every base into the area it leads to:
 * flat stones with pebble borders. Baked into the chunk meshes.
 */
export function addBasePaths(b: PartBuilder, colliders: Collider[]) {
  void colliders; // nothing solid on the trail
  ZONES1.forEach((zn, i) => {
    // Where the walk starts: the crash-site's north edge, or the outpost centre.
    const base = i === 0 ? K.campStart : ZONES1[i - 1].base;
    const [near, far] = corridorEnds(zn.corridor, base);
    const dx0 = near.x - base.x;
    const dz0 = near.z - base.z;
    const l0 = Math.hypot(dx0, dz0) || 1;
    const skip = i === 0 ? 0 : K.outpostClear;
    const start = { x: base.x + (dx0 / l0) * skip, z: base.z + (dz0 / l0) * skip };
    const legs: [P2, P2][] = [
      [start, near],
      [near, far],
    ];
    for (const [p0, p1] of legs) {
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const ux = dx / len;
      const uz = dz / len;
      const steps = Math.floor(len / K.step);
      for (let s = 0; s <= steps; s++) {
        const t = s * K.step;
        const wob = (s % 2 ? 1 : -1) * K.wobble;
        const x = p0.x + ux * t - uz * wob;
        const z = p0.z + uz * t + ux * wob;
        const r = b.rand(K.stoneR[0], K.stoneR[1]);
        b.cyl(r, r * 1.05, 0.06, 6, { pos: [x, 0.022, z], rot: [0, b.rand(0, 1), 0], scale: [1, 0.6, b.rand(0.7, 0.95)], color: K.stone, top: K.stoneTop, jitter: 0.12 });
        if (s % K.pebbleEvery === 0) {
          for (const sd of [-1, 1]) b.ico(b.rand(0.1, 0.15), 0, { pos: [x - uz * sd * K.border, 0.06, z + ux * sd * K.border], scale: [1.3, 0.6, 1], color: K.pebble, jitter: 0.15 });
        }
      }
    }
  });
}
