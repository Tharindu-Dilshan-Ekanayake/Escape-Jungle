import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Vector3,
} from "three";

/**
 * Blade swoosh: a ribbon through the last N blade positions (inner point and
 * tip), fading out along its length. Fixed-size buffers, rewritten in place
 * every frame; 1 draw call, additive, only visible while it has any length.
 */
export class SwingTrail {
  readonly mesh: Mesh;
  private readonly n: number;
  private readonly inner: Float32Array;
  private readonly tip: Float32Array;
  private readonly pos: Float32Array;
  private readonly geo: BufferGeometry;
  private readonly mat: MeshBasicMaterial;
  private filled = 0;

  constructor(samples = 14, color = "#ffffff") {
    this.n = samples;
    this.inner = new Float32Array(samples * 3);
    this.tip = new Float32Array(samples * 3);
    this.pos = new Float32Array(samples * 2 * 3);
    const col = new Float32Array(samples * 2 * 3);
    for (let i = 0; i < samples; i++) {
      const fade = Math.pow(1 - i / (samples - 1), 1.6);
      const inner = fade * 0.03;
      const tip = fade * 0.32;
      col.set([inner, inner * 1.05, inner * 1.15, tip, tip * 1.05, tip * 1.15], i * 6);
    }
    const idx: number[] = [];
    for (let i = 0; i < samples - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geo = new BufferGeometry();
    this.geo.setAttribute("position", new BufferAttribute(this.pos, 3));
    this.geo.setAttribute("color", new BufferAttribute(col, 3));
    this.geo.setIndex(idx);
    this.mat = new MeshBasicMaterial({
      color,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Push the current blade points (viewmodel space). `active` = record motion; otherwise collapse. */
  update(inner: Vector3, tip: Vector3, active: boolean) {
    if (!active && this.filled === 0) {
      this.mesh.visible = false;
      return;
    }
    this.inner.copyWithin(3, 0, (this.n - 1) * 3);
    this.tip.copyWithin(3, 0, (this.n - 1) * 3);
    this.inner[0] = inner.x;
    this.inner[1] = inner.y;
    this.inner[2] = inner.z;
    this.tip[0] = tip.x;
    this.tip[1] = tip.y;
    this.tip[2] = tip.z;
    if (active) this.filled = this.n;
    else this.filled = Math.max(0, this.filled - 1);
    // Samples not yet recorded collapse onto the newest one.
    for (let i = 0; i < this.n; i++) {
      const src = i < this.filled ? i : 0;
      this.pos[i * 6] = this.inner[src * 3];
      this.pos[i * 6 + 1] = this.inner[src * 3 + 1];
      this.pos[i * 6 + 2] = this.inner[src * 3 + 2];
      this.pos[i * 6 + 3] = this.tip[src * 3];
      this.pos[i * 6 + 4] = this.tip[src * 3 + 1];
      this.pos[i * 6 + 5] = this.tip[src * 3 + 2];
    }
    (this.geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
    this.mesh.visible = this.filled > 1;
  }

  reset() {
    this.filled = 0;
    this.mesh.visible = false;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
