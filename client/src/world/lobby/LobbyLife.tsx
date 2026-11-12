import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  RingGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LOBBY_VIEW as L } from "../../config/lobby";
import { useQualityStore } from "../../store/qualityStore";

const dummy = new Object3D();
const WING_COLORS = ["#ff7ab6", "#ffd23f", "#7ad8ff", "#ffffff", "#ff9a3c", "#b77bff"];
const PETAL_COLORS = ["#ffb0d0", "#ffffff", "#ffe08a"];

function butterflyGeometry(): BufferGeometry {
  const left = new BoxGeometry(0.22, 0.01, 0.16).translate(-0.12, 0, 0);
  const right = new BoxGeometry(0.22, 0.01, 0.16).translate(0.12, 0, 0);
  const body = new BoxGeometry(0.03, 0.03, 0.18);
  const g = mergeGeometries([left, right, body]);
  left.dispose();
  right.dispose();
  body.dispose();
  return g;
}

/**
 * Lobby ambience, all time-driven (no per-particle state) and pooled:
 * butterflies over the lawns, fountain spray + ripples, drifting petals.
 * 4 draw calls; counts scale with the quality preset.
 */
export function LobbyLife() {
  const level = useQualityStore((s) => s.level);
  const n = level === "LOW" ? { fly: 8, drop: 24, petal: 10 } : level === "MEDIUM" ? { fly: 14, drop: 40, petal: 18 } : { fly: 20, drop: 56, petal: 26 };

  const r = useMemo(() => {
    const flyGeo = butterflyGeometry();
    const dropGeo = new IcosahedronGeometry(0.06, 0);
    const ringGeo = new RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2);
    const petalGeo = new BoxGeometry(0.12, 0.01, 0.09);
    const flyMat = new MeshLambertMaterial({ side: DoubleSide });
    const dropMat = new MeshBasicMaterial({ color: "#bfefff", transparent: true, opacity: 0.85 });
    const ringMat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false });
    const petalMat = new MeshLambertMaterial({ side: DoubleSide });
    const flies = new InstancedMesh(flyGeo, flyMat, 20);
    const drops = new InstancedMesh(dropGeo, dropMat, 56);
    const rings = new InstancedMesh(ringGeo, ringMat, 3);
    const petals = new InstancedMesh(petalGeo, petalMat, 26);
    const c = new Color();
    for (let i = 0; i < 20; i++) flies.setColorAt(i, c.set(WING_COLORS[i % WING_COLORS.length]));
    for (let i = 0; i < 26; i++) petals.setColorAt(i, c.set(PETAL_COLORS[i % PETAL_COLORS.length]));
    for (const m of [flies, drops, rings, petals]) m.frustumCulled = false;
    return { flyGeo, dropGeo, ringGeo, petalGeo, flyMat, dropMat, ringMat, petalMat, flies, drops, rings, petals };
  }, []);

  useEffect(
    () => () => {
      for (const g of [r.flyGeo, r.dropGeo, r.ringGeo, r.petalGeo]) g.dispose();
      for (const m of [r.flyMat, r.dropMat, r.ringMat, r.petalMat]) m.dispose();
    },
    [r],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Butterflies: lazy loops around the lawn islands and flower beds.
    const spots = L.parkTrees;
    for (let i = 0; i < n.fly; i++) {
      const [cx, cz] = spots[i % spots.length];
      const ph = i * 1.7;
      const R = 1.6 + (i % 3) * 0.7;
      const x = cx + Math.cos(t * 0.45 + ph) * R + Math.sin(t * 1.3 + ph) * 0.4;
      const z = cz + Math.sin(t * 0.38 + ph * 1.3) * R;
      const y = 0.9 + Math.sin(t * 1.7 + ph) * 0.35 + (i % 2) * 0.5;
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 15 + ph));
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -t * 0.45 - ph + Math.PI / 2, Math.sin(t * 2 + ph) * 0.2);
      dummy.scale.set(flap, 1, 1);
      dummy.updateMatrix();
      r.flies.setMatrixAt(i, dummy.matrix);
    }
    r.flies.count = n.fly;
    r.drops.count = 0;
    r.rings.count = 0;
    // Petals drifting down from the park trees and blowing across the plaza.
    for (let i = 0; i < n.petal; i++) {
      const [cx, cz] = spots[i % spots.length];
      const u = (t * 0.08 + i * 0.137) % 1;
      dummy.position.set(cx + u * 6 + Math.sin(t + i) * 0.5, 6 - u * 6, cz + Math.cos(t * 0.7 + i) * 1.2 + u * 2);
      dummy.rotation.set(t * 2 + i, t * 1.3 + i, t + i);
      dummy.scale.setScalar(u > 0.97 ? 0 : 1);
      dummy.updateMatrix();
      r.petals.setMatrixAt(i, dummy.matrix);
    }
    r.petals.count = n.petal;
    for (const m of [r.flies, r.drops, r.rings, r.petals]) m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={r.flies} />
      <primitive object={r.drops} />
      <primitive object={r.rings} />
      <primitive object={r.petals} />
    </>
  );
}
