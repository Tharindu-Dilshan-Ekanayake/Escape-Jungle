import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3 } from "three";
import { LABELS } from "../config/render";
import { CULL_INTERVAL_S } from "../config/world";
import { cutscene } from "../cutscene/cutsceneState";

export interface WorldLabel {
  /** Stable React key (defaults to text). */
  key?: string;
  text: string;
  /** Optional smaller second line. */
  sub?: string;
  pos: [number, number, number];
}

interface Props {
  labels: WorldLabel[];
  /** "typewriter" (jungle signs) or "lobby" (rounded bold). */
  font?: "typewriter" | "lobby";
}

const camDir = new Vector3();

/**
 * Floating labels above props (DOM, no GPU cost). Our own culling hides labels
 * behind the camera or beyond LABELS.maxDistance; drei's built-in check only
 * re-runs when the projected position changes.
 */
export function PropLabels({ labels, font = "typewriter" }: Props) {
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const timer = useRef(CULL_INTERVAL_S);

  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (timer.current < CULL_INTERVAL_S / 2) return;
    timer.current = 0;
    camera.getWorldDirection(camDir);
    const max2 = LABELS.maxDistance * LABELS.maxDistance;
    for (let i = 0; i < labels.length; i++) {
      const el = els.current[i];
      if (!el) continue;
      const [x, y, z] = labels[i].pos;
      const dx = x - camera.position.x;
      const dy = y - camera.position.y;
      const dz = z - camera.position.z;
      const show = !cutscene.active && dx * camDir.x + dy * camDir.y + dz * camDir.z > 0 && dx * dx + dz * dz < max2;
      const v = show ? "visible" : "hidden";
      if (el.style.visibility !== v) el.style.visibility = v;
    }
  });

  const main = font === "lobby" ? "font-lobby font-bold text-5xl" : "font-typewriter text-4xl";
  return (
    <>
      {labels.map((l, i) => (
        <Html key={l.key ?? l.text} position={l.pos} center distanceFactor={LABELS.distanceFactor} zIndexRange={[20, 0]}>
          <div
            ref={(el) => {
              // Start hidden once; afterwards only the cull pass touches visibility
              // (a style prop would reset it on every re-render and flicker).
              if (el && els.current[i] !== el) el.style.visibility = "hidden";
              els.current[i] = el;
            }}
            className="pointer-events-none select-none whitespace-nowrap text-center text-white"
          >
            <div className={`${main} text-outline`}>{l.text}</div>
            {l.sub && <div className="font-lobby text-outline text-2xl font-semibold">{l.sub}</div>}
          </div>
        </Html>
      ))}
    </>
  );
}
