import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, type PointLight } from "three";
import { CAMPFIRE } from "../../config/night";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import { logGeometry } from "../loot/lootModels";
import { loot } from "../loot/loot";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { progress } from "../progress/progress";
import { dayNight } from "../time/dayNight";
import { sfx } from "../audio/sfx";
import { setAmbienceNight } from "../audio/ambience";
import { useQualityStore } from "../../store/qualityStore";
import { runHandlers } from "../../net/runNet";
import { addLog, campfireGlow, campfires, fireFull, isLit, logsIn, setBurn } from "./campfires";

const dummy = new Object3D();
const LIT_LOG = new Color("#4a3a30");
const RAW_LOG = new Color("#ffffff");
const EMBERS = 28;
const LIGHT_RANGE = 45;
/** Flames shrink during the last seconds of fuel. */
const DYING_SECONDS = 20;

export function flameGeometry() {
  const b = new PartBuilder(Infinity, mulberry32(8));
  // Outer tongues (red-orange -> orange), leaning in, different heights.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const h = b.rand(0.55, 1.15);
    const r = 0.2;
    b.cyl(0, b.rand(0.1, 0.16), h, 4, {
      pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r],
      rot: [Math.sin(a) * 0.25, a, -Math.cos(a) * 0.25],
      color: "#e8400c",
      top: "#ff9a2a",
      glow: true,
    });
  }
  // Middle body and a bright core.
  b.cyl(0, 0.3, 1.3, 6, { pos: [0, 0.65, 0], color: "#ff6a14", top: "#ffb02e", glow: true });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    b.cyl(0, 0.12, b.rand(0.6, 0.9), 4, { pos: [Math.cos(a) * 0.07, 0.35, Math.sin(a) * 0.07], color: "#ffd23f", top: "#fff6c0", glow: true });
  }
  return b.build().glow[0].geometry;
}

/**
 * Campfires: walk up to a pit with firewood and the logs go in (each log =
 * RUN_RULES.logSeconds of fire, shared with the party). A burning fire keeps
 * animals away, cooks meat and lights the camp. Draws logs (1 call), flames
 * (1), embers (1) and one flickering point light (not on LOW).
 */
export function CampfireSystem() {
  const preset = useQualityStore((s) => s.preset);
  const level = useQualityStore((s) => s.level);
  const light = useRef<PointLight>(null);
  const timers = useRef({ nextDeposit: 0, nextCrackle: 0 });

  const r = useMemo(() => {
    const fires = campfires.fires;
    const logMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const glowMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
    const emberMat = new MeshBasicMaterial({ color: "#ffb347", toneMapped: false, fog: false });
    const logGeo = logGeometry();
    const flameGeo = flameGeometry();
    const logs = new InstancedMesh(logGeo, logMat, fires.length * CAMPFIRE.woodToLight);
    const flames = new InstancedMesh(flameGeo, glowMat, fires.length * 2);
    const embers = new InstancedMesh(flameGeo, emberMat, EMBERS);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (const m of [logs, flames, embers]) {
      for (let i = 0; i < m.count; i++) m.setMatrixAt(i, dummy.matrix);
      m.frustumCulled = false;
    }
    for (let i = 0; i < logs.count; i++) logs.setColorAt(i, RAW_LOG);
    return { fires, logMat, glowMat, emberMat, logGeo, flameGeo, logs, flames, embers, shownLogs: new Int8Array(fires.length).fill(-1), shownLit: new Uint8Array(fires.length) };
  }, []);

  useEffect(() => {
    runHandlers.fire = (f, left) => setBurn(f, left);
    return () => {
      runHandlers.fire = null;
      r.logMat.dispose();
      r.glowMat.dispose();
      r.emberMat.dispose();
      r.logGeo.dispose();
      r.flameGeo.dispose();
    };
  }, [r]);

  useFrame(({ clock }, dt) => {
    const now = performance.now() / 1000;
    const t = clock.elapsedTime;
    const tm = timers.current;
    const active = !cutscene.active && !progress.finished;
    setAmbienceNight(dayNight.dark);

    let nearest = -1;
    let nearestD = Infinity;
    let nearLit = -1;
    let nearLitD = Infinity;
    for (let i = 0; i < r.fires.length; i++) {
      const f = r.fires[i];
      const wasLit = isLit(f);
      if (wasLit) f.burn = Math.max(0, f.burn - Math.min(dt, 0.1));
      if (wasLit && !isLit(f)) campfires.version++;
      const d = Math.hypot(f.x - player.x, f.z - player.z);
      if (d < nearestD) {
        nearestD = d;
        nearest = i;
      }
      const lit = isLit(f);
      if (lit && d < nearLitD) {
        nearLitD = d;
        nearLit = i;
      }
      // Logs - rewrite only when the count or lit state changed.
      const n = logsIn(f);
      if (r.shownLogs[i] !== n || r.shownLit[i] !== Number(lit)) {
        r.shownLogs[i] = n;
        r.shownLit[i] = Number(lit);
        for (let s = 0; s < CAMPFIRE.woodToLight; s++) {
          const a = (s / CAMPFIRE.woodToLight) * Math.PI * 2;
          dummy.position.set(f.x + Math.cos(a) * 0.2, 0.28, f.z + Math.sin(a) * 0.2);
          dummy.rotation.set(0, -a, 2.04);
          dummy.scale.setScalar(s < n ? 1 : 0);
          dummy.updateMatrix();
          const slot = i * CAMPFIRE.woodToLight + s;
          r.logs.setMatrixAt(slot, dummy.matrix);
          r.logs.setColorAt(slot, lit ? LIT_LOG : RAW_LOG);
        }
        r.logs.instanceMatrix.needsUpdate = true;
        if (r.logs.instanceColor) r.logs.instanceColor.needsUpdate = true;
      }
      // Flames: grow when lit, shrink as the fuel runs out.
      const grow = lit ? Math.min(1, (now - f.litAt) / 1.2) * Math.min(1, 0.35 + f.burn / DYING_SECONDS) : 0;
      for (let layer = 0; layer < 2; layer++) {
        const ph = i * 1.7 + layer * 2.3;
        const sc = layer ? 0.72 : 1;
        dummy.position.set(f.x, 0.08, f.z);
        dummy.rotation.set(Math.sin(t * 3.1 + ph) * 0.06, (layer ? -t * 1.3 : t * 0.9) + ph, Math.cos(t * 2.7 + ph) * 0.06);
        const fl = 1 + Math.sin(t * 13 + ph) * 0.12 + Math.sin(t * 7.3 + ph * 2) * 0.08;
        dummy.scale.set(grow * sc * (1 + Math.sin(t * 9 + ph) * 0.06), grow * sc * fl * (layer ? 1.25 : 1), grow * sc);
        dummy.updateMatrix();
        r.flames.setMatrixAt(i * 2 + layer, dummy.matrix);
      }
    }
    r.flames.instanceMatrix.needsUpdate = true;

    // Drop carried wood into the nearest pit (it catches fire right away).
    if (active && nearest >= 0 && loot.carried > 0 && nearestD < CAMPFIRE.depositRadius && now >= tm.nextDeposit) {
      const f = r.fires[nearest];
      if (!fireFull(f)) {
        const was = isLit(f);
        addLog(nearest);
        loot.carried--;
        loot.version++;
        tm.nextDeposit = now + CAMPFIRE.depositInterval;
        sfx.woodDrop();
        if (!was) sfx.ignite();
      }
    }

    // Safe zone + warmth.
    const lit = nearLit >= 0 ? r.fires[nearLit] : null;
    const fade = lit ? Math.min(1, (now - lit.litAt) / 1.5) * Math.min(1, 0.4 + lit.burn / DYING_SECONDS) : 0;
    campfireGlow.nearest = nearLit;
    campfireGlow.nearestDist = nearLitD;
    campfireGlow.safe = !!lit && nearLitD < CAMPFIRE.safeRadius;
    campfireGlow.amount = lit ? Math.max(0, 1 - nearLitD / CAMPFIRE.safeRadius) * fade : 0;

    // Point light on the nearest lit fire.
    const L = CAMPFIRE.light;
    if (light.current) {
      if (lit && nearLitD < LIGHT_RANGE) {
        light.current.position.set(lit.x, L.height, lit.z);
        light.current.intensity = L.intensity * fade * (1 + Math.sin(t * 11) * L.flicker * 0.6 + Math.sin(t * 23.7) * L.flicker * 0.4);
      } else light.current.intensity = 0;
    }

    // Embers rising from the nearest lit fire (pooled; time-driven, no state).
    if (preset.particleCap > 0 && lit && nearLitD < LIGHT_RANGE) {
      r.embers.visible = true;
      for (let e = 0; e < EMBERS; e++) {
        const life = (t * (0.35 + (e % 5) * 0.05) + e * 0.137) % 1;
        const a = e * 2.4 + t * 0.6;
        dummy.position.set(lit.x + Math.cos(a) * (0.15 + life * 0.5), 0.5 + life * 3.2, lit.z + Math.sin(a) * (0.15 + life * 0.5));
        dummy.rotation.set(t * 3 + e, e, 0);
        dummy.scale.setScalar(0.05 * (1 - life) * fade);
        dummy.updateMatrix();
        r.embers.setMatrixAt(e, dummy.matrix);
      }
      r.embers.instanceMatrix.needsUpdate = true;
    } else r.embers.visible = false;

    // Crackle.
    if (lit && nearLitD < CAMPFIRE.crackleRange && now >= tm.nextCrackle) {
      sfx.crackle((1 - nearLitD / CAMPFIRE.crackleRange) * fade);
      const [lo, hi] = CAMPFIRE.crackleGap;
      tm.nextCrackle = now + lo + Math.random() * (hi - lo);
    }
  });

  const L = CAMPFIRE.light;
  return (
    <>
      <primitive object={r.logs} />
      <primitive object={r.flames} />
      <primitive object={r.embers} />
      {level !== "LOW" && <pointLight ref={light} color={L.color} intensity={0} distance={L.distance} decay={L.decay} />}
    </>
  );
}
