import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Sphere, Vector3 } from "three";
import type { GrassField } from "./GrassField";
import { makePlantGeometry } from "./plantGeometry";
import { PLANT_TYPES } from "../config/grass";
import { createGrassMaterial } from "./grassMaterial";
import { GRASS_RENDER } from "../config/grass";
import { CHUNK_HALF_DIAG, CULL_INTERVAL_S } from "../config/world";
import { useQualityStore } from "../store/qualityStore";

/** Tallest possible plant (bamboo), for chunk bounding spheres (m). */
const MAX_HEIGHT = 3.6;

/**
 * One InstancedMesh per 16 m chunk (one plant type in Phase 2). Far chunks
 * swap to a low-detail clump (LOD); chunks past the view distance are hidden.
 * Cut animations write instance matrices; only dirty chunks are re-uploaded.
 */
export function GrassChunks({ field }: { field: GrassField }) {
  const preset = useQualityStore((s) => s.preset);
  const grass = useMemo(() => createGrassMaterial(), []);
  const timer = useRef(CULL_INTERVAL_S);

  // Near/far detail from the quality preset; far chunks use half the parts.
  const shape = PLANT_TYPES[field.plantId].shape;
  const density = preset.grassDensity;
  const geos = useMemo(
    () => ({ near: makePlantGeometry(shape, density, 11), far: makePlantGeometry(shape, density * 0.5, 23) }),
    [shape, density],
  );

  const meshes = useMemo(
    () =>
      field.chunks.map((ch) => {
        const mesh = new InstancedMesh(geos.near, grass.material, ch.cells.length);
        mesh.instanceMatrix = new InstancedBufferAttribute(ch.matrices, 16);
        mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        mesh.instanceColor = new InstancedBufferAttribute(ch.colors, 3);
        mesh.boundingSphere = new Sphere(new Vector3(ch.cx, MAX_HEIGHT / 2, ch.cz), CHUNK_HALF_DIAG + MAX_HEIGHT);
        mesh.matrixAutoUpdate = false;
        mesh.name = `grass:${shape}:${ch.key}`;
        return mesh;
      }),
    // geos.near is only the initial geometry; LOD swaps happen in useFrame.
    [field, grass],
  );

  useEffect(() => {
    grass.uniforms.uWind.value = preset.wind ? GRASS_RENDER.wind : 0;
  }, [grass, preset.wind]);

  // Re-apply geometry when the density preset changes, and dispose old clumps.
  useEffect(() => {
    for (const m of meshes) m.geometry = geos.near;
    timer.current = CULL_INTERVAL_S; // force an LOD pass next frame
    return () => {
      geos.near.dispose();
      geos.far.dispose();
    };
  }, [geos, meshes]);

  useEffect(
    () => () => {
      for (const m of meshes) m.dispose();
      grass.material.dispose();
    },
    [meshes, grass],
  );

  useFrame(({ camera, clock }, dt) => {
    const now = clock.elapsedTime;
    grass.uniforms.uTime.value = now;
    field.update(now);
    for (let i = 0; i < meshes.length; i++) {
      const ch = field.chunks[i];
      if (ch.dirty) {
        meshes[i].instanceMatrix.needsUpdate = true;
        ch.dirty = false;
      }
    }

    timer.current += dt;
    if (timer.current < CULL_INTERVAL_S) return;
    timer.current = 0;
    const view = preset.viewDistance + CHUNK_HALF_DIAG * preset.chunkSlack;
    const lod = preset.grassLod + CHUNK_HALF_DIAG;
    const { x, z } = camera.position;
    for (let i = 0; i < meshes.length; i++) {
      const ch = field.chunks[i];
      const dx = ch.cx - x;
      const dz = ch.cz - z;
      const d2 = dx * dx + dz * dz;
      const m = meshes[i];
      m.visible = d2 < view * view;
      const g = d2 < lod * lod ? geos.near : geos.far;
      if (m.geometry !== g) m.geometry = g;
    }
  });

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={field.chunks[i].key} object={m} />
      ))}
    </>
  );
}
