import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshBasicMaterial, Object3D, Vector3, type PointLight } from "three";
import { FINAL_WRECK } from "../config/cutscene";
import { flameGeometry } from "../game/campfire/CampfireSystem";
import { cutscene } from "./cutsceneState";
import { useQualityStore } from "../store/qualityStore";

const dummy = new Object3D();
/** Burning spots on the plane wreck at stage 7 (world x, y, z, flame size). */
const FIRES = FINAL_WRECK.fires;
const EMBERS = 18;

/**
 * The plane wreck at stage 7 keeps burning: flickering flames on its pieces, rising embers and (not on LOW) a warm flickering
 * light. 2-3 draw calls, all instanced.
 */
export function WreckFire() {
  const level = useQualityStore((s) => s.level);
  const embersOn = useQualityStore((s) => s.preset.particleCap > 0);
  const light = useRef<PointLight>(null);
  const r = useMemo(() => {
    const geo = flameGeometry();
    const mat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
    const emberMat = new MeshBasicMaterial({ color: "#ffb347", toneMapped: false, fog: false });
    const flames = new InstancedMesh(geo, mat, FIRES.length * 2);
    const embers = new InstancedMesh(geo, emberMat, EMBERS);
    flames.frustumCulled = embers.frustumCulled = false;
    const spots = FIRES.map(([x, y, z, s]) => ({ p: new Vector3(x, y, z), s }));
    return { geo, mat, emberMat, flames, embers, spots };
  }, []);

  useEffect(
    () => () => {
      r.geo.dispose();
      r.mat.dispose();
      r.emberMat.dispose();
    },
    [r],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Hidden while the plane is still flying in the intro.
    const on = !cutscene.active;
    r.flames.visible = on;
    r.embers.visible = on && embersOn;
    if (!on) {
      if (light.current) light.current.intensity = 0;
      return;
    }
    r.spots.forEach((f, i) => {
      for (let layer = 0; layer < 2; layer++) {
        const ph = i * 2.1 + layer * 1.3;
        const sc = f.s * (layer ? 0.7 : 1);
        dummy.position.copy(f.p);
        dummy.rotation.set(Math.sin(t * 3 + ph) * 0.08, (layer ? -t * 1.4 : t) + ph, Math.cos(t * 2.6 + ph) * 0.08);
        dummy.scale.set(sc, sc * (1 + Math.sin(t * 12 + ph) * 0.14 + Math.sin(t * 7.7 + ph) * 0.1) * (layer ? 1.3 : 1), sc);
        dummy.updateMatrix();
        r.flames.setMatrixAt(i * 2 + layer, dummy.matrix);
      }
    });
    r.flames.instanceMatrix.needsUpdate = true;
    if (embersOn) {
      for (let e = 0; e < EMBERS; e++) {
        const f = r.spots[e % r.spots.length];
        const life = (t * (0.4 + (e % 4) * 0.06) + e * 0.173) % 1;
        const a = e * 2.4 + t * 0.7;
        dummy.position.set(f.p.x + Math.cos(a) * (0.2 + life * 0.6), f.p.y + 0.4 + life * 3.5, f.p.z + Math.sin(a) * (0.2 + life * 0.6));
        dummy.rotation.set(t * 3 + e, e, 0);
        dummy.scale.setScalar(0.045 * (1 - life));
        dummy.updateMatrix();
        r.embers.setMatrixAt(e, dummy.matrix);
      }
      r.embers.instanceMatrix.needsUpdate = true;
    }
    if (light.current) {
      const main = r.spots[0].p;
      light.current.position.set(main.x, main.y + 1, main.z);
      light.current.intensity = 14 * (1 + Math.sin(t * 13) * 0.15 + Math.sin(t * 29) * 0.1);
    }
  });

  return (
    <>
      <primitive object={r.flames} />
      <primitive object={r.embers} />
      {level !== "LOW" && <pointLight ref={light} color="#ff8a3c" intensity={0} distance={14} decay={1.6} />}
    </>
  );
}
