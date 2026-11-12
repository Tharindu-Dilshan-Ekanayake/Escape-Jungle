import { CAMP1 } from "../../config/camp1";
import { GATES, ZONES1, type ZoneDef } from "../../config/zones1";
import { CHUNK_SIZE } from "../../config/world";
import { FINAL_WRECK } from "../../config/cutscene";
import { PartBuilder, type ChunkGeometry } from "../geo/PartBuilder";
import { mulberry32 } from "../geo/rng";
import { toWorld, type Collider, type LocalCollider, type Region } from "../../game/player/collision";
import { addCamp1 } from "../camp1/buildCamp1";
import { addZoneScenery, createZoneFields, inZones } from "../zones/buildZones";
import type { GrassField } from "../../grass/GrassField";
import { CAMPFIRE } from "../../config/night";
import { campfireSpots } from "../../game/campfire/campfires";
import { firePit } from "../props/firePit";
import { campLayouts, forageClearings, forageLayout, type CampLayout, type ForageLayout } from "../zones/baseLayout";
import { berryBush, foodStore, spring, tent, waterBarrel } from "../props/baseProps";
import { addCampDecor } from "../zones/campDecor";
import type { BannerSpec } from "../banners/banners";
import { PROP_SIGNS } from "../props/propSigns";
import { addBasePaths } from "../zones/basePaths";
import { addZoneRuins, ruinSpots } from "../zones/ruins";
import { addMistyForest } from "../zones/mistyForest";
import { MISTY } from "../../config/mistyForest";
import { AMAZON } from "../../config/amazon";
import { scatterAmazon } from "../props/amazonScatter";
import { addCrashCamp } from "../camp1/crashCamp";
import { FIREWOOD } from "../../config/firewood";
import { BASE_PATH } from "../../config/zonesDecor";
import { toolBoard } from "../props/campProps";
import { BALANCE } from "../../config/balance";
import { allGrinders } from "../zones/stations";
import { chapterData } from "../../config/chapters";

export interface Chapter1Build {
  solid: ChunkGeometry[];
  glow: ChunkGeometry[];
  colliders: Collider[];
  region: Region;
  /** One grass field per themed zone. */
  zones: { zone: ZoneDef; field: GrassField }[];
  /** One collider per zone gate (switched off when the gate opens). */
  gateColliders: Collider[];
  fireflies: Float32Array;
  labels: { text: string; pos: [number, number, number]; key?: string }[];
  /** Names printed on signs and banners (one draw call). */
  banners: BannerSpec[];
  /** Survival props per camp and the forage spots (food + water). */
  camps: CampLayout[];
  forage: ForageLayout;
  /** Cells and build time, for the F3 overlay. */
  stats: string;
  dispose: () => void;
}

/** A prop-local collider grown with its prop (scaled survival props). */
function scaleCollider(c: LocalCollider, k: number): LocalCollider {
  if (k === 1) return c;
  const h = c.h === undefined ? undefined : c.h * k;
  return c.kind === "circle" ? { ...c, x: c.x * k, z: c.z * k, r: c.r * k, h } : { ...c, x: c.x * k, z: c.z * k, hx: c.hx * k, hz: c.hz * k, h };
}

/** Builds the crash-site camp + six themed zones into merged chunk geometry + grass grids. */
export function buildChapter1(): Chapter1Build {
  const t0 = performance.now();
  const b = new PartBuilder(CHUNK_SIZE, mulberry32(CAMP1.seed));
  const colliders: Collider[] = [];

  const fires = campfireSpots();
  const camps = campLayouts();
  const busy = [...fires, ...camps.flatMap((c) => [c.store, c.water, c.tent]), ...FIREWOOD.spots.map(([x, z]) => ({ x, z }))];
  const nearFire = (x: number, z: number) => busy.some((f) => Math.hypot(x - f.x, z - f.z) < 3.2);
  const trail = BASE_PATH.campClear;
  const onTrail = (x: number, z: number) => Math.abs(x - BASE_PATH.campStart.x) < trail.halfWidth && z < trail.fromZ;
  const camp = addCamp1(b, colliders, (x, z) => inZones(x, z, 1.5) || nearFire(x, z) || onTrail(x, z));
  // Survival props in every camp: food store, water barrel, tent.
  for (const c of camps) {
    for (const [make, s] of [[foodStore, c.store], [waterBarrel, c.water], [tent, c.tent]] as const) {
      for (const col of make(b, s)) colliders.push(toWorld(scaleCollider(col, s.scale ?? 1), s.x, s.z, s.rotY));
    }
  }
  // Campfire pits (logs + flames are dynamic, see CampfireSystem).
  for (const f of fires) {
    firePit(b, f.x, f.z);
    colliders.push({ kind: "circle", x: f.x, z: f.z, r: CAMPFIRE.collider });
  }
  const banners = addCampDecor(b, colliders, camps, fires);
  banners.push(...addCrashCamp(b, colliders));
  // Amazon plants and creepy finds round the Landing Site edge.
  const campBusy = (x: number, z: number) =>
    onTrail(x, z) || nearFire(x, z) || CAMP1.props.some((p) => Math.hypot(p.x - x, p.z - z) < 3.5) || FIREWOOD.spots.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 2.5);
  scatterAmazon(b, colliders, () => {
    for (let t = 0; t < 30; t++) {
      const a = b.rand(0, Math.PI * 2);
      const d = b.rand(AMAZON.campRing[0], AMAZON.campRing[1]);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (!campBusy(x, z) && !inZones(x, z, 2)) return { x, z };
    }
    return null;
  }, AMAZON.camp);
  // The misty teal forest: tall dark trunks, lianas, boulders, ferns (Landing Site + Meadow).
  const ruinsNear = ruinSpots();
  addMistyForest(
    b,
    colliders,
    () => {
      for (let t = 0; t < 30; t++) {
        const a = b.rand(0, Math.PI * 2);
        const d = b.rand(MISTY.trunks.campR[0], MISTY.trunks.campR[1]);
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (!campBusy(x, z) && !inZones(x, z, 2)) return { x, z };
      }
      return null;
    },
    (x, z) => Math.hypot(x, z) < CAMP1.boundRadius + 1 || inZones(x, z, 0.5),
    (x, z) => inZones(x, z, 1.5) || ruinsNear.some((rs) => Math.hypot(rs.x - x, rs.z - z) < 7),
  );
  // Firewood tree trunks (the stump stays solid after felling; trees are drawn by ChopSystem).
  for (const [x, z] of FIREWOOD.spots) colliders.push({ kind: "circle", x, z, r: FIREWOOD.trunkR });
  // Crash-site props: their name on a wooden sign standing on two posts above them.
  for (const p of CAMP1.props) {
    const rot = p.rotY ?? Math.atan2(-p.x, -p.z);
    // Printed right on the prop (its front wall, board or plaque) when it has one.
    const sign = PROP_SIGNS[p.kind];
    if (sign) {
      const lx = sign.x ?? 0;
      const shopTool = BALANCE.tools[BALANCE.shopTools[0]];
      const sub = p.kind === "toolBoard" ? `${shopTool.name} · $${shopTool.price}` : sign.sub;
      banners.push({ text: p.label, sub, x: p.x + lx * Math.cos(rot) + sign.z * Math.sin(rot), y: sign.y, z: p.z - lx * Math.sin(rot) + sign.z * Math.cos(rot), rotY: rot, w: sign.w, h: sign.h, style: sign.style });
      continue;
    }
    const w = Math.min(3.2, Math.max(1.6, p.label.length * 0.2 + 0.5));
    const y = p.labelY - 0.45;
    for (const s of [-1, 1]) {
      const px = p.x + Math.cos(rot) * s * (w / 2 - 0.12);
      const pz = p.z - Math.sin(rot) * s * (w / 2 - 0.12);
      b.cyl(0.05, 0.06, y, 5, { pos: [px, y / 2, pz], color: "#6b4423" });
    }
    banners.push({ text: p.label, x: p.x, y, z: p.z, rotY: rot, w, h: 0.55, style: "wood", twoSided: true });
  }
  // Outpost tool shops: each board shows (and sells) a better blade than the base before.
  const ts = PROP_SIGNS.toolBoard!;
  camps.forEach((c, i) => {
    const key = BALANCE.shopTools[i];
    if (!c.shop || !key) return;
    const s = c.shop;
    b.push([s.x, 0, s.z], s.rotY);
    const cols = toolBoard(b, key);
    b.pop();
    for (const col of cols) colliders.push(toWorld(col, s.x, s.z, s.rotY));
    const t = BALANCE.tools[key];
    banners.push({ text: "TOOLS", sub: `${t.name} · $${t.price}`, x: s.x + ts.z * Math.sin(s.rotY), y: ts.y, z: s.z + ts.z * Math.cos(s.rotY), rotY: s.rotY, w: ts.w, h: ts.h, style: ts.style });
  });
  // Outpost grinders get the same printed name on their front wall.
  const gs = PROP_SIGNS.grinder!;
  for (const g of allGrinders().slice(1)) {
    banners.push({ text: "GRINDER", x: g.x + gs.z * Math.sin(g.rotY), y: gs.y, z: g.z + gs.z * Math.cos(g.rotY), rotY: g.rotY, w: gs.w, h: gs.h, style: gs.style });
  }
  const inner = addZoneScenery(b, colliders);
  addBasePaths(b, colliders);
  addZoneRuins(b);
  // Food and water to forage: berry bushes and springs (banana bunches hang on the grove's palms).
  const forage = forageLayout(inner);
  for (const p of forage.berryBushes) {
    berryBush(b, p.x, p.z);
    colliders.push({ kind: "circle", x: p.x, z: p.z, r: 0.55, h: 0.95 });
  }
  for (const p of forage.springs) spring(b, p.x, p.z);
  // The plane wreck at stage 7 (pieces placed by the intro).
  if (chapterData().intro) for (const c of FINAL_WRECK.colliders) colliders.push({ kind: "circle", ...c });
  // Gates close each zone's exit path until the zone is cleared.
  const gateColliders = ZONES1.map((zn) =>
    toWorld({ kind: "box", x: 0, z: 0, hx: zn.gate.width / 2 + 0.3, hz: GATES.thickness }, zn.gate.x, zn.gate.z, zn.gate.rotY),
  );
  colliders.push(...gateColliders);

  const { solid, glow } = b.build();
  const t1 = performance.now();
  const zones = createZoneFields(inner, [...forageClearings(forage), ...FIREWOOD.spots.map(([x, z]) => ({ x, z, r: FIREWOOD.grassClear }))]);
  const t2 = performance.now();

  const cells = zones.reduce((n, z) => n + z.field.totalCuttable, 0);
  const chunks = zones.reduce((n, z) => n + z.field.chunks.length, 0);
  const stats = `${zones.length} zones · ${cells.toLocaleString()} cells · ${chunks} chunks · build ${(t1 - t0).toFixed(0)}+${(t2 - t1).toFixed(0)} ms`;
  if (import.meta.env.DEV) console.info(`[chapter1] ${stats}`);

  return {
    solid,
    glow,
    colliders,
    region: {
      circles: [{ x: 0, z: 0, r: CAMP1.boundRadius }, ...ZONES1.map((z) => z.base)],
      rects: ZONES1.flatMap((z) => [z.rect, z.corridor, z.exit]),
    },
    zones,
    gateColliders,
    fireflies: camp.fireflies,
    // Floating text only where there is no camp to hang a banner on: the rescue point.
    labels: [{ text: ZONES1[ZONES1.length - 1].base.name.toUpperCase(), pos: [ZONES1[ZONES1.length - 1].base.x, 5.2, ZONES1[ZONES1.length - 1].base.z] as [number, number, number] }],
    banners,
    camps,
    forage,
    stats,
    dispose: () => {
      for (const c of solid) c.geometry.dispose();
      for (const c of glow) c.geometry.dispose();
    },
  };
}
