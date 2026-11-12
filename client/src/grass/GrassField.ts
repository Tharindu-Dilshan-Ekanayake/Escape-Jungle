import { Color } from "three";
import { CELL_SIZE, CHUNK_CELLS, GRASS_RENDER, GRASS_RULES, PLANT_TYPES } from "../config/grass";
import { mulberry32 } from "../world/geo/rng";

/** Render data for one 16 m chunk (one InstancedMesh per plant type; Phase 2 has one type). */
export interface GrassChunk {
  key: string;
  cx: number;
  cz: number;
  /** Cell index for each instance. */
  cells: Int32Array;
  matrices: Float32Array;
  colors: Float32Array;
  px: Float32Array;
  pz: Float32Array;
  cosYaw: Float32Array;
  sinYaw: Float32Array;
  scale: Float32Array;
  height: Float32Array;
  /** Set when matrices changed and need uploading. */
  dirty: boolean;
}

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const NO_INSTANCE = 0xffff;
const ANIM_CAP = 512;

/**
 * Grass grid (CLAUDE.md 5.1): per-cell plant type + hp, and an alive BITSET
 * (Uint8Array, 1 bit per cell) ready for network sync. All hot-path state is
 * typed arrays; nothing here touches React.
 */
export class GrassField {
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minZ: number;
  readonly count: number;
  readonly type: Uint8Array;
  readonly hp: Uint8Array;
  readonly alive: Uint8Array;
  readonly chunkOf: Uint16Array;
  readonly instOf: Uint16Array;
  readonly chunks: GrassChunk[] = [];
  totalCuttable = 0;
  cleared = 0;

  // Cells currently shrinking to stubble.
  private animCell = new Int32Array(ANIM_CAP);
  private animStart = new Float32Array(ANIM_CAP);
  private animCount = 0;

  /** The plant growing in this field (one type per zone). */
  readonly plantId: number;

  constructor(rect: Rect, seed: number, plantId: number, exclude: (x: number, z: number) => boolean) {
    this.plantId = plantId;
    this.minX = rect.minX;
    this.minZ = rect.minZ;
    this.cols = Math.floor((rect.maxX - rect.minX) / CELL_SIZE);
    this.rows = Math.floor((rect.maxZ - rect.minZ) / CELL_SIZE);
    this.count = this.cols * this.rows;
    this.type = new Uint8Array(this.count);
    this.hp = new Uint8Array(this.count);
    this.alive = new Uint8Array(Math.ceil(this.count / 8));
    this.chunkOf = new Uint16Array(this.count).fill(NO_INSTANCE);
    this.instOf = new Uint16Array(this.count).fill(NO_INSTANCE);

    const plant = PLANT_TYPES[plantId];
    for (let i = 0; i < this.count; i++) {
      if (exclude(this.cellX(i), this.cellZ(i))) continue;
      this.type[i] = plant.id;
      this.hp[i] = plant.hp;
      this.alive[i >> 3] |= 1 << (i & 7);
      this.totalCuttable++;
    }
    this.buildChunks(mulberry32(seed));
  }

  cellX(i: number) {
    return this.minX + ((i % this.cols) + 0.5) * CELL_SIZE;
  }

  cellZ(i: number) {
    return this.minZ + (Math.floor(i / this.cols) + 0.5) * CELL_SIZE;
  }

  isAlive(i: number) {
    return (this.alive[i >> 3] & (1 << (i & 7))) !== 0;
  }

  get clearRatio() {
    return this.totalCuttable ? this.cleared / this.totalCuttable : 0;
  }

  private buildChunks(rng: () => number) {
    const plant = PLANT_TYPES[this.plantId];
    const tints = plant.tints.map((t) => new Color(t));
    const ccols = Math.ceil(this.cols / CHUNK_CELLS);
    const crows = Math.ceil(this.rows / CHUNK_CELLS);
    const c = new Color();
    for (let cr = 0; cr < crows; cr++) {
      for (let cc = 0; cc < ccols; cc++) {
        const list: number[] = [];
        for (let r = cr * CHUNK_CELLS; r < Math.min(this.rows, (cr + 1) * CHUNK_CELLS); r++)
          for (let col = cc * CHUNK_CELLS; col < Math.min(this.cols, (cc + 1) * CHUNK_CELLS); col++) {
            const i = r * this.cols + col;
            if (this.type[i]) list.push(i);
          }
        if (!list.length) continue;
        const n = list.length;
        const ch: GrassChunk = {
          key: `${cc},${cr}`,
          cx: this.minX + (cc + 0.5) * CHUNK_CELLS * CELL_SIZE,
          cz: this.minZ + (cr + 0.5) * CHUNK_CELLS * CELL_SIZE,
          cells: Int32Array.from(list),
          matrices: new Float32Array(n * 16),
          colors: new Float32Array(n * 3),
          px: new Float32Array(n),
          pz: new Float32Array(n),
          cosYaw: new Float32Array(n),
          sinYaw: new Float32Array(n),
          scale: new Float32Array(n),
          height: new Float32Array(n),
          dirty: false,
        };
        const chunkIndex = this.chunks.length;
        for (let k = 0; k < n; k++) {
          const i = list[k];
          this.chunkOf[i] = chunkIndex;
          this.instOf[i] = k;
          const yaw = rng() * Math.PI * 2;
          ch.px[k] = this.cellX(i) + (rng() - 0.5) * 0.12;
          ch.pz[k] = this.cellZ(i) + (rng() - 0.5) * 0.12;
          ch.cosYaw[k] = Math.cos(yaw);
          ch.sinYaw[k] = Math.sin(yaw);
          ch.scale[k] = 0.9 + rng() * 0.25;
          ch.height[k] = plant.heightMin + rng() * (plant.heightMax - plant.heightMin);
          c.copy(tints[Math.floor(rng() * tints.length)]).multiplyScalar(0.92 + rng() * 0.16);
          ch.colors.set([c.r, c.g, c.b], k * 3);
          this.writeMatrix(ch, k, ch.height[k]);
        }
        this.chunks.push(ch);
      }
    }
  }

  /** Instance matrix = T(x,0,z) * Ry(yaw) * S(s, h, s), written straight into the array. */
  private writeMatrix(ch: GrassChunk, k: number, h: number) {
    const m = ch.matrices;
    const o = k * 16;
    const s = ch.scale[k];
    const cos = ch.cosYaw[k];
    const sin = ch.sinYaw[k];
    m[o] = cos * s;
    m[o + 1] = 0;
    m[o + 2] = -sin * s;
    m[o + 3] = 0;
    m[o + 4] = 0;
    m[o + 5] = h;
    m[o + 6] = 0;
    m[o + 7] = 0;
    m[o + 8] = sin * s;
    m[o + 9] = 0;
    m[o + 10] = cos * s;
    m[o + 11] = 0;
    m[o + 12] = ch.px[k];
    m[o + 13] = 0;
    m[o + 14] = ch.pz[k];
    m[o + 15] = 1;
  }

  /** Destroy a cell (now = performance.now() / 1000). Returns its plant type id (0 if it was already gone). */
  cut(i: number, now: number): number {
    if (!this.isAlive(i)) return 0;
    this.alive[i >> 3] &= ~(1 << (i & 7));
    this.hp[i] = 0;
    this.cleared++;
    if (this.animCount < ANIM_CAP) {
      this.animCell[this.animCount] = i;
      this.animStart[this.animCount] = now;
      this.animCount++;
    } else {
      this.setStubble(i, 1);
    }
    return this.type[i];
  }

  /**
   * Advance cut animations (blades shrink to stubble). Call once per frame with
   * the same clock as cut() (performance.now() / 1000). t is clamped to 0..1, so
   * a mismatched clock can only delay a shrink, never stretch a plant upward.
   */
  update(now: number) {
    for (let a = this.animCount - 1; a >= 0; a--) {
      const t = Math.min(1, Math.max(0, (now - this.animStart[a]) / GRASS_RENDER.cutAnimTime));
      this.setStubble(this.animCell[a], t);
      if (t >= 1) {
        this.animCount--;
        this.animCell[a] = this.animCell[this.animCount];
        this.animStart[a] = this.animStart[this.animCount];
      }
    }
  }

  private setStubble(i: number, t: number) {
    const ch = this.chunks[this.chunkOf[i]];
    const k = this.instOf[i];
    const h = ch.height[k];
    this.writeMatrix(ch, k, h + (h * GRASS_RENDER.stubbleRatio - h) * t);
    ch.dirty = true;
  }

  /**
   * Alive cells inside a forward arc. Writes cell indices into `out`, returns
   * the count. dir must be normalised; cosHalf = cos(arc / 2).
   */
  queryArc(px: number, pz: number, dirX: number, dirZ: number, range: number, cosHalf: number, closeR: number, out: Int32Array) {
    let n = 0;
    const c0 = Math.max(0, Math.floor((px - range - this.minX) / CELL_SIZE));
    const c1 = Math.min(this.cols - 1, Math.floor((px + range - this.minX) / CELL_SIZE));
    const r0 = Math.max(0, Math.floor((pz - range - this.minZ) / CELL_SIZE));
    const r1 = Math.min(this.rows - 1, Math.floor((pz + range - this.minZ) / CELL_SIZE));
    const range2 = range * range;
    const close2 = closeR * closeR;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * this.cols + c;
        if (!this.type[i] || !this.isAlive(i)) continue;
        const dx = this.minX + (c + 0.5) * CELL_SIZE - px;
        const dz = this.minZ + (r + 0.5) * CELL_SIZE - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 > range2) continue;
        if (d2 > close2 && (dx * dirX + dz * dirZ) / Math.sqrt(d2) < cosHalf) continue;
        if (n < out.length) out[n++] = i;
      }
    }
    return n;
  }

  /** True if a circle at (x, z) touches any alive cell's blocking box. Zero allocations. */
  overlaps(x: number, z: number, radius: number): boolean {
    if (!GRASS_RULES.blocksMovement) return false;
    const h = GRASS_RULES.collisionHalf;
    const reach = radius + h;
    const c0 = Math.max(0, Math.floor((x - reach - this.minX) / CELL_SIZE));
    const c1 = Math.min(this.cols - 1, Math.floor((x + reach - this.minX) / CELL_SIZE));
    const r0 = Math.max(0, Math.floor((z - reach - this.minZ) / CELL_SIZE));
    const r1 = Math.min(this.rows - 1, Math.floor((z + reach - this.minZ) / CELL_SIZE));
    const r2 = radius * radius;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * this.cols + c;
        if (!this.type[i] || !this.isAlive(i)) continue;
        const lx = x - (this.minX + (c + 0.5) * CELL_SIZE);
        const lz = z - (this.minZ + (r + 0.5) * CELL_SIZE);
        const ox = lx - Math.max(-h, Math.min(h, lx));
        const oz = lz - Math.max(-h, Math.min(h, lz));
        if (ox * ox + oz * oz < r2) return true;
      }
    }
    return false;
  }
}
