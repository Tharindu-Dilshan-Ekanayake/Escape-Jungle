import { BufferAttribute, Color, ExtrudeGeometry, Shape, type BufferGeometry } from "three";

/**
 * Machete blades as bevelled extrusions with baked vertex colours: dark steel
 * at the spine fading to a bright polished edge, a white "shine" line along the
 * cutting edge, and (rusty) orange corrosion patches. Built once at mount.
 *
 * Authoring space: shape X = forward (cutting edge side), Y = up the blade,
 * extrusion Z = thickness. Rotated at the end so forward = -Z, thickness = X.
 */
export interface BladeStyle {
  spine: string;
  steel: string;
  polish: string;
  edge: string;
  rust?: { color: string; dark: string; amount: number };
  /** Small V chips along the edge. */
  notches: number;
}

const DEPTH = 0.007;
const BEVEL = 0.0045;
const SPINE_X = -0.032;
const EDGE_X = 0.078;

/** Blade outline: straight spine, curved belly, clipped point, optional chips. */
function outline(notches: number): Shape {
  const s = new Shape();
  s.moveTo(SPINE_X, 0.165);
  s.lineTo(0.044, 0.165);
  if (notches > 0) {
    // Edge chips: short zig-zags in the lower half of the edge.
    for (let i = 0; i < notches; i++) {
      const y = 0.26 + i * 0.13;
      const x = 0.05 + i * 0.006;
      s.lineTo(x, y - 0.012);
      s.lineTo(x - 0.012, y);
      s.lineTo(x + 0.002, y + 0.012);
    }
  }
  s.quadraticCurveTo(0.072, 0.5, EDGE_X, 0.68);
  s.quadraticCurveTo(0.074, 0.8, 0.024, 0.85);
  s.lineTo(SPINE_X + 0.006, 0.78);
  s.quadraticCurveTo(SPINE_X - 0.004, 0.5, SPINE_X, 0.165);
  return s;
}

/** Cheap deterministic value noise in [0, 1]. */
function noise(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const m = Math.sin(x * 37.3 + y * 91.9 + 1.7) * 12543.13;
  return (n - Math.floor(n)) * 0.5 + (m - Math.floor(m)) * 0.5;
}

export function bladeGeometry(style: BladeStyle): BufferGeometry {
  const g = new ExtrudeGeometry(outline(style.notches), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.005,
    bevelSegments: 1,
    curveSegments: 10,
  });
  g.deleteAttribute("uv");
  const pos = g.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  const spine = new Color(style.spine);
  const steel = new Color(style.steel);
  const polish = new Color(style.polish);
  const edge = new Color(style.edge);
  const rust = style.rust ? new Color(style.rust.color) : null;
  const rustDark = style.rust ? new Color(style.rust.dark) : null;
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = Math.min(1, Math.max(0, (x - SPINE_X) / (EDGE_X - SPINE_X)));
    // Spine -> steel -> polished bevel toward the edge.
    if (u < 0.55) c.copy(spine).lerp(steel, u / 0.55);
    else c.copy(steel).lerp(polish, (u - 0.55) / 0.45);
    // Ring between the two faces = the sharpened edge (bright) or the spine (dark).
    const onRing = z > -1e-4 && z < DEPTH + 1e-4;
    if (onRing) c.copy(u > 0.45 ? edge : spine);
    if (rust && rustDark && style.rust) {
      const n = noise(Math.round(x * 140) / 140, Math.round(y * 60) / 60);
      if (n > 1 - style.rust.amount) c.lerp(n > 1 - style.rust.amount * 0.4 ? rustDark : rust, 0.85);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.translate(0, 0, -DEPTH / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Blade thickness incl. bevels (for parts that sit on the faces). */
export const BLADE_THICKNESS = DEPTH + BEVEL * 2;
