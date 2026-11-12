import { LOBBY_LAYOUT } from "@shared";
import { LOBBY_VIEW as L } from "../../config/lobby";
import { CHUNK_SIZE } from "../../config/world";
import { PartBuilder, type ChunkGeometry } from "../geo/PartBuilder";
import { mulberry32 } from "../geo/rng";
import { toWorld, type Collider, type LocalCollider, type Region } from "../../game/player/collision";
import { bush, tree } from "../props/nature";
import { addLobbyDecor, BIG_SIGN } from "./lobbyDecor";
import type { BannerSpec } from "../banners/banners";
import { bench, board, fence, flowerBed, lamp, parkTree, planter } from "./lobbyProps";
import { boardwalk, expeditionPad, padSignFrame } from "./padSigns";
import { addMushroomStems, addWaterfall } from "./waterfall";

export interface LobbyBuild {
  solid: ChunkGeometry[];
  glow: ChunkGeometry[];
  colliders: Collider[];
  region: Region;
  labels: { key: string; text: string; sub?: string; pos: [number, number, number] }[];
  /** Names printed on boards and signs (one draw call). */
  banners: BannerSpec[];
  dispose: () => void;
}

/** Builds the lobby hub into merged chunk geometry (same pipeline as the jungle). */
export function buildLobby(): LobbyBuild {
  const b = new PartBuilder(CHUNK_SIZE, mulberry32(L.seed));
  const colliders: Collider[] = [];
  const labels: LobbyBuild["labels"] = [];
  const banners: BannerSpec[] = [];
  /** Local (lx, lz) of a prop at (px, pz) turned by rotY -> world. */
  const at = (px: number, pz: number, rot: number, lx: number, lz: number) => ({ x: px + lx * Math.cos(rot) + lz * Math.sin(rot), z: pz - lx * Math.sin(rot) + lz * Math.cos(rot) });
  const bounds = LOBBY_LAYOUT.bounds;

  const place = (x: number, z: number, rotY: number, make: (b: PartBuilder) => LocalCollider[]) => {
    b.push([x, 0, z], rotY);
    const local = make(b);
    b.pop();
    for (const c of local) colliders.push(toWorld(c, x, z, rotY));
  };

  // Ground: lawn slab, grout slab under the plaza, then inset 2 m paving tiles.
  b.box([130, 0.2, 130], { pos: [0, -0.1, 0], color: L.lawnDark, top: L.lawn });
  const pw = bounds.maxX - bounds.minX;
  const pd = bounds.maxZ - bounds.minZ;
  b.box([pw + 1.2, 0.04, pd + 1.2], { pos: [(bounds.minX + bounds.maxX) / 2, -0.005, (bounds.minZ + bounds.maxZ) / 2], color: L.grout });
  const ts = L.tileSize;
  for (let x = bounds.minX; x < bounds.maxX; x += ts)
    for (let z = bounds.minZ; z < bounds.maxZ; z += ts) {
      const cx = x + ts / 2;
      const cz = z + ts / 2;
      const tone = L.tileColors[Math.floor(b.rand(0, L.tileColors.length))];
      b.box([ts - L.tileGap, 0.05, ts - L.tileGap], { pos: [cx, 0.01, cz], color: tone, jitter: 0.05 });
    }

  // Waterfall cliff behind the pads and the bouncy mushrooms.
  addWaterfall(b, colliders);
  addMushroomStems(b, colliders);

  // Park trees, benches facing the fountain, flower beds.
  for (const [x, z] of L.parkTrees) place(x, z, b.rand(0, 6), parkTree);
  for (const [x, z] of L.benches) place(x, z, Math.atan2(L.centre.x - x, L.centre.z - z), bench);
  for (const [x, z, len, rot] of L.flowerBeds) place(x, z, rot, (bb) => flowerBed(bb, len));

  // Expedition pads (positions shared with the server): a wooden boardwalk under each row,
  // each pad a worn plank square with a glowing outline and a live signboard behind it.
  const xs = LOBBY_LAYOUT.pads.map((p) => p.x);
  const firstX = Math.min(...xs) - LOBBY_LAYOUT.padSize / 2 - 0.8;
  const lastX = Math.max(...xs) + LOBBY_LAYOUT.padSize / 2 + 0.8;
  for (const rowZ of [...new Set(LOBBY_LAYOUT.pads.map((p) => p.z))]) boardwalk(b, firstX, lastX, rowZ);
  LOBBY_LAYOUT.pads.forEach((p, i) => {
    b.push([p.x, 0, p.z]);
    expeditionPad(b, LOBBY_LAYOUT.padSize, p.size);
    b.pop();
    padSignFrame(b, colliders, i);
  });

  // Leaderboard boards along the west side, facing the plaza. (No shops here.)
  for (const bd of L.boards) {
    const rot = Math.PI / 2;
    place(bd.x, bd.z, rot, board);
    // Title printed on the board header, list area on the face.
    const head = at(bd.x, bd.z, rot, 0, 0.13);
    banners.push({ text: bd.title, x: head.x, y: 3.86, z: head.z, rotY: rot, w: 3.4, h: 0.62, style: "gold" });
    const face = at(bd.x, bd.z, rot, 0, 0.08);
    banners.push({ text: "TOP EXPLORERS", sub: "Coming soon", x: face.x, y: 2.35, z: face.z, rotY: rot, w: 3.0, h: 1.9, style: "board" });
  }
  for (const [x, z] of L.lamps) place(x, z, 0, lamp);
  for (const [x, z] of L.planters) place(x, z, 0, planter);

  // Mosaic, paths, lawn islands, string lights, welcome arch.
  addLobbyDecor(b, colliders);
  // The big expedition sign behind the pads.
  banners.push({ text: "JUNGLE EXPEDITION", sub: "Step on a glowing pad to play", x: BIG_SIGN.x, y: BIG_SIGN.y, z: BIG_SIGN.z + 0.04, rotY: 0, w: BIG_SIGN.halfW * 2, h: BIG_SIGN.h, style: "gold" });

  // Fence around the plaza.
  const m = 0.6;
  b.push([bounds.minX - m, 0, bounds.minZ - m]);
  fence(b, bounds.maxX - bounds.minX + 2 * m);
  b.pop();
  b.push([bounds.minX - m, 0, bounds.maxZ + m]);
  fence(b, bounds.maxX - bounds.minX + 2 * m);
  b.pop();
  for (const x of [bounds.minX - m, bounds.maxX + m]) {
    b.push([x, 0, bounds.maxZ + m], Math.PI / 2);
    fence(b, bounds.maxZ - bounds.minZ + 2 * m);
    b.pop();
  }

  // Hedge of bushes just outside the fence.
  const h = L.hedge;
  for (let x = bounds.minX; x <= bounds.maxX; x += h.spacing) {
    bush(b, x, bounds.maxZ + h.offset, b.rand(0.9, 1.3));
  }
  for (let z = bounds.minZ; z <= bounds.maxZ; z += h.spacing) {
    bush(b, bounds.minX - h.offset, z, b.rand(0.9, 1.3));
    bush(b, bounds.maxX + h.offset, z, b.rand(0.9, 1.3));
  }

  // Trees and bushes on the lawn around the plaza.
  const outside = (x: number, z: number, pad: number) =>
    x < bounds.minX - pad || x > bounds.maxX + pad || z < bounds.minZ - pad || z > bounds.maxZ + pad;
  const ring = (minR: number, maxR: number) => {
    const r = Math.sqrt(b.rand(minR * minR, maxR * maxR));
    const a = b.rand(0, Math.PI * 2);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  };
  for (let i = 0; i < L.trees.count; i++) {
    const p = ring(L.trees.minR, L.trees.maxR);
    const behindFall = p.z < bounds.minZ && Math.abs(p.x - L.waterfall.x) < L.waterfall.cliffWidth / 2 + 4;
    if (outside(p.x, p.z, 4) && !behindFall) tree(b, p.x, p.z, b.rand(8, 12), b.rand(0.4, 0.7));
  }
  for (let i = 0; i < L.bushes.count; i++) {
    const p = ring(L.bushes.minR, L.bushes.maxR);
    const behind = p.z < bounds.minZ && Math.abs(p.x - L.waterfall.x) < L.waterfall.cliffWidth / 2 + 2;
    if (outside(p.x, p.z, 2) && !behind) bush(b, p.x, p.z, b.rand(1, 2.2));
  }

  const { solid, glow } = b.build();
  return {
    solid,
    glow,
    colliders,
    region: { circles: [], rects: [bounds] },
    labels,
    banners,
    dispose: () => {
      for (const c of solid) c.geometry.dispose();
      for (const c of glow) c.geometry.dispose();
    },
  };
}
