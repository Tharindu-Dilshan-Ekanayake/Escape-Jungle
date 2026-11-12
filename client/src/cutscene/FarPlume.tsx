import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, IcosahedronGeometry, InstancedMesh, MeshLambertMaterial, Object3D, Vector3 } from "three";
import { FINAL_WRECK, INTRO } from "../config/cutscene";
import { cutscene, cutsceneTime } from "./cutsceneState";

const PUFFS = 14;
const dummy = new Object3D();
const dir = new Vector3();
const base = new Vector3(FINAL_WRECK.plume.x, 0, FINAL_WRECK.plume.z);
const shades = ["#6b6b6b", "#808080", "#959595", "#a8a8a8"].map((c) => new Color(c));

/**
 * Smoke column rising from the plane wreck at stage 7: the goal you can see
 * from anywhere. It is usually far beyond the camera's draw distance, so it is
 * drawn as an impostor: placed just inside the far plane along the true
 * direction and scaled down to keep its real on-screen size. 1 draw call.
 */
export function FarPlume() {
  const camera = useThree((s) => s.camera);
  const r = useMemo(() => {
    const mat = new MeshLambertMaterial({ color: "#ffffff", flatShading: true, fog: false });
    const mesh = new InstancedMesh(new IcosahedronGeometry(1, 1), mat, PUFFS);
    for (let i = 0; i < PUFFS; i++) mesh.setColorAt(i, shades[i % shades.length]);
    mesh.frustumCulled = false;
    return { mat, mesh };
  }, []);
  useEffect(
    () => () => {
      r.mesh.geometry.dispose();
      r.mat.dispose();
    },
    [r],
  );

  useFrame(({ clock }) => {
    // Appears when the plane goes down in the intro, then stays for the whole run.
    const on = !cutscene.active || cutsceneTime() > INTRO.crashAt + 0.3;
    r.mesh.visible = on;
    if (!on) return;
    const t = clock.elapsedTime;
    const { height } = FINAL_WRECK.plume;
    dir.copy(base).sub(camera.position);
    const dist = dir.length();
    const far = (camera as { far?: number }).far ?? 100;
    const d = Math.min(dist, far * 0.85);
    const k = d / Math.max(1, dist);
    dir.normalize();
    for (let i = 0; i < PUFFS; i++) {
      const life = (t * 0.06 + i / PUFFS) % 1;
      const y = life * height;
      const drift = life * life * 10;
      const s = 1.4 + life * 6;
      // True world spot of this puff, then pulled in toward the camera by k.
      const wx = base.x + drift;
      const wy = y + 2;
      const wz = base.z + drift * 0.4;
      dummy.position.set(camera.position.x + (wx - camera.position.x) * k, camera.position.y + (wy - camera.position.y) * k, camera.position.z + (wz - camera.position.z) * k);
      dummy.rotation.set(i, t * 0.1 + i, 0);
      dummy.scale.setScalar(s * k * (life < 0.08 ? life / 0.08 : life > 0.85 ? (1 - life) / 0.15 : 1));
      dummy.updateMatrix();
      r.mesh.setMatrixAt(i, dummy.matrix);
    }
    r.mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={r.mesh} />;
}
