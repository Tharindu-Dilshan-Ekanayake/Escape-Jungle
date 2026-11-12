import { MAP } from "../../config/map";
import { CELL_SIZE } from "../../config/grass";
import { RARITY_COLOR, TREASURES } from "../../config/loot";
import { CAMPFIRE } from "../../config/night";
import { ZONES1 } from "../../config/zones1";
import { activeZones } from "../../game/cutting/cutState";
import { GRINDERS } from "../../game/economy/StationSystem";
import { player } from "../../game/player/FirstPersonController";
import { loot } from "../../game/loot/loot";
import { campfires, isLit, logsIn } from "../../game/campfire/campfires";
import { progress } from "../../game/progress/progress";
import { currentGoal } from "../../game/progress/goal";
import { drawStaticMap, mapBounds, type MapBounds } from "./mapStatic";
import { drawSurvivalMarkers } from "./survivalMarkers";

/** Linear world -> screen mapping: sx = ox + x * f, sy = oy + z * f (CSS px). */
export interface MapView {
  ox: number;
  oy: number;
  f: number;
  /** Minimap (smaller icons, no text). */
  mini: boolean;
}

interface ZoneLayer {
  canvas: HTMLCanvasElement;
  img: ImageData;
  cleared: number;
}

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** The run's map: static parchment + one live layer per zone (cut cells turn to dirt) + markers. */
export class JungleMap {
  readonly bounds: MapBounds;
  private staticCanvas: HTMLCanvasElement;
  private layers: ZoneLayer[];
  readonly source: unknown;

  constructor() {
    this.source = activeZones.list;
    this.bounds = mapBounds();
    this.staticCanvas = drawStaticMap(this.bounds);
    this.layers = activeZones.list.map(({ field }) => {
      const canvas = document.createElement("canvas");
      canvas.width = field.cols;
      canvas.height = field.rows;
      return { canvas, img: canvas.getContext("2d")!.createImageData(field.cols, field.rows), cleared: -1 };
    });
    // Redraw the labels once the typewriter font has loaded.
    document.fonts?.load("16px 'Special Elite'").then(() => {
      this.staticCanvas = drawStaticMap(this.bounds);
    });
  }

  /** Refresh zone layers whose cut count changed. */
  update() {
    activeZones.list.forEach(({ field }, i) => {
      const L = this.layers[i];
      if (!L || L.cleared === field.cleared) return;
      L.cleared = field.cleared;
      const plant = hex(MAP.plantColors[field.plantId] ?? "#9be22d");
      const dirt = hex(MAP.colors.dirt);
      const d = L.img.data;
      for (let c = 0; c < field.count; c++) {
        const o = c * 4;
        if (!field.type[c]) {
          d[o + 3] = 0;
          continue;
        }
        const alive = field.isAlive(c);
        const src = alive ? plant : dirt;
        const j = ((c * 2654435761) >>> 0) % 21 - 10; // stable per-cell shade
        d[o] = src[0] + j;
        d[o + 1] = src[1] + j;
        d[o + 2] = src[2] + j * 0.5;
        d[o + 3] = 255;
      }
      L.canvas.getContext("2d")!.putImageData(L.img, 0, 0);
    });
  }

  get worldW() {
    return this.bounds.maxX - this.bounds.minX;
  }
  get worldH() {
    return this.bounds.maxZ - this.bounds.minZ;
  }

  /** Draw the map + markers with the given view into ctx (already sized; dpr applied here). */
  draw(ctx: CanvasRenderingContext2D, v: MapView, dpr: number, time: number) {
    const b = this.bounds;
    const k = MAP.pxPerM;
    const s = v.f / k;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (v.ox + b.minX * v.f), dpr * (v.oy + b.minZ * v.f));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.staticCanvas, 0, 0);
    ctx.imageSmoothingEnabled = false;
    activeZones.list.forEach(({ field }, i) => {
      const L = this.layers[i];
      if (!L) return;
      ctx.drawImage(L.canvas, (field.minX - b.minX) * k, (field.minZ - b.minZ) * k, field.cols * CELL_SIZE * k, field.rows * CELL_SIZE * k);
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawMarkers(ctx, v, time);
  }

  private drawMarkers(ctx: CanvasRenderingContext2D, v: MapView, time: number) {
    const C = MAP.colors;
    const X = (x: number) => v.ox + x * v.f;
    const Y = (z: number) => v.oy + z * v.f;
    const u = v.mini ? 0.8 : 1.15; // icon scale
    ctx.lineJoin = "round";

    // Gates.
    ZONES1.forEach((zn, i) => {
      const open = progress.open[i];
      const hw = (zn.gate.width / 2) * v.f;
      const cx = X(zn.gate.x);
      const cy = Y(zn.gate.z);
      const c = Math.cos(zn.gate.rotY);
      const sn = Math.sin(zn.gate.rotY);
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 7 * u;
      ctx.beginPath();
      ctx.moveTo(cx - c * hw, cy + sn * hw);
      ctx.lineTo(cx + c * hw, cy - sn * hw);
      ctx.stroke();
      ctx.strokeStyle = open ? C.gateOpen : C.gateLocked;
      ctx.lineWidth = 4 * u;
      ctx.stroke();
    });

    // Grinders.
    for (const g of GRINDERS) {
      const x = X(g.x);
      const y = Y(g.z);
      ctx.fillStyle = "#3f8f4f";
      ctx.strokeStyle = "#1a3a1f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 7 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${10 * u}px Fredoka, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", x, y + 0.5);
    }

    // Campfires.
    for (const f of campfires.fires) {
      const x = X(f.x);
      const y = Y(f.z);
      const lit = isLit(f);
      if (lit) {
        const glow = ctx.createRadialGradient(x, y, 1, x, y, 16 * u);
        glow.addColorStop(0, "rgba(255,170,60,0.9)");
        glow.addColorStop(1, "rgba(255,120,30,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 16 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = lit ? C.fire : "#8a817a";
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 8 * u);
      ctx.quadraticCurveTo(x + 6 * u, y - 1 * u, x + 3.5 * u, y + 4 * u);
      ctx.lineTo(x - 3.5 * u, y + 4 * u);
      ctx.quadraticCurveTo(x - 6 * u, y - 1 * u, x, y - 8 * u);
      ctx.fill();
      ctx.stroke();
      if (!v.mini) {
        ctx.font = `12px 'Special Elite', monospace`;
        ctx.fillStyle = C.ink;
        ctx.fillText(lit ? `${Math.ceil(f.burn)}s` : `${logsIn(f)}/${CAMPFIRE.woodToLight}`, x, y + 13);
      }
    }

    // Rescue helicopter pad.
    const pad = ZONES1[ZONES1.length - 1].base;
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(pad.x), Y(pad.z), 9 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a1a0a";
    ctx.font = `bold ${12 * u}px Fredoka, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", X(pad.x), Y(pad.z) + 0.5);

    drawSurvivalMarkers(ctx, X, Y, u, v.mini, performance.now() / 1000);

    // Uncovered loot: firewood logs and treasure stars.
    for (const it of loot.items) {
      if (it.collected || !it.revealedAt) continue;
      const x = X(it.x);
      const y = Y(it.z);
      if (it.kind === "wood") {
        if (loot.carried >= CAMPFIRE.carryMax) continue;
        ctx.fillStyle = "#6b4423";
        ctx.fillRect(x - 4 * u, y - 1.5 * u, 8 * u, 3 * u);
        continue;
      }
      const pulse = 1 + Math.sin(time * 4 + it.x) * 0.15;
      star(ctx, x, y, 6 * u * pulse, RARITY_COLOR[TREASURES[it.kind].rarity]);
    }

    // Goal: dashed route + pulsing ring.
    const goal = currentGoal();
    const gx = X(goal.x);
    const gy = Y(goal.z);
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -time * 20;
    ctx.strokeStyle = "rgba(255,210,63,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(player.x), Y(player.z));
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    const ring = (9 + ((time * 1.5) % 1) * 9) * u;
    ctx.strokeStyle = C.goal;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - ((time * 1.5) % 1);
    ctx.beginPath();
    ctx.arc(gx, gy, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Player arrow (north-up map, turns with the camera).
    ctx.save();
    ctx.translate(X(player.x), Y(player.z));
    ctx.rotate(-player.yaw);
    ctx.fillStyle = C.player;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10 * u);
    ctx.lineTo(7 * u, 7 * u);
    ctx.lineTo(0, 3.5 * u);
    ctx.lineTo(-7 * u, 7 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#2a1a0a";
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

let cached: JungleMap | null = null;

/** The current run's map (rebuilt when a new run's zones are active), or null outside a run. */
export function getJungleMap(): JungleMap | null {
  if (!activeZones.list.length) return null;
  if (!cached || cached.source !== activeZones.list) cached = new JungleMap();
  return cached;
}
