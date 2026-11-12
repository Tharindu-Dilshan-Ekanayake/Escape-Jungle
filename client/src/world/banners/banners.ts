import { BufferAttribute, BufferGeometry, CanvasTexture, SRGBColorSpace } from "three";

/**
 * Text printed on things (signs, boards, banners) instead of floating labels.
 * All banners of a stage share ONE canvas texture atlas and ONE merged
 * geometry, so every name in the world costs a single draw call.
 */
export type BannerStyle = "wood" | "cream" | "cloth" | "gold" | "board";

export interface BannerSpec {
  text: string;
  sub?: string;
  /** Centre of the banner face (world) and the direction it faces (radians, like Object3D.rotation.y). */
  x: number;
  y: number;
  z: number;
  rotY: number;
  /** Size in metres. */
  w: number;
  h: number;
  style?: BannerStyle;
  /** Also print it on the back. */
  twoSided?: boolean;
}

const STYLE: Record<BannerStyle, { bg: string; bg2: string; border: string; ink: string; font: string }> = {
  wood: { bg: "#8a5a34", bg2: "#6b4423", border: "#3a2412", ink: "#fff4d6", font: "Fredoka" },
  cream: { bg: "#fff4d6", bg2: "#f0dfb4", border: "#7a4b2a", ink: "#3a2412", font: "Fredoka" },
  cloth: { bg: "#e8742a", bg2: "#c85a1a", border: "#fff4d6", ink: "#ffffff", font: "Fredoka" },
  gold: { bg: "#f2c230", bg2: "#d9a520", border: "#7a4b2a", ink: "#3a2412", font: "Fredoka" },
  board: { bg: "#fff4d6", bg2: "#efe3c2", border: "#c8b48a", ink: "#3a2412", font: "Special Elite" },
};

const ATLAS_W = 1024;
const CELL_W = 512;

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawCell(ctx: CanvasRenderingContext2D, c: Cell, s: BannerSpec) {
  const st = STYLE[s.style ?? "wood"];
  const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  g.addColorStop(0, st.bg);
  g.addColorStop(1, st.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(c.x, c.y, c.w, c.h);
  if (s.style === "wood" || !s.style) {
    // Wood grain.
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + (c.h * i) / 5 + Math.sin(i) * 3);
      ctx.lineTo(c.x + c.w, c.y + (c.h * i) / 5 - Math.sin(i * 2) * 3);
      ctx.stroke();
    }
  }
  const bw = Math.max(4, c.h * 0.07);
  ctx.strokeStyle = st.border;
  ctx.lineWidth = bw;
  ctx.strokeRect(c.x + bw / 2, c.y + bw / 2, c.w - bw, c.h - bw);
  // Text, auto-fitted to the cell.
  ctx.fillStyle = st.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = s.sub ? 2 : 1;
  let size = Math.floor((c.h - bw * 2) * (lines === 2 ? 0.46 : 0.62));
  const fit = (text: string, px: number) => {
    ctx.font = `bold ${px}px '${st.font}', sans-serif`;
    while (ctx.measureText(text).width > c.w - bw * 4 && px > 10) ctx.font = `bold ${--px}px '${st.font}', sans-serif`;
    return px;
  };
  size = fit(s.text, size);
  const cy = c.y + c.h / 2 - (s.sub ? c.h * 0.14 : 0);
  if (st.ink === "#ffffff" || st.ink === "#fff4d6") {
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.strokeText(s.text, c.x + c.w / 2, cy);
  }
  ctx.fillText(s.text, c.x + c.w / 2, cy);
  if (s.sub) {
    fit(s.sub, Math.floor(size * 0.55));
    ctx.globalAlpha = 0.85;
    ctx.fillText(s.sub, c.x + c.w / 2, c.y + c.h * 0.72);
    ctx.globalAlpha = 1;
  }
}

export interface BannerBuild {
  geometry: BufferGeometry;
  texture: CanvasTexture;
  dispose: () => void;
}

export function buildBanners(specs: BannerSpec[]): BannerBuild {
  // Shelf-pack cells (two per row), height from each banner's aspect ratio.
  const cells: Cell[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const s of specs) {
    const h = Math.max(64, Math.min(384, Math.round((CELL_W * s.h) / s.w)));
    if (x + CELL_W > ATLAS_W) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    cells.push({ x, y, w: CELL_W, h });
    x += CELL_W;
    rowH = Math.max(rowH, h);
  }
  const atlasH = Math.max(64, Math.pow(2, Math.ceil(Math.log2(Math.max(1, y + rowH)))));
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_W;
  canvas.height = atlasH;
  const ctx = canvas.getContext("2d")!;
  const draw = () => specs.forEach((s, i) => drawCell(ctx, cells[i], s));
  draw();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  // Redraw once the web fonts are ready (first paint may use a fallback font).
  document.fonts?.ready.then(() => {
    draw();
    texture.needsUpdate = true;
  });

  const quads = specs.reduce((n, s) => n + (s.twoSided ? 2 : 1), 0);
  const pos = new Float32Array(quads * 4 * 3);
  const nrm = new Float32Array(quads * 4 * 3);
  const uv = new Float32Array(quads * 4 * 2);
  const idx: number[] = [];
  let q = 0;
  const addQuad = (s: BannerSpec, c: Cell, back: boolean) => {
    const r = s.rotY + (back ? Math.PI : 0);
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    // Local X axis and normal (+Z) after the Y rotation.
    const ax = cos;
    const az = -sin;
    const nx = sin;
    const nz = cos;
    const off = 0.012;
    const hw = s.w / 2;
    const hh = s.h / 2;
    const corners: [number, number, number, number][] = [
      [-hw, -hh, 0, 1],
      [hw, -hh, 1, 1],
      [hw, hh, 1, 0],
      [-hw, hh, 0, 0],
    ];
    corners.forEach(([lx, ly, u, v], k) => {
      const o = (q * 4 + k) * 3;
      pos[o] = s.x + ax * lx + nx * off;
      pos[o + 1] = s.y + ly;
      pos[o + 2] = s.z + az * lx + nz * off;
      nrm[o] = nx;
      nrm[o + 1] = 0;
      nrm[o + 2] = nz;
      const t = (q * 4 + k) * 2;
      uv[t] = (c.x + u * c.w) / ATLAS_W;
      uv[t + 1] = 1 - (c.y + v * c.h) / atlasH;
    });
    const b = q * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    q++;
  };
  specs.forEach((s, i) => {
    addQuad(s, cells[i], false);
    if (s.twoSided) addQuad(s, cells[i], true);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new BufferAttribute(nrm, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(idx);
  geometry.computeBoundingSphere();
  return {
    geometry,
    texture,
    dispose: () => {
      geometry.dispose();
      texture.dispose();
    },
  };
}
