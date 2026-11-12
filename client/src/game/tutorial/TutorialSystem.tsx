import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, CylinderGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D } from "three";
import { TUTORIAL } from "../../config/tutorial";
import { ZONES1 } from "../../config/zones1";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { adventures, ST } from "../adventure/adventures";
import { runStats } from "../cutting/cutState";
import { addCash, economy, isBagFull } from "../economy/economy";
import { nearestGrinder } from "../economy/StationSystem";
import { loot } from "../loot/loot";
import { chop, standing } from "../chop/chopTrees";
import { sfx } from "../audio/sfx";
import { note } from "../survival/survival";
import { escape } from "../escape/escape";
import { startTutorial, stopTutorial, tutorial } from "./tutorial";

const dummy = new Object3D();
const tint = new Color();
const GOLD = new Color("#ffd23f");
const WHITE = new Color("#fff8d0");

const levelSum = () => Object.values(economy.levels).reduce((a, b) => a + b, 0);

/** Flat chevron pointing +Z (lies on the ground). */
function chevronGeometry() {
  // Two arms meeting at the tip, each a quad (two triangles).
  const pos = new Float32Array([
    -0.5, 0, -0.2, 0, 0, 0.3, 0, 0, 0.08, -0.5, 0, -0.2, 0, 0, 0.08, -0.5, 0, -0.42,
    0.5, 0, -0.2, 0, 0, 0.08, 0, 0, 0.3, 0.5, 0, -0.2, 0.5, 0, -0.42, 0, 0, 0.08,
  ]);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Where the current step wants you to go (null = nowhere: the step is done in a menu). */
function target(step: string): { x: number; z: number } | null {
  if (step === "talk") {
    const a = adventures.list.find((q) => q.def.id === "luggage") ?? adventures.list[0];
    return a ? { x: a.npc.x, z: a.npc.z } : null;
  }
  if (step === "cut") {
    // Into the meadow's tall grass (nothing to point at once you are in it).
    const MEADOW = ZONES1[0].rect;
    const inside = player.x > MEADOW.minX && player.x < MEADOW.maxX && player.z > MEADOW.minZ && player.z < MEADOW.maxZ;
    return inside ? null : { x: 0, z: MEADOW.maxZ - 2.5 };
  }
  if (step === "sell") {
    const g = nearestGrinder(player.x, player.z);
    return { x: g.ix, z: g.iz };
  }
  if (step === "wood") {
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (const t of chop.trees) {
      const spot = t.pile > 0 ? { x: t.x + 1.1, z: t.z + 0.6 } : standing(t) ? { x: t.x, z: t.z } : null;
      if (!spot) continue;
      const d = Math.hypot(spot.x - player.x, spot.z - player.z);
      if (d < bestD) {
        bestD = d;
        best = spot;
      }
    }
    return best;
  }
  return null;
}

/**
 * The first-time guide: starts after the intro (first run in this browser),
 * checks each step, pays its little reward, and draws glowing chevrons on the
 * ground from you to where you need to go, with a light beam on the spot.
 * 2 draw calls while the guide runs, none after.
 */
export function TutorialSystem() {
  const r = useMemo(() => {
    const mat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    const arrows = new InstancedMesh(chevronGeometry(), mat, TUTORIAL.path.max);
    arrows.frustumCulled = false;
    for (let i = 0; i < TUTORIAL.path.max; i++) arrows.setColorAt(i, GOLD);
    const beamMat = new MeshBasicMaterial({ color: "#ffe680", transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false });
    const beam = new Mesh(new CylinderGeometry(0.55, 0.9, 9, 12, 1, true), beamMat);
    beam.visible = false;
    return { mat, arrows, beamMat, beam, started: false };
  }, []);

  useEffect(
    () => () => {
      r.arrows.geometry.dispose();
      r.mat.dispose();
      r.beam.geometry.dispose();
      r.beamMat.dispose();
    },
    [r],
  );

  useFrame(({ clock }) => {
    // Start once the intro is over.
    if (!r.started && !cutscene.active) {
      r.started = true;
      startTutorial();
      tutorial.base = { cells: runStats.cellsCut, carried: loot.carried, levels: levelSum() };
    }
    const show = tutorial.active && !cutscene.active && !escape.active;
    if (tutorial.active) checkStep();
    const step = TUTORIAL.steps[tutorial.step];
    const t = show && step ? target(step.id) : null;
    r.arrows.visible = !!t;
    r.beam.visible = !!t;
    if (!t) return;
    // Chevrons from just in front of you to just short of the target.
    const dx = t.x - player.x;
    const dz = t.z - player.z;
    const dist = Math.hypot(dx, dz);
    const { spacing, max, startGap, endGap } = TUTORIAL.path;
    const n = Math.max(0, Math.min(max, Math.floor((dist - startGap - endGap) / spacing) + 1));
    const ux = dx / (dist || 1);
    const uz = dz / (dist || 1);
    const yaw = Math.atan2(ux, uz);
    const time = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const d = startGap + i * spacing;
      dummy.position.set(player.x + ux * d, 0.07, player.z + uz * d);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(0.9);
      dummy.updateMatrix();
      r.arrows.setMatrixAt(i, dummy.matrix);
      // A wave of light running toward the target.
      const wave = 0.5 + 0.5 * Math.sin(time * 6 - i * 0.7);
      r.arrows.setColorAt(i, tint.copy(GOLD).lerp(WHITE, wave));
    }
    r.arrows.count = n;
    r.arrows.instanceMatrix.needsUpdate = true;
    if (r.arrows.instanceColor) r.arrows.instanceColor.needsUpdate = true;
    r.beam.position.set(t.x, 4.5, t.z);
    r.beamMat.opacity = 0.16 + Math.sin(time * 3) * 0.06;
  });

  return (
    <>
      <primitive object={r.arrows} />
      <primitive object={r.beam} />
    </>
  );
}

/** Is the current step done? Pays its reward and moves on. */
function checkStep() {
  const step = TUTORIAL.steps[tutorial.step];
  if (!step) return;
  let done = false;
  let progress = "";
  if (step.id === "talk") {
    const a = adventures.list.find((q) => q.def.id === "luggage");
    done = !!a && a.state !== ST.New;
  } else if (step.id === "cut") {
    const n = runStats.cellsCut - tutorial.base.cells;
    progress = `${Math.min(n, TUTORIAL.cutTarget)} / ${TUTORIAL.cutTarget} plants`;
    done = n >= TUTORIAL.cutTarget || isBagFull();
  } else if (step.id === "sell") {
    done = economy.lastSale.amount > 0 && economy.lastSale.at > tutorial.stepStart;
  } else if (step.id === "wood") {
    done = loot.carried > tutorial.base.carried || loot.lastWood > tutorial.stepStart;
  } else if (step.id === "upgrade") {
    done = levelSum() > tutorial.base.levels;
  }
  if (progress !== tutorial.progress) {
    tutorial.progress = progress;
    tutorial.version++;
  }
  if (!done) return;
  const now = performance.now() / 1000;
  if (step.reward > 0) {
    addCash(step.reward);
    tutorial.reward = { amount: step.reward, at: now };
  }
  sfx.upgrade();
  tutorial.step++;
  tutorial.stepStart = now;
  tutorial.base = { cells: runStats.cellsCut, carried: loot.carried, levels: levelSum() };
  tutorial.progress = "";
  tutorial.version++;
  if (tutorial.step >= TUTORIAL.steps.length) {
    note("🎉 Guide complete! You know the jungle now. Clear the meadow to open the gate!");
    stopTutorial(true);
  }
}
