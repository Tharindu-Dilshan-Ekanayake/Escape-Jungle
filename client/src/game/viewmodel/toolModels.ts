import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, Vector3, type BufferGeometry, type Material } from "three";
import { PartBuilder, type V3 } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import type { ToolKey } from "../economy/economy";
import { BLADE_THICKNESS, bladeGeometry, type BladeStyle } from "./bladeGeometry";
import { buildHand } from "./handModel";
import { buildToolShape } from "../../world/props/toolShapes";

/**
 * First-person tool models. The machete: a bevelled, glossy (Phong) blade with baked edge
 * shine / rust, plus a detailed flat-shaded handle (wraps, rivets, guard,
 * pommel, lanyard) and the player's hand. Grip at the origin, blade up +Y,
 * cutting edge toward -Z. Every other tool has its own shape from
 * world/props/toolShapes.ts. Built once when the stage mounts.
 */
interface HandleStyle {
  grip: string;
  gripTop: string;
  wrap: string;
  wrapAlt: string;
  guard: string;
  guardTop: string;
  rivet: string;
  pommel: string;
  lanyard?: string;
  fuller: string;
}

interface ToolLook {
  blade: BladeStyle;
  handle: HandleStyle;
  shininess: number;
  specular: string;
  /** Frayed cloth tape instead of finger grooves. */
  taped: boolean;
  /** Inner glow of magic blades. */
  emissive?: string;
}

/** The detailed first-person machete (extruded blade + rich handle). */
const MACHETE: ToolLook = {
  blade: { spine: "#5b6670", steel: "#9aa6b1", polish: "#d9e2ea", edge: "#ffffff", notches: 0 },
  handle: {
    grip: "#1d1d1f",
    gripTop: "#2c2c30",
    wrap: "#2a2a2e",
    wrapAlt: "#3a3a40",
    guard: "#b8322a",
    guardTop: "#e0483c",
    rivet: "#e2b54a",
    pommel: "#b8322a",
    lanyard: "#e0483c",
    fuller: "#6d7984",
  },
  shininess: 90,
  specular: "#ffffff",
  taped: false,
};

function handle(look: ToolLook): BufferGeometry {
  const h = look.handle;
  const b = new PartBuilder(Infinity, mulberry32(17));
  const ring = (y: number, r: number, hgt: number, color: string, tilt = 0) =>
    b.cyl(r, r, hgt, 10, { pos: [0, y, 0], rot: [tilt, 0, 0], color, scale: [0.82, 1, 1] });

  // Core grip (slightly oval), flared palm swell.
  b.cyl(0.03, 0.033, 0.3, 10, { pos: [0, 0, 0], color: h.grip, top: h.gripTop, scale: [0.82, 1, 1] });
  if (look.taped) {
    // Cloth tape wound at an angle, alternating shades, with a frayed tail.
    for (let i = 0; i < 9; i++) ring(-0.11 + i * 0.026, 0.0355, 0.02, i % 2 ? h.wrap : h.wrapAlt, 0.18);
    b.box([0.012, 0.07, 0.004], { pos: [0.02, -0.15, 0.026], rot: [0.3, 0, 0.25], color: h.wrapAlt });
    b.box([0.008, 0.05, 0.004], { pos: [0.012, -0.16, 0.03], rot: [0.5, 0, -0.2], color: h.wrap });
  } else {
    // Rubber finger grooves + textured palm swell.
    for (let i = 0; i < 4; i++) ring(-0.075 + i * 0.045, 0.0365, 0.022, h.wrapAlt);
    for (let i = 0; i < 6; i++) ring(-0.1 + i * 0.04, 0.0335, 0.006, h.wrap);
  }
  // Wooden/polymer scales show between the wraps: rivets through the grip.
  for (const y of [-0.085, 0.0, 0.085]) {
    b.cyl(0.008, 0.008, 0.07, 6, { pos: [0, y, 0], rot: [0, 0, Math.PI / 2], color: h.rivet });
  }
  // Guard: a bar with rounded ends, plus a ferrule ring.
  b.box([0.05, 0.028, 0.15], { pos: [0, 0.162, -0.006], color: h.guard, top: h.guardTop });
  for (const z of [-0.081, 0.069]) b.cyl(0.016, 0.016, 0.05, 8, { pos: [0, 0.162, z], rot: [0, 0, Math.PI / 2], color: h.guardTop });
  b.cyl(0.034, 0.031, 0.025, 10, { pos: [0, 0.14, 0], color: h.guardTop, scale: [0.82, 1, 1] });
  // Pommel cap with a lanyard hole.
  b.cyl(0.031, 0.04, 0.03, 10, { pos: [0, -0.165, 0], color: h.pommel, scale: [0.85, 1, 1] });
  b.cyl(0.026, 0.026, 0.012, 10, { pos: [0, -0.184, 0], color: h.guardTop, scale: [0.85, 1, 1] });
  if (h.lanyard) {
    const cord: V3[] = [
      [0, -0.2, 0.01],
      [0.008, -0.235, 0.028],
      [0.012, -0.27, 0.035],
      [0.01, -0.3, 0.03],
    ];
    cord.forEach((p, i) => b.box([0.008, 0.04, 0.008], { pos: p, rot: [0.35 - i * 0.12, 0, 0.1], color: h.lanyard! }));
    b.cyl(0.012, 0.009, 0.03, 6, { pos: [0.01, -0.325, 0.03], color: h.guard });
  }
  // Fuller (groove) along the blade near the spine, both faces.
  const t = BLADE_THICKNESS / 2 + 0.0008;
  for (const sx of [-1, 1]) {
    b.box([0.0016, 0.42, 0.009], { pos: [sx * t, 0.42, 0.012], color: h.fuller });
  }
  // Maker's mark near the guard.
  for (const sx of [-1, 1]) b.box([0.0016, 0.016, 0.016], { pos: [sx * t, 0.215, -0.004], rot: [0.785, 0, 0], color: h.rivet });
  return b.build().solid[0].geometry;
}

export interface ToolRig {
  /** One group per tool; show the owned one. */
  tools: Record<ToolKey, Group>;
  hand: Mesh;
  /** Per tool: the two blade points (tool-local) the swing trail follows, or null. */
  trails: Record<ToolKey, [Vector3, Vector3] | null>;
  /** Spinning parts (the grass cutter's disc), rotated about their local Y. */
  spinners: Partial<Record<ToolKey, Mesh>>;
  dispose: () => void;
}

/** Shine of each tool's metal parts in the first-person view. */
const METAL: Record<ToolKey, { shininess: number; specular: string; emissive?: string }> = {
  sickle: { shininess: 14, specular: "#3a2a20" },
  machete: { shininess: MACHETE.shininess, specular: MACHETE.specular },
  shears: { shininess: 80, specular: "#ffffff" },
  scythe: { shininess: 110, specular: "#d8fff0" },
  axe: { shininess: 120, specular: "#fff2b0", emissive: "#3a2600" },
  glaive: { shininess: 140, specular: "#ffffff", emissive: "#0e3a50" },
  grassCutter: { shininess: 70, specular: "#ffffff" },
};

const TOOL_KEYS = Object.keys(METAL) as ToolKey[];
const v3 = (p: V3) => new Vector3(p[0], p[1], p[2]);

let heldTemplates: Record<ToolKey, Group> | null = null;

/** Third-person tools for other players' avatars (built once, cloned per avatar; Lambert, shared). */
export function heldTool(key: string): Group | null {
  if (!heldTemplates) {
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const glow = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    heldTemplates = {} as Record<ToolKey, Group>;
    for (const k of TOOL_KEYS) {
      const b = new PartBuilder(Infinity, mulberry32(17));
      buildToolShape(k, { metal: b, wood: b, spin: b });
      const out = b.build();
      const g = new Group();
      if (out.solid[0]) g.add(new Mesh(out.solid[0].geometry, mat));
      if (out.glow[0]) g.add(new Mesh(out.glow[0].geometry, glow));
      heldTemplates[k] = g;
    }
  }
  const t = heldTemplates[key as ToolKey];
  return t ? t.clone() : null;
}

export function buildToolRig(): ToolRig {
  const flat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const glowMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [flat, glowMat];
  const tools = {} as Record<ToolKey, Group>;
  const trails = {} as Record<ToolKey, [Vector3, Vector3] | null>;
  const spinners: Partial<Record<ToolKey, Mesh>> = {};
  const add = (g: Group, geo: BufferGeometry | null, mat: Material) => {
    if (!geo) return null;
    geos.push(geo);
    const mesh = new Mesh(geo, mat);
    g.add(mesh);
    return mesh;
  };
  for (const key of TOOL_KEYS) {
    const look = METAL[key];
    const metal = new MeshPhongMaterial({ vertexColors: true, shininess: look.shininess, specular: look.specular, emissive: look.emissive ?? "#000000", flatShading: true });
    mats.push(metal);
    const g = new Group();
    if (key === "machete") {
      add(g, bladeGeometry(MACHETE.blade), metal);
      add(g, handle(MACHETE), flat);
      trails[key] = [new Vector3(0, 0.42, -0.03), new Vector3(0, 0.84, -0.035)];
    } else {
      const parts = { metal: new PartBuilder(Infinity, mulberry32(3)), wood: new PartBuilder(Infinity, mulberry32(5)), spin: new PartBuilder(Infinity, mulberry32(7)) };
      const info = buildToolShape(key, parts);
      const mo = parts.metal.build();
      const wo = parts.wood.build();
      add(g, mo.solid[0]?.geometry ?? null, metal);
      add(g, wo.solid[0]?.geometry ?? null, flat);
      add(g, mo.glow[0]?.geometry ?? null, glowMat);
      add(g, wo.glow[0]?.geometry ?? null, glowMat);
      if (info.spinner) {
        const disc = add(g, parts.spin.build().solid[0]?.geometry ?? null, metal);
        if (disc) {
          disc.position.copy(v3(info.spinner.pos));
          disc.rotation.set(info.spinner.rx, 0, 0);
          spinners[key] = disc;
        }
      }
      trails[key] = info.trail ? [v3(info.trail[0]), v3(info.trail[1])] : null;
    }
    tools[key] = g;
  }
  const handGeo = buildHand();
  geos.push(handGeo);
  const hand = new Mesh(handGeo, flat);
  return {
    tools,
    hand,
    trails,
    spinners,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
