import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Material, Mesh } from "three";
import type { ChunkGeometry } from "./geo/PartBuilder";
import { CHUNK_HALF_DIAG, CULL_INTERVAL_S } from "../config/world";
import { useQualityStore } from "../store/qualityStore";
import { cutscene } from "../cutscene/cutsceneState";

interface Props {
  chunks: ChunkGeometry[];
  material: Material;
  shadows: boolean;
  /** Never cull closer than this (m), whatever the preset says. */
  minView?: number;
}

/**
 * One merged mesh per 16 m chunk. Chunks farther than the preset's view
 * distance are hidden, re-checked every CULL_INTERVAL_S (not every frame).
 */
export function ChunkMeshes({ chunks, material, shadows, minView = 0 }: Props) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const timer = useRef(CULL_INTERVAL_S);
  const viewDistance = useQualityStore((s) => s.preset.viewDistance);
  const slack = useQualityStore((s) => s.preset.chunkSlack);

  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (timer.current < CULL_INTERVAL_S) return;
    timer.current = 0;
    // The intro's camera swoops over the camp: draw a bit less far there (the fog hides it anyway).
    const limit = Math.max(viewDistance, minView) * (cutscene.active ? 0.72 : 1) + CHUNK_HALF_DIAG * slack;
    const limit2 = limit * limit;
    const { x, z } = camera.position;
    for (let i = 0; i < chunks.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const dx = chunks[i].cx - x;
      const dz = chunks[i].cz - z;
      m.visible = dx * dx + dz * dz < limit2;
    }
  });

  return (
    <>
      {chunks.map((c, i) => (
        <mesh
          key={c.key}
          name={c.key}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={c.geometry}
          material={material}
          castShadow={shadows}
          receiveShadow={shadows}
          matrixAutoUpdate={false}
        />
      ))}
    </>
  );
}
