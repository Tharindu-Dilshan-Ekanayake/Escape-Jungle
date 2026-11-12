import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshLambertMaterial, Object3D } from "three";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import type { ForageLayout } from "../../world/zones/baseLayout";
import { interact } from "./interact";
import { player } from "../player/FirstPersonController";

const dummy = new Object3D();
const GROW_S = 1.5;
/** Only forage within this distance is drawn (instances compacted, so far ones cost nothing). */
const DRAW_RANGE = 40;

function berryCluster() {
  const b = new PartBuilder(Infinity, mulberry32(61));
  for (let i = 0; i < 9; i++) {
    const a = b.rand(0, Math.PI * 2);
    const y = b.rand(0.45, 1.0);
    const r = 0.5 + b.rand(-0.05, 0.12);
    b.ico(0.06, 0, { pos: [Math.cos(a) * r, y, Math.sin(a) * r], color: i % 3 ? "#5a3fb0" : "#d63a5a", top: "#8f7aff" });
  }
  return b.build().solid[0].geometry;
}

function bananaBunch() {
  const b = new PartBuilder(Infinity, mulberry32(62));
  b.cyl(0.03, 0.04, 0.5, 5, { pos: [0, 0.2, 0], color: "#5e7a2a" });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + row * 0.4;
      b.cyl(0.035, 0.045, 0.3, 5, {
        pos: [Math.cos(a) * 0.12, 0.05 + row * 0.13, Math.sin(a) * 0.12],
        rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5],
        color: "#d9b82a",
        top: "#f2e05a",
      });
    }
  }
  return b.build().solid[0].geometry;
}

/** Berries on the bushes and banana bunches on the palms: hidden while regrowing (2 draw calls). */
export function ForageSystem({ forage }: { forage: ForageLayout }) {
  const r = useMemo(() => {
    const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const berryGeo = berryCluster();
    const bananaGeo = bananaBunch();
    const berries = new InstancedMesh(berryGeo, material, Math.max(1, forage.berryBushes.length));
    const bananas = new InstancedMesh(bananaGeo, material, Math.max(1, forage.bananas.length));
    berries.frustumCulled = bananas.frustumCulled = false;
    return { material, berryGeo, bananaGeo, berries, bananas };
  }, [forage]);

  useEffect(
    () => () => {
      r.material.dispose();
      r.berryGeo.dispose();
      r.bananaGeo.dispose();
    },
    [r],
  );

  useFrame(() => {
    const now = performance.now() / 1000;
    let n = 0;
    const bushes = forage.berryBushes;
    for (let i = 0; i < bushes.length; i++) {
      const p = bushes[i];
      const ready = interact.bushReady[i] ?? 0;
      if (now < ready || Math.hypot(p.x - player.x, p.z - player.z) > DRAW_RANGE) continue;
      const s = ready === 0 ? 1 : Math.min(1, (now - ready) / GROW_S);
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.scale.setScalar(Math.max(0.0001, s));
      dummy.updateMatrix();
      r.berries.setMatrixAt(n++, dummy.matrix);
    }
    r.berries.count = n;
    n = 0;
    const bananas = forage.bananas;
    for (let i = 0; i < bananas.length; i++) {
      const p = bananas[i];
      const ready = interact.bananaReady[i] ?? 0;
      if (now < ready || Math.hypot(p.x - player.x, p.z - player.z) > DRAW_RANGE) continue;
      const s = ready === 0 ? 1 : Math.min(1, (now - ready) / GROW_S);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(Math.PI, i, 0);
      dummy.scale.setScalar(Math.max(0.0001, s * 1.3));
      dummy.updateMatrix();
      r.bananas.setMatrixAt(n++, dummy.matrix);
    }
    r.bananas.count = n;
    r.berries.instanceMatrix.needsUpdate = true;
    r.bananas.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={r.berries} />
      <primitive object={r.bananas} />
    </>
  );
}
