/**
 * 2D (XZ) collision for the first-person controller. The camp is flat and
 * every obstacle is static, so circles + oriented boxes are enough and cost
 * far less than a physics engine. Zero allocations per call.
 */
export interface CircleCollider {
  kind: "circle";
  /** Temporarily disabled (e.g. an opened gate). */
  off?: boolean;
  /** Top height (m). Low things (rocks, debris, benches) can be jumped over; unset = a wall. */
  h?: number;
  x: number;
  z: number;
  r: number;
}

export interface BoxCollider {
  kind: "box";
  /** Temporarily disabled (e.g. an opened gate). */
  off?: boolean;
  /** Top height (m). Low things (rocks, debris, benches) can be jumped over; unset = a wall. */
  h?: number;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** cos/sin of the box yaw, precomputed. */
  cos: number;
  sin: number;
}

export type Collider = CircleCollider | BoxCollider;

/** Collider in a prop's local frame (rot = local yaw). */
export type LocalCollider =
  | { kind: "circle"; x: number; z: number; r: number; h?: number }
  | { kind: "box"; x: number; z: number; hx: number; hz: number; rot?: number; h?: number };

/** Transform a prop-local collider into world space (build time only). */
export function toWorld(c: LocalCollider, px: number, pz: number, rotY: number): Collider {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  // Ry: x' = x cos + z sin, z' = -x sin + z cos
  const x = px + c.x * cos + c.z * sin;
  const z = pz - c.x * sin + c.z * cos;
  if (c.kind === "circle") return { kind: "circle", x, z, r: c.r, h: c.h };
  const yaw = rotY + (c.rot ?? 0);
  return { kind: "box", x, z, hx: c.hx, hz: c.hz, cos: Math.cos(yaw), sin: Math.sin(yaw), h: c.h };
}

interface Body {
  x: number;
  z: number;
  /** Feet height; above an obstacle's top you pass over it. */
  y?: number;
}

/** Walkable area = union of circles and axis-aligned rects (camp + grass zones). */
export interface Region {
  circles: { x: number; z: number; r: number }[];
  rects: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

/** Keep the body inside the region; if outside, move it to the nearest allowed point. */
export function clampToRegion(p: Body, radius: number, region: Region) {
  let bestX = p.x;
  let bestZ = p.z;
  let best = Infinity;
  for (const c of region.circles) {
    const max = c.r - radius;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d2 = dx * dx + dz * dz;
    if (d2 <= max * max) return;
    const d = Math.sqrt(d2);
    const gap = d - max;
    if (gap < best) {
      best = gap;
      bestX = c.x + (dx / d) * max;
      bestZ = c.z + (dz / d) * max;
    }
  }
  for (const r of region.rects) {
    const cx = Math.max(r.minX + radius, Math.min(r.maxX - radius, p.x));
    const cz = Math.max(r.minZ + radius, Math.min(r.maxZ - radius, p.z));
    if (cx === p.x && cz === p.z) return;
    const gap = Math.hypot(p.x - cx, p.z - cz);
    if (gap < best) {
      best = gap;
      bestX = cx;
      bestZ = cz;
    }
  }
  p.x = bestX;
  p.z = bestZ;
}

/**
 * Height of the top you are standing over: the highest jumpable obstacle
 * (one with `h`) whose footprint contains (x, z), else 0 (the ground).
 */
export function floorAt(x: number, z: number, colliders: readonly Collider[]): number {
  let top = 0;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.off || c.h === undefined || c.h <= top) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    if (c.kind === "circle") {
      if (dx * dx + dz * dz < c.r * c.r) top = c.h;
    } else {
      const lx = dx * c.cos - dz * c.sin;
      const lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) top = c.h;
    }
  }
  return top;
}

/** Feet this close to an obstacle's top already slide over it. */
const JUMP_CLEAR = 0.08;

export function resolveCollisions(p: Body, colliders: readonly Collider[], radius: number, region: Region, passes: number) {
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.off) continue;
      if (c.h !== undefined && (p.y ?? 0) >= c.h - JUMP_CLEAR) continue;
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      if (c.kind === "circle") {
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-10) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        p.x += dx * push;
        p.z += dz * push;
        continue;
      }
      // Into box-local space (inverse yaw).
      let lx = dx * c.cos - dz * c.sin;
      let lz = dx * c.sin + dz * c.cos;
      const cx = Math.max(-c.hx, Math.min(c.hx, lx));
      const cz = Math.max(-c.hz, Math.min(c.hz, lz));
      const ox = lx - cx;
      const oz = lz - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        lx += ox * push;
        lz += oz * push;
      } else {
        // Centre inside the box: exit through the nearest face.
        const px = c.hx - Math.abs(lx);
        const pz = c.hz - Math.abs(lz);
        if (px < pz) lx = Math.sign(lx || 1) * (c.hx + radius);
        else lz = Math.sign(lz || 1) * (c.hz + radius);
      }
      p.x = c.x + lx * c.cos + lz * c.sin;
      p.z = c.z - lx * c.sin + lz * c.cos;
    }
  }
  clampToRegion(p, radius, region);
}
