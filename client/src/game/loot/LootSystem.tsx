import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
} from "three";
import { CAMPFIRE } from "../../config/night";
import { RARITY_COLOR, TREASURE, TREASURES, WOOD } from "../../config/loot";
import type { GrassField } from "../../grass/GrassField";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { progress } from "../progress/progress";
import { addCash, economy } from "../economy/economy";
import { onRunSync, runHandlers, sendPickup } from "../../net/runNet";
import { sfx } from "../audio/sfx";
import { beamGeometry, logGeometry, treasureGeometries } from "./lootModels";
import { loot } from "./loot";

const dummy = new Object3D();
const HIDDEN = 0;
const SHOWN = 1;
const GONE = 2;
const REVEAL_SOUND_RANGE = 25;

/**
 * Renders firewood + treasures and handles pickups. Items appear once the
 * plant cell above them is cut. Instanced: 1 draw call for all logs, 1 per
 * treasure kind currently visible, 1 for the light beams. Mutable state only.
 */
export function LootSystem({ fields }: { fields: GrassField[] }) {
  const r = useMemo(() => {
    const items = loot.items;
    const flat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const shiny = new MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: "#3a3020" });
    const beamMat = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    const logGeo = logGeometry();
    const tGeos = treasureGeometries();
    const beamGeo = beamGeometry(TREASURE.beamRadius, TREASURE.beamHeight);

    const woodIdx = items.flatMap((it, i) => (it.kind === "wood" ? [i] : []));
    const treasureIdx = items.flatMap((it, i) => (it.kind === "wood" ? [] : [i]));
    const logs = new InstancedMesh(logGeo, flat, Math.max(1, woodIdx.length));
    const byKind = TREASURES.map((_, k) => treasureIdx.filter((i) => items[i].kind === k));
    const kindMeshes = byKind.map((list, k) => new InstancedMesh(tGeos[k], shiny, Math.max(1, list.length)));
    const beams = new InstancedMesh(beamGeo, beamMat, Math.max(1, treasureIdx.length));
    const c = new Color();
    treasureIdx.forEach((i, b) => beams.setColorAt(b, c.set(RARITY_COLOR[TREASURES[items[i].kind as number].rarity])));
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (const m of [logs, beams, ...kindMeshes]) {
      for (let k = 0; k < m.count; k++) m.setMatrixAt(k, dummy.matrix);
      m.frustumCulled = false;
    }
    // slot of each item inside its instanced mesh
    const slot = new Int16Array(items.length);
    woodIdx.forEach((i, k) => (slot[i] = k));
    byKind.forEach((list) => list.forEach((i, k) => (slot[i] = k)));
    const beamSlot = new Int16Array(items.length).fill(-1);
    treasureIdx.forEach((i, k) => (beamSlot[i] = k));
    const state = new Uint8Array(items.length);
    /** Only uncovered logs are drawn: rewrite the compact instance list after any change. */
    const rebuildLogs = () => {
      let n = 0;
      for (const i of woodIdx) {
        if (state[i] !== SHOWN) continue;
        const it = items[i];
        dummy.position.set(it.x, 0, it.z);
        dummy.rotation.set(0, (i * 2.399) % Math.PI, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        logs.setMatrixAt(n++, dummy.matrix);
      }
      logs.count = n;
      logs.instanceMatrix.needsUpdate = true;
    };
    logs.count = 0;
    /** Remove item i from the world (picked up here or by a party member). */
    const hide = (i: number) => {
      const it = items[i];
      if (!it || state[i] === GONE) return;
      state[i] = GONE;
      it.collected = true;
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      if (it.kind === "wood") rebuildLogs();
      else {
        kindMeshes[it.kind].setMatrixAt(slot[i], dummy.matrix);
        kindMeshes[it.kind].instanceMatrix.needsUpdate = true;
        beams.setMatrixAt(beamSlot[i], dummy.matrix);
        beams.instanceMatrix.needsUpdate = true;
      }
      loot.version++;
    };
    return { hide, rebuildLogs, kindVisible: new Uint8Array(kindMeshes.length), items, flat, shiny, beamMat, logGeo, tGeos, beamGeo, logs, kindMeshes, beams, slot, beamSlot, state, woodIdx };
  }, []);

  useEffect(() => {
    // Party sync: items taken by others disappear; a lost race is undone.
    runHandlers.picked = (i) => r.hide(i);
    runHandlers.pickDenied = (i) => {
      const it = r.items[i];
      if (!it) return;
      if (it.kind === "wood") loot.carried = Math.max(0, loot.carried - 1);
      else {
        economy.cash = Math.max(0, economy.cash - it.value);
        economy.version++;
        const k = loot.found.findIndex((f) => f.kind === TREASURES[it.kind as number] && f.value === it.value);
        if (k >= 0) loot.found.splice(k, 1);
      }
      loot.version++;
    };
    const off = onRunSync((p) => {
      for (const i of p.picked) r.hide(i);
    });
    return () => {
      runHandlers.picked = runHandlers.pickDenied = null;
      off();
    };
  }, [r]);

  useEffect(
    () => () => {
      r.flat.dispose();
      r.shiny.dispose();
      r.beamMat.dispose();
      r.logGeo.dispose();
      r.beamGeo.dispose();
      r.tGeos.forEach((g) => g.dispose());
    },
    [r],
  );

  useFrame(({ clock }) => {
    const now = performance.now() / 1000;
    const t = clock.elapsedTime;
    const canPick = !cutscene.active && !progress.finished;
    let logsDirty = false;
    let beamsDirty = false;
    const kindVisible = r.kindVisible;
    kindVisible.fill(0);
    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i];
      const st = r.state[i];
      if (st === GONE) continue;
      const isWood = it.kind === "wood";
      if (st === HIDDEN) {
        if (it.cell >= 0 && fields[it.zone].isAlive(it.cell)) continue;
        r.state[i] = SHOWN;
        it.revealedAt = now;
        loot.version++;
        if (isWood) logsDirty = true;
        else if (Math.hypot(it.x - player.x, it.z - player.z) < REVEAL_SOUND_RANGE) sfx.reveal();
      }
      const d = Math.hypot(it.x - player.x, it.z - player.z);
      if (canPick && d < (isWood ? WOOD.pickupRadius : TREASURE.pickupRadius)) {
        if (isWood) {
          if (loot.carried >= CAMPFIRE.carryMax) {
            loot.carryFullUntil = now + 2;
          } else {
            loot.carried++;
            loot.lastWood = now;
            r.hide(i);
            sendPickup(i);
            sfx.woodPick();
            continue;
          }
        } else {
          const kind = TREASURES[it.kind as number];
          r.hide(i);
          sendPickup(i);
          const found = { kind, value: it.value, zone: it.zone };
          loot.found.push(found);
          loot.lastFind = { ...found, at: now };
          loot.version++;
          addCash(it.value);
          sfx.treasure(kind.rarity === "Legendary" || kind.rarity === "Epic");
          continue;
        }
      }
      if (!isWood) {
        // Revealed treasure: float, spin, pulse its beam.
        const k = it.kind as number;
        const pop = Math.min(1, (now - it.revealedAt) / 0.4);
        dummy.position.set(it.x, TREASURE.hover + Math.sin(t * 2 + i) * TREASURE.bob, it.z);
        dummy.rotation.set(0.25, t * TREASURE.spin + i, 0);
        dummy.scale.setScalar(TREASURE.scale * pop);
        dummy.updateMatrix();
        r.kindMeshes[k].setMatrixAt(r.slot[i], dummy.matrix);
        kindVisible[k] = 1;
        dummy.position.set(it.x, 0, it.z);
        dummy.rotation.set(0, t * 0.5, 0);
        dummy.scale.set(1 + Math.sin(t * 3 + i) * 0.15, pop, 1 + Math.sin(t * 3 + i) * 0.15);
        dummy.updateMatrix();
        r.beams.setMatrixAt(r.beamSlot[i], dummy.matrix);
        beamsDirty = true;
      }
    }
    if (logsDirty) r.rebuildLogs();
    if (beamsDirty) r.beams.instanceMatrix.needsUpdate = true;
    let anyBeam = false;
    r.kindMeshes.forEach((m, k) => {
      m.visible = kindVisible[k] === 1;
      if (kindVisible[k]) {
        m.instanceMatrix.needsUpdate = true;
        anyBeam = true;
      }
    });
    r.beams.visible = anyBeam;
  });

  return (
    <>
      <primitive object={r.logs} />
      <primitive object={r.beams} />
      {r.kindMeshes.map((m, k) => (
        <primitive key={TREASURES[k].id} object={m} />
      ))}
    </>
  );
}
