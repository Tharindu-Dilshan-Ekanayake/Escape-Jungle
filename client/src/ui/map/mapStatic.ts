import { MAP } from "../../config/map";
import { ZONES1 } from "../../config/zones1";
import { CAMP1 } from "../../config/camp1";
import { inZones } from "../../world/zones/buildZones";
import { mulberry32 } from "../../world/geo/rng";

/** World bounds of the map (metres) + the static parchment layer drawn once per run. */
export interface MapBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export function mapBounds(): MapBounds {
  let minX = -CAMP1.boundRadius;
  let maxX = CAMP1.boundRadius;
  let minZ = -CAMP1.boundRadius;
  let maxZ = CAMP1.boundRadius;
  for (const z of ZONES1) {
    for (const r of [z.rect, z.corridor, z.exit]) {
      minX = Math.min(minX, r.minX);
      maxX = Math.max(maxX, r.maxX);
      minZ = Math.min(minZ, r.minZ);
      maxZ = Math.max(maxZ, r.maxZ);
    }
    minX = Math.min(minX, z.base.x - z.base.r);
    maxX = Math.max(maxX, z.base.x + z.base.r);
    minZ = Math.min(minZ, z.base.z - z.base.r);
    maxZ = Math.max(maxZ, z.base.z + z.base.r);
  }
  return { minX: minX - MAP.pad, minZ: minZ - MAP.pad, maxX: maxX + MAP.pad, maxZ: maxZ + MAP.pad };
}

const walkable = (x: number, z: number, m: number) => inZones(x, z, m) || Math.hypot(x, z) < CAMP1.boundRadius + m;

/** Slightly wobbly ink outline for a rectangle (hand-drawn look). */
function roughRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: () => number) {
  const j = () => (rng() - 0.5) * 2.2;
  ctx.beginPath();
  ctx.moveTo(x + j(), y + j());
  ctx.lineTo(x + w + j(), y + j());
  ctx.lineTo(x + w + j(), y + h + j());
  ctx.lineTo(x + j(), y + h + j());
  ctx.closePath();
}

/**
 * Parchment, jungle canopy blobs, paths, clearings and labels at MAP.pxPerM.
 * Zone interiors are left for the live grass layers.
 */
export function drawStaticMap(b: MapBounds): HTMLCanvasElement {
  const k = MAP.pxPerM;
  const C = MAP.colors;
  const W = Math.ceil((b.maxX - b.minX) * k);
  const H = Math.ceil((b.maxZ - b.minZ) * k);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(2718);
  const px = (x: number) => (x - b.minX) * k;
  const pz = (z: number) => (z - b.minZ) * k;

  // Paper with speckles and burnt edges.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.paperDark;
  for (let i = 0; i < (W * H) / 90; i++) {
    ctx.globalAlpha = 0.15 + rng() * 0.25;
    ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 1 + rng() * 2);
  }
  ctx.globalAlpha = 1;

  // Jungle canopy: dense blobs near the paths, sparse doodle trees further out.
  for (let z = b.minZ; z < b.maxZ; z += 3.2) {
    for (let x = b.minX; x < b.maxX; x += 3.2) {
      const jx = x + (rng() - 0.5) * 2.6;
      const jz = z + (rng() - 0.5) * 2.6;
      if (walkable(jx, jz, 1.2)) continue;
      const dense = walkable(jx, jz, 16);
      if (!dense && rng() > 0.18) continue;
      const r = (dense ? 1.9 + rng() * 1.5 : 1.2 + rng()) * k;
      ctx.fillStyle = C.jungle;
      ctx.globalAlpha = dense ? 0.9 : 0.55;
      ctx.beginPath();
      ctx.arc(px(jx), pz(jz), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.jungleLight;
      ctx.beginPath();
      ctx.arc(px(jx) - r * 0.3, pz(jz) - r * 0.3, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Paths and clearings, inked.
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  for (const zn of ZONES1) {
    for (const r of [zn.corridor, zn.exit]) {
      ctx.fillStyle = C.path;
      roughRect(ctx, px(r.minX), pz(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k, rng);
      ctx.fill();
    }
  }
  const circle = (x: number, z: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(px(x), pz(z), r * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  circle(0, 0, CAMP1.boundRadius, C.sand);
  for (const zn of ZONES1) circle(zn.base.x, zn.base.z, zn.base.r, C.sand);
  for (const zn of ZONES1) {
    const r = zn.rect;
    ctx.fillStyle = C.dirt;
    roughRect(ctx, px(r.minX), pz(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k, rng);
    ctx.fill();
    ctx.stroke();
  }
  // Dashed trail through the camps (the route), drawn under the labels.
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(74,47,22,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(0), pz(0));
  for (const zn of ZONES1) {
    ctx.lineTo(px((zn.rect.minX + zn.rect.maxX) / 2), pz((zn.rect.minZ + zn.rect.maxZ) / 2));
    ctx.lineTo(px(zn.base.x), pz(zn.base.z));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const label = (text: string, x: number, z: number, size: number) => {
    ctx.font = `${size}px 'Special Elite', monospace`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.paper;
    ctx.strokeText(text, px(x), pz(z));
    ctx.fillStyle = C.ink;
    ctx.fillText(text, px(x), pz(z));
  };
  label("LANDING SITE", 0, CAMP1.boundRadius + 4, 16);
  for (const zn of ZONES1) {
    label(zn.name.toUpperCase(), (zn.rect.minX + zn.rect.maxX) / 2, zn.rect.minZ - 3.5, 15);
    label(zn.base.name, zn.base.x, zn.base.z + zn.base.r + 3.5, 13);
  }

  // Burnt edge vignette.
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, "rgba(120,80,30,0)");
  g.addColorStop(1, "rgba(110,70,25,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}
