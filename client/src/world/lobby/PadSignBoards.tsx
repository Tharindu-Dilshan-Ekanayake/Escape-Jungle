import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SRGBColorSpace,
} from "three";
import { CHAPTERS, LOBBY_LAYOUT, chapterPlayable, chapterUnlocked } from "@shared";
import { useLobbyStore, type PadView } from "../../store/lobbyStore";
import { PAD_SIGN, padSignSpot } from "./padSigns";

const CELL_W = 512;
const CELL_H = 256;
const COLS = 2;
const N = LOBBY_LAYOUT.pads.length;
const ATLAS_W = CELL_W * COLS;
const ATLAS_H = CELL_H * Math.ceil(N / COLS);

interface SignState {
  title: string;
  status: "OPEN" | "BOARDING" | "STARTING" | "FULL" | "SOLO" | "LOCKED" | "SOON";
  count: number;
  max: number;
  countdown: number;
  chapter: number;
}

const STATUS_COLOR: Record<SignState["status"], string> = {
  OPEN: "#ffffff",
  BOARDING: "#4cc12e",
  STARTING: "#f2c230",
  FULL: "#e8503a",
  SOLO: "#4cc3f0",
  LOCKED: "#6b5a44",
  SOON: "#8a7a64",
};
const GLOW_COLOR: Record<SignState["status"], Color> = {
  OPEN: new Color("#d6ff4a"),
  BOARDING: new Color("#5fe03a"),
  STARTING: new Color("#ffd23f"),
  FULL: new Color("#ff5a3a"),
  SOLO: new Color("#7fd8ff"),
  LOCKED: new Color("#000000"),
  SOON: new Color("#000000"),
};

function stateOf(pad: PadView | undefined, size: number, chapter: number, myBest: number, online: boolean, nameOf: (id: string) => string): SignState {
  const count = pad?.members.length ?? 0;
  const max = pad?.maxPlayers ?? size;
  // Maps not built yet, or not unlocked by me (offline: only the first map).
  if (!chapterPlayable(chapter)) return { title: "Coming soon", status: "SOON", count: 0, max, countdown: -1, chapter };
  if (online ? !chapterUnlocked(chapter, myBest) : chapter !== 1) return { title: `Escape map ${chapter - 1} first`, status: "LOCKED", count, max, countdown: -1, chapter };
  // A solo pad is never taken: everyone standing on it counts down and leaves on their own.
  if (!online || max === 1) return { title: "Solo expedition", status: "SOLO", count: 0, max: 1, countdown: -1, chapter };
  const countdown = pad?.countdown ?? -1;
  const host = pad?.host ? nameOf(pad.host) : "";
  const title = count > 0 && host ? host : max === 1 ? "Solo expedition" : `${max}-player crew`;
  const status = countdown >= 0 ? "STARTING" : count >= max ? "FULL" : count > 0 ? "BOARDING" : "OPEN";
  return { title, status, count, max, countdown, chapter };
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, text: string, ink: string) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(58,36,18,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `bold ${Math.round(h * 0.56)}px 'Fredoka', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
}

/** One sign face: wood grain, frame, title, status pill, players + chapter pills. */
function drawSign(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: SignState) {
  const g = ctx.createLinearGradient(0, cy, 0, cy + CELL_H);
  g.addColorStop(0, "#c88a50");
  g.addColorStop(1, "#9a6232");
  ctx.fillStyle = g;
  ctx.fillRect(cx, cy, CELL_W, CELL_H);
  ctx.strokeStyle = "rgba(60,30,10,0.18)";
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + (CELL_H * i) / 6 + Math.sin(i * 1.7) * 4);
    ctx.lineTo(cx + CELL_W, cy + (CELL_H * i) / 6 - Math.sin(i * 2.3) * 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "#5a3418";
  ctx.lineWidth = 12;
  ctx.strokeRect(cx + 6, cy + 6, CELL_W - 12, CELL_H - 12);
  for (const [nx, ny] of [[22, 22], [CELL_W - 22, 22], [22, CELL_H - 22], [CELL_W - 22, CELL_H - 22]]) {
    ctx.fillStyle = "#3a2412";
    ctx.beginPath();
    ctx.arc(cx + nx, cy + ny, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Title (auto-fit).
  let px = 52;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fit = () => (ctx.font = `bold ${px}px 'Fredoka', sans-serif`);
  fit();
  while (ctx.measureText(s.title).width > CELL_W - 70 && px > 22) {
    px--;
    fit();
  }
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(58,36,18,0.85)";
  ctx.strokeText(s.title, cx + CELL_W / 2, cy + 68);
  ctx.fillStyle = "#fff4d6";
  ctx.fillText(s.title, cx + CELL_W / 2, cy + 68);
  // Status pill.
  const statusText = s.status === "STARTING" ? `STARTING ${Math.max(0, s.countdown)}` : s.status === "LOCKED" ? "🔒 LOCKED" : s.status === "SOON" ? "🚧 SOON" : s.status;
  pill(ctx, cx + CELL_W / 2 - 105, cy + 112, 210, 46, STATUS_COLOR[s.status], statusText, s.status === "OPEN" ? "#3a2412" : "#ffffff");
  // Players + chapter pills.
  pill(ctx, cx + 70, cy + 176, 160, 48, "#fff4d6", `👥 ${s.count}/${s.max}`, "#5a3a7a");
  const map = CHAPTERS.find((c) => c.n === s.chapter)?.name.replace(/^The /, "") ?? `Ch ${s.chapter}`;
  pill(ctx, cx + CELL_W - 250, cy + 176, 200, 48, "#4cc12e", `🗺 ${map}`, "#ffffff");
}

/** Glow column geometry: four open side walls, bright at the bottom, fading out at the top (vertex alpha). */
function columnGeometry() {
  const s = 0.5;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const corners = [
    [-s, -s],
    [s, -s],
    [s, s],
    [-s, s],
  ];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[(k + 1) % 4];
    const o = pos.length / 3;
    pos.push(ax, 0, az, bx, 0, bz, bx, 1, bz, ax, 1, az);
    col.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 4));
  g.setIndex(idx);
  return g;
}

const dummy = new Object3D();
const tint = new Color();

/**
 * Live signboards over the expedition pads (one canvas atlas, one mesh, one
 * draw call; redrawn only when a pad changes) and soft glow columns rising
 * from each pad, coloured by its state (one instanced draw call).
 */
export function PadSigns() {
  const pads = useLobbyStore((s) => s.pads);
  const status = useLobbyStore((s) => s.status);
  const players = useLobbyStore((s) => s.players);
  const me = useLobbyStore((s) => s.me);

  const r = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_W;
    canvas.height = ATLAS_H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    // Sign faces: one quad per pad, uv into its atlas cell.
    const pos = new Float32Array(N * 12);
    const uv = new Float32Array(N * 8);
    const idx: number[] = [];
    const { w, h } = PAD_SIGN;
    for (let i = 0; i < N; i++) {
      const sp = padSignSpot(i);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const u0 = (col * CELL_W) / ATLAS_W;
      const u1 = ((col + 1) * CELL_W) / ATLAS_W;
      const v1 = 1 - (row * CELL_H) / ATLAS_H;
      const v0 = 1 - ((row + 1) * CELL_H) / ATLAS_H;
      const z = sp.z + 0.005;
      pos.set([sp.x - w / 2, sp.y - h / 2, z, sp.x + w / 2, sp.y - h / 2, z, sp.x + w / 2, sp.y + h / 2, z, sp.x - w / 2, sp.y + h / 2, z], i * 12);
      uv.set([u0, v0, u1, v0, u1, v1, u0, v1], i * 8);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("uv", new BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const faceMat = new MeshBasicMaterial({ map: texture, toneMapped: false });
    const faces = new Mesh(geo, faceMat);
    // Glow columns.
    const colGeo = columnGeometry();
    const colMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, blending: AdditiveBlending, side: 2, toneMapped: false });
    const columns = new InstancedMesh(colGeo, colMat, N);
    const size = LOBBY_LAYOUT.padSize - 0.2;
    LOBBY_LAYOUT.pads.forEach((p, i) => {
      dummy.position.set(p.x, 0.1, p.z);
      dummy.scale.set(size, 1.8, size);
      dummy.updateMatrix();
      columns.setMatrixAt(i, dummy.matrix);
      columns.setColorAt(i, GLOW_COLOR.OPEN);
    });
    return { canvas, texture, geo, faceMat, faces, colGeo, colMat, columns, states: [] as SignState[] };
  }, []);

  useEffect(
    () => () => {
      r.texture.dispose();
      r.geo.dispose();
      r.faceMat.dispose();
      r.colGeo.dispose();
      r.colMat.dispose();
    },
    [r],
  );

  // Redraw the signs whenever the pads change (and once the web font is ready).
  useEffect(() => {
    const online = status === "online";
    const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Explorer";
    const draw = () => {
      const ctx = r.canvas.getContext("2d")!;
      const myBest = players.find((pl) => pl.id === me)?.best ?? 0;
      r.states = LOBBY_LAYOUT.pads.map((spot, i) => stateOf(pads[i], spot.size, spot.chapter, myBest, online, nameOf));
      r.states.forEach((st, i) => drawSign(ctx, (i % COLS) * CELL_W, Math.floor(i / COLS) * CELL_H, st));
      r.texture.needsUpdate = true;
      r.states.forEach((st, i) => r.columns.setColorAt(i, GLOW_COLOR[st.status]));
      if (r.columns.instanceColor) r.columns.instanceColor.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [r, pads, status, players]);

  // Columns breathe; a pad that is counting down pulses fast.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const starting = r.states.some((s) => s.status === "STARTING");
    r.colMat.opacity = starting ? 0.2 + Math.sin(t * 7) * 0.08 : 0.13 + Math.sin(t * 1.6) * 0.03;
    void tint;
  });

  return (
    <>
      <primitive object={r.faces} />
      <primitive object={r.columns} />
    </>
  );
}
