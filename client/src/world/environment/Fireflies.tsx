import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type InstancedMesh } from "three";
import { FIREFLIES } from "../../config/render";
import { PALETTE } from "../../config/palette";

interface Props {
  /** [x, y, z, phase] per firefly (pool size = length / 4). */
  anchors: Float32Array;
  /** Active count from the quality preset (0 = off). */
  count: number;
}

/** Pooled fireflies: one InstancedMesh, hard cap = anchor pool size. */
export function Fireflies({ anchors, count }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const pool = anchors.length / 4;
  const active = Math.min(count, pool);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < active; i++) {
      const o = i * 4;
      const p = anchors[o + 3];
      dummy.position.set(
        anchors[o] + Math.sin(t * 0.6 + p) * FIREFLIES.drift,
        anchors[o + 1] + Math.sin(t * 1.3 + p * 2) * FIREFLIES.bob,
        anchors[o + 2] + Math.cos(t * 0.5 + p) * FIREFLIES.drift,
      );
      dummy.scale.setScalar(FIREFLIES.size * (0.6 + 0.4 * Math.sin(t * FIREFLIES.blinkSpeed + p * 5)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.count = active;
    m.instanceMatrix.needsUpdate = true;
  });

  if (active <= 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, pool]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={PALETTE.firefly} toneMapped={false} />
    </instancedMesh>
  );
}
