import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshLambertMaterial, type BufferGeometry } from "three";
import { GATES, ZONES1 } from "../../config/zones1";
import type { Collider } from "../player/collision";
import type { GrassField } from "../../grass/GrassField";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import { cutscene } from "../../cutscene/cutsceneState";
import { sfx } from "../audio/sfx";
import { markGateOpen, progress } from "./progress";

/** Wooden palisade gate spanning `width` along local X, with a cross beam and sign. */
function buildGate(width: number): BufferGeometry {
  const b = new PartBuilder(Infinity, mulberry32(31));
  const n = Math.max(4, Math.round(width / 0.55));
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + (i + 0.5) * (width / n);
    const h = 2.8 + b.rand(-0.25, 0.25);
    b.cyl(0.24, 0.27, h, 6, { pos: [x, h / 2, 0], color: "#7a4b2a", top: "#9c6a3c", jitter: 0.1 });
    b.cyl(0, 0.24, 0.4, 6, { pos: [x, h + 0.2, 0], color: "#9c6a3c" });
  }
  for (const y of [0.8, 2.0]) b.box([width + 0.4, 0.22, 0.2], { pos: [0, y, 0.3], color: "#5a3a1c" });
  b.box([2.2, 0.8, 0.12], { pos: [0, 1.4, 0.45], color: "#f3e6c4", top: "#fff4d6" });
  return b.build().solid[0].geometry;
}

interface Props {
  zones: { field: GrassField }[];
  gateColliders: Collider[];
}

/**
 * Zone gates: each opens (sinks into the ground, collider off) once its zone is
 * cleared to GATES.clearToOpen. Reaching the rescue pad after the last gate
 * finishes the run. Mutable state only inside useFrame.
 */
export function GateSystem({ zones, gateColliders }: Props) {
  const gates = useMemo(() => {
    const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const geos = ZONES1.map((z) => buildGate(z.gate.width));
    const meshes = ZONES1.map((z, i) => {
      const m = new Mesh(geos[i], material);
      m.position.set(z.gate.x, 0, z.gate.z);
      m.rotation.y = z.gate.rotY;
      return m;
    });
    return { material, geos, meshes, anim: ZONES1.map(() => 0) };
  }, []);

  useEffect(
    () => () => {
      gates.geos.forEach((g) => g.dispose());
      gates.material.dispose();
    },
    [gates],
  );

  useFrame((_, dt) => {
    if (cutscene.active || progress.finished) return;
    for (let i = 0; i < ZONES1.length; i++) {
      if (!progress.open[i] && zones[i].field.clearRatio >= GATES.clearToOpen) {
        markGateOpen(i);
        gateColliders[i].off = true;
        sfx.upgrade();
        sfx.gate();
      }
      if (progress.open[i] && gates.anim[i] < 1) {
        gates.anim[i] = Math.min(1, gates.anim[i] + dt / GATES.openTime);
        const t = gates.anim[i];
        const m = gates.meshes[i];
        m.position.y = -GATES.depth * t * t;
        m.visible = t < 1;
      }
    }
    // The run finishes when you board the helicopter and it flies you out (EscapeSystem).
  });

  return (
    <>
      {gates.meshes.map((m, i) => (
        <primitive key={ZONES1[i].id} object={m} />
      ))}
    </>
  );
}
