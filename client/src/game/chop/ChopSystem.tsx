import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshLambertMaterial, Object3D } from "three";
import { RUN_RULES } from "@shared";
import { FIREWOOD } from "../../config/firewood";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import { leafPuff } from "../../world/props/storyTree";
import { onRunSync } from "../../net/runNet";
import { applyChopSync, bindChop, chop, standing } from "./chopTrees";

const dummy = new Object3D();
const MAX_LOGS = 10;

/** A smaller storybook tree with a red ribbon round the trunk (= "you can chop me") and an axe notch. */
function treeGeometry() {
  const b = new PartBuilder(Infinity, mulberry32(4711));
  // Light version (it can be in view a few times over): trunk, roots, two branches, three leaf puffs.
  const c = { dark: "#2f8a2a", mid: "#4fb32e", light: "#8fe03a", sun: "#c8f55a" };
  b.cyl(0.26, 0.38, 4.3, 7, { pos: [0, 2.15, 0], color: "#6e4326", top: "#a26a40" });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    b.box([0.18, 0.5, 0.55], { pos: [Math.sin(a) * 0.36, 0.2, Math.cos(a) * 0.36], rot: [0.5, a, 0], color: "#6e4326" });
  }
  for (const [a, h] of [[0.6, 3.4], [3.5, 3.0]] as [number, number][]) {
    b.push([0, h, 0], a);
    b.cyl(0.07, 0.14, 1.9, 5, { pos: [0, 0.65, 0.65], rot: [0.8, 0, 0], color: "#6e4326", top: "#a26a40" });
    b.pop();
    leafPuff(b, Math.sin(a) * 1.35, h + 1.4, Math.cos(a) * 1.35, 1.5, c);
  }
  leafPuff(b, 0, 4.9, 0, 1.9, c);
  b.cyl(0.42, 0.42, 0.16, 8, { pos: [0, 1.25, 0], color: "#d63a2f", top: "#ef5a4c" });
  b.box([0.08, 0.5, 0.05], { pos: [0.38, 1.05, 0.12], rot: [0, 0, 0.3], color: "#d63a2f" });
  b.box([0.3, 0.18, 0.08], { pos: [0, 0.7, 0.36], rot: [0, 0, 0.785], color: "#e8cf9a" });
  return b.build().solid[0].geometry;
}

function stumpGeometry() {
  const b = new PartBuilder(Infinity, mulberry32(4712));
  b.cyl(0.4, 0.5, 0.5, 8, { pos: [0, 0.25, 0], color: "#5a3a24", top: "#7a5232" });
  b.cyl(0.38, 0.38, 0.04, 8, { pos: [0, 0.51, 0], color: "#e8cf9a" });
  b.cyl(0.2, 0.2, 0.045, 8, { pos: [0, 0.52, 0], color: "#c8a46a" });
  for (let i = 0; i < 5; i++) b.box([0.12, 0.03, 0.08], { pos: [b.rand(-0.9, 0.9), 0.02, b.rand(-0.9, 0.9)], rot: [0, b.rand(0, 3), 0], color: "#e8cf9a" });
  return b.build().solid[0].geometry;
}

function logGeometry() {
  const b = new PartBuilder(Infinity, mulberry32(4713));
  b.cyl(0.13, 0.13, 0.9, 7, { pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], color: "#6b4423", top: "#8a5a34" });
  for (const x of [-0.455, 0.455]) b.cyl(0.11, 0.11, 0.02, 7, { pos: [x, 0, 0], rot: [0, 0, Math.PI / 2], color: "#e8cf9a" });
  return b.build().solid[0].geometry;
}

/**
 * Firewood trees: standing trees shake when hit and fall over when felled,
 * leaving a stump and a pile of logs (shared state in chopTrees.ts). Three
 * instanced meshes = 3 draw calls for every tree, stump and log.
 */
export function ChopSystem() {
  const r = useMemo(() => {
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const n = FIREWOOD.spots.length;
    const trees = new InstancedMesh(treeGeometry(), mat, n);
    const stumps = new InstancedMesh(stumpGeometry(), mat, n);
    const logs = new InstancedMesh(logGeometry(), mat, n * MAX_LOGS);
    for (const m of [trees, stumps, logs]) m.frustumCulled = false;
    return { mat, trees, stumps, logs };
  }, []);

  useEffect(() => {
    const unbind = bindChop();
    const unsync = onRunSync(applyChopSync);
    return () => {
      unbind();
      unsync();
      r.trees.geometry.dispose();
      r.stumps.geometry.dispose();
      r.logs.geometry.dispose();
      r.mat.dispose();
    };
  }, [r]);

  useFrame(({ camera }) => {
    const now = performance.now() / 1000;
    const range2 = FIREWOOD.drawRange * FIREWOOD.drawRange;
    let ti = 0;
    let si = 0;
    let li = 0;
    chop.trees.forEach((t, i) => {
      // Only nearby trees are drawn (there is one in every corner of every zone).
      if ((t.x - camera.position.x) ** 2 + (t.z - camera.position.z) ** 2 > range2) return;
      const up = standing(t);
      const falling = !up && now - t.fellAt < FIREWOOD.fallS;
      if (up || falling) {
        dummy.position.set(t.x, 0, t.z);
        const shake = Math.max(0, 1 - (now - t.hitAt) / FIREWOOD.shakeS);
        const fall = falling ? Math.pow((now - t.fellAt) / FIREWOOD.fallS, 2) * (Math.PI / 2) : 0;
        // Partly chopped trees lean a little; felled ones topple away from the camp.
        const lean = up ? (1 - t.hp / RUN_RULES.treeHp) * 0.06 : 0;
        dummy.rotation.set(fall + lean, i * 1.7, Math.sin(now * 40) * 0.05 * shake);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        r.trees.setMatrixAt(ti++, dummy.matrix);
      }
      if (!up) {
        dummy.position.set(t.x, 0, t.z);
        dummy.rotation.set(0, i * 1.7, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        r.stumps.setMatrixAt(si++, dummy.matrix);
      }
      // Log pile next to the stump (or the standing tree, if it regrew with logs left).
      const n = Math.min(MAX_LOGS, t.pile);
      for (let k = 0; k < n; k++) {
        const row = k < 3 ? 0 : k < 5 ? 1 : 2;
        const col = k < 3 ? k : k < 5 ? k - 3 : k - 5;
        dummy.position.set(t.x + 1.1 + (col - (row === 0 ? 1 : 0.5)) * 0.27, 0.13 + row * 0.24, t.z + 0.6);
        dummy.rotation.set(0, 0.2 + i, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        r.logs.setMatrixAt(li++, dummy.matrix);
      }
    });
    r.trees.count = ti;
    r.stumps.count = si;
    r.logs.count = li;
    r.trees.instanceMatrix.needsUpdate = true;
    r.stumps.instanceMatrix.needsUpdate = true;
    r.logs.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={r.trees} />
      <primitive object={r.stumps} />
      <primitive object={r.logs} />
    </>
  );
}
