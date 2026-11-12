import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CylinderGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from "three";
import { MISTY } from "../../config/mistyForest";
import { dayNight } from "../../game/time/dayNight";

const dummy = new Object3D();

/**
 * Soft sunbeams slanting down through the canopy over the Landing Site and
 * the Meadow: faint additive cones, faded out at night. 1 draw call.
 */
export function LightShafts() {
  const r = useMemo(() => {
    const geo = new CylinderGeometry(0.35, 1, 1, 8, 1, true);
    geo.translate(0, -0.5, 0);
    const mat = new MeshBasicMaterial({ color: "#f4ffd8", transparent: true, opacity: MISTY.shaftOpacity, depthWrite: false, blending: AdditiveBlending, fog: false, toneMapped: false });
    const mesh = new InstancedMesh(geo, mat, MISTY.shafts.length);
    MISTY.shafts.forEach(([x, z, tilt, w], i) => {
      const h = MISTY.shaftHeight;
      dummy.position.set(x - Math.sin(tilt) * h, h, z);
      dummy.rotation.set(0, 0.6 * i, tilt);
      dummy.scale.set(w, h * 1.05, w);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.frustumCulled = false;
    return { geo, mat, mesh };
  }, []);
  useEffect(
    () => () => {
      r.geo.dispose();
      r.mat.dispose();
    },
    [r],
  );
  useFrame(({ clock }) => {
    const day = 1 - dayNight.dark;
    r.mesh.visible = day > 0.05;
    r.mat.opacity = MISTY.shaftOpacity * day * (0.85 + Math.sin(clock.elapsedTime * 0.4) * 0.15);
  });
  return <primitive object={r.mesh} />;
}
