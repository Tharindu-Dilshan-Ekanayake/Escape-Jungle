import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix3,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { leafTemplate } from "./leaf";

/**
 * Build-time geometry merger. Props are authored from primitives, each with a
 * vertex colour (optionally a bottom->top gradient), and baked into ONE
 * BufferGeometry per 16 m chunk (and a second one for unlit "glow" parts).
 * Runs once when a stage mounts, never per frame.
 */
export type V3 = [number, number, number];

export interface PartStyle {
  color: string;
  /** Colour at the top of the part (gradient). Defaults to `color`. */
  top?: string;
  /** +- brightness variation per part, 0..1. */
  jitter?: number;
  /** Goes to the unlit glow mesh (flames, bulbs, fireflies-like). */
  glow?: boolean;
  /** Reverse triangle winding (inside-out domes). */
  flip?: boolean;
}

export interface Placement extends PartStyle {
  pos: V3;
  rot?: V3;
  scale?: V3;
}

interface Template {
  pos: Float32Array;
  nrm: Float32Array;
  idx: ArrayLike<number>;
  minY: number;
  maxY: number;
}

class Acc {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  idx: number[] = [];
}

export interface ChunkGeometry {
  key: string;
  geometry: BufferGeometry;
  /** Chunk centre on XZ, used for distance culling. */
  cx: number;
  cz: number;
}

function toTemplate(source: BufferGeometry): Template {
  let g = source;
  if (!g.index) {
    // Polyhedra come non-indexed (3 verts per face). Flat shading derives face
    // normals itself, so weld shared corners: ico(1) 240 -> 42 verts.
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    g = mergeVertices(g);
    source.dispose();
    const p = g.getAttribute("position");
    const n = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const len = Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) || 1;
      n.set([p.getX(i) / len, p.getY(i) / len, p.getZ(i) / len], i * 3);
    }
    g.setAttribute("normal", new BufferAttribute(n, 3));
  }
  const pos = g.getAttribute("position").array as Float32Array;
  const nrm = g.getAttribute("normal").array as Float32Array;
  const count = pos.length / 3;
  const idx = g.index ? g.index.array : Array.from({ length: count }, (_, i) => i);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < pos.length; i += 3) {
    minY = Math.min(minY, pos[i]);
    maxY = Math.max(maxY, pos[i]);
  }
  const t = { pos: pos.slice(), nrm: nrm.slice(), idx: Array.from(idx), minY, maxY };
  g.dispose();
  return t;
}

export class PartBuilder {
  private solid = new Map<string, Acc>();
  private glow = new Map<string, Acc>();
  private templates = new Map<string, Template>();
  private stack: Matrix4[] = [new Matrix4()];
  private groupOrigin: V3 | null = null;
  private rng: () => number;

  // Scratch objects, reused for every part.
  private m = new Matrix4();
  private n = new Matrix3();
  private e = new Euler(0, 0, 0, "YXZ");
  private q = new Quaternion();
  private v = new Vector3();
  private s = new Vector3();
  private c0 = new Color();
  private c1 = new Color();

  constructor(
    private chunkSize: number,
    rng: () => number,
  ) {
    this.rng = rng;
  }

  /** Author the following parts in a local frame (e.g. one prop); `rotX` tilts it before turning. */
  push(pos: V3, rotY = 0, scale = 1, rotX = 0) {
    this.e.set(rotX, rotY, 0);
    this.q.setFromEuler(this.e);
    this.m.compose(this.v.set(...pos), this.q, this.s.setScalar(scale));
    this.stack.push(this.stack[this.stack.length - 1].clone().multiply(this.m));
    if (this.stack.length === 2) this.groupOrigin = pos;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    if (this.stack.length === 1) this.groupOrigin = null;
  }

  box(size: V3, p: Placement) {
    this.add("box", () => new BoxGeometry(1, 1, 1), { ...p, scale: mul(size, p.scale) });
  }

  /** Cylinder/cone centred on `pos`, axis along local Y. rTop 0 = cone. */
  cyl(rTop: number, rBottom: number, h: number, seg: number, p: Placement) {
    this.add(`cyl:${rTop}:${rBottom}:${seg}`, () => new CylinderGeometry(rTop, rBottom, 1, seg, 1), {
      ...p,
      scale: mul([1, h, 1], p.scale),
    });
  }

  ico(r: number, detail: 0 | 1, p: Placement) {
    this.add(`ico:${detail}`, () => new IcosahedronGeometry(1, detail), { ...p, scale: mul([r, r, r], p.scale) });
  }

  dodeca(r: number, p: Placement) {
    this.add("dodeca", () => new DodecahedronGeometry(1, 0), { ...p, scale: mul([r, r, r], p.scale) });
  }

  /** Two-sided low-poly leaf: base at pos, pointing local +Z. */
  leaf(len: number, width: number, p: Placement) {
    this.add("leaf", leafTemplate, { ...p, scale: mul([width, len, len], p.scale) });
  }

  /** Deterministic random in [min, max). */
  rand(min = 0, max = 1) {
    return min + (max - min) * this.rng();
  }

  private template(key: string, make: () => BufferGeometry) {
    let t = this.templates.get(key);
    if (!t) {
      t = toTemplate(make());
      this.templates.set(key, t);
    }
    return t;
  }

  private add(key: string, make: () => BufferGeometry, p: Placement) {
    const t = this.template(key, make);
    const r = p.rot ?? [0, 0, 0];
    this.e.set(r[0], r[1], r[2]);
    this.q.setFromEuler(this.e);
    const sc = p.scale ?? [1, 1, 1];
    this.m.compose(this.v.set(...p.pos), this.q, this.s.set(sc[0], sc[1], sc[2]));
    this.m.premultiply(this.stack[this.stack.length - 1]);
    this.n.getNormalMatrix(this.m);

    // Chunk by the group origin (whole prop stays in one chunk) or the part origin.
    let wx: number;
    let wz: number;
    if (this.groupOrigin) {
      [wx, , wz] = this.groupOrigin;
    } else {
      this.v.set(0, 0, 0).applyMatrix4(this.m);
      wx = this.v.x;
      wz = this.v.z;
    }
    const ix = Number.isFinite(this.chunkSize) ? Math.floor(wx / this.chunkSize) : 0;
    const iz = Number.isFinite(this.chunkSize) ? Math.floor(wz / this.chunkSize) : 0;
    const chunkKey = `${ix},${iz}`;
    const map = p.glow ? this.glow : this.solid;
    let acc = map.get(chunkKey);
    if (!acc) map.set(chunkKey, (acc = new Acc()));

    const j = 1 + (this.rng() - 0.5) * (p.jitter ?? 0);
    this.c0.set(p.color).multiplyScalar(j);
    this.c1.set(p.top ?? p.color).multiplyScalar(j);
    const span = t.maxY - t.minY || 1;
    const base = acc.pos.length / 3;
    const e = this.m.elements;
    const ne = this.n.elements;

    for (let i = 0; i < t.pos.length; i += 3) {
      const x = t.pos[i];
      const y = t.pos[i + 1];
      const z = t.pos[i + 2];
      acc.pos.push(
        e[0] * x + e[4] * y + e[8] * z + e[12],
        e[1] * x + e[5] * y + e[9] * z + e[13],
        e[2] * x + e[6] * y + e[10] * z + e[14],
      );
      const nx = t.nrm[i];
      const ny = t.nrm[i + 1];
      const nz = t.nrm[i + 2];
      const ox = ne[0] * nx + ne[3] * ny + ne[6] * nz;
      const oy = ne[1] * nx + ne[4] * ny + ne[7] * nz;
      const oz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
      const len = Math.hypot(ox, oy, oz) || 1;
      acc.nrm.push(ox / len, oy / len, oz / len);
      const k = (y - t.minY) / span;
      acc.col.push(
        this.c0.r + (this.c1.r - this.c0.r) * k,
        this.c0.g + (this.c1.g - this.c0.g) * k,
        this.c0.b + (this.c1.b - this.c0.b) * k,
      );
    }
    for (let i = 0; i < t.idx.length; i += 3) {
      const a = t.idx[i] + base;
      const b = t.idx[i + 1] + base;
      const c = t.idx[i + 2] + base;
      if (p.flip) acc.idx.push(a, c, b);
      else acc.idx.push(a, b, c);
    }
  }

  build(): { solid: ChunkGeometry[]; glow: ChunkGeometry[] } {
    const out = (map: Map<string, Acc>) =>
      [...map.entries()].map(([key, acc]) => {
        const g = new BufferGeometry();
        g.setAttribute("position", new BufferAttribute(new Float32Array(acc.pos), 3));
        g.setAttribute("normal", new BufferAttribute(new Float32Array(acc.nrm), 3));
        g.setAttribute("color", new BufferAttribute(new Float32Array(acc.col), 3));
        const vertCount = acc.pos.length / 3;
        g.setIndex(
          new BufferAttribute(vertCount > 65535 ? new Uint32Array(acc.idx) : new Uint16Array(acc.idx), 1),
        );
        g.computeBoundingSphere();
        const [ix, iz] = key.split(",").map(Number);
        const half = Number.isFinite(this.chunkSize) ? this.chunkSize / 2 : 0;
        return {
          key,
          geometry: g,
          cx: Number.isFinite(this.chunkSize) ? ix * this.chunkSize + half : 0,
          cz: Number.isFinite(this.chunkSize) ? iz * this.chunkSize + half : 0,
        };
      });
    const result = { solid: out(this.solid), glow: out(this.glow) };
    this.solid.clear();
    this.glow.clear();
    this.templates.clear();
    return result;
  }
}

function mul(a: V3, b?: V3): V3 {
  return b ? [a[0] * b[0], a[1] * b[1], a[2] * b[2]] : a;
}
