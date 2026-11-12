import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshBasicMaterial, Object3D } from "three";
import { EYES } from "../../config/night";
import { CAMP1 } from "../../config/camp1";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import { inZones } from "../../world/zones/buildZones";
import { player } from "../player/FirstPersonController";
import { dayNight } from "../time/dayNight";
import { campfireGlow } from "../campfire/campfires";
import { cutscene } from "../../cutscene/cutsceneState";
import { progress } from "../progress/progress";
import { sfx } from "../audio/sfx";

const dummy = new Object3D();
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function eyePairGeometry() {
  const b = new PartBuilder(Infinity, mulberry32(66));
  for (const s of [-1, 1]) {
    b.ico(1, 1, { pos: [s * (EYES.spacing / EYES.size / 2), 0, 0], scale: [1.25, 0.8, 0.5], color: EYES.color, glow: true });
  }
  return b.build().glow[0].geometry;
}

/**
 * Night creatures: pairs of glowing eyes that open in the treeline around the
 * player, watch, blink and vanish when approached. Never inside the safe
 * radius of a lit campfire. Pooled (EYES.max instances, 1 draw call).
 */
export function NightEyes() {
  const r = useMemo(() => {
    const geo = eyePairGeometry();
    // No depth test: the eyes glow through the leaves of the treeline they hide in.
    const mat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false, depthTest: false, depthWrite: false });
    const mesh = new InstancedMesh(geo, mat, EYES.max);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10;
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < EYES.max; i++) mesh.setMatrixAt(i, dummy.matrix);
    const pool = new Float32Array(EYES.max * 6); // x, y, z, born, life, blinkPhase
    const alive = new Uint8Array(EYES.max);
    return { geo, mat, mesh, pool, alive, nextSpawn: 0, nextBeat: 0 };
  }, []);

  useEffect(() => {
    // Dev only: automated checks count open eyes.
    if (import.meta.env.DEV) Object.assign(window, { __eyes: r.alive, __eyePool: r.pool, __eyeMesh: r.mesh });
  }, [r]);

  useEffect(
    () => () => {
      r.geo.dispose();
      r.mat.dispose();
    },
    [r],
  );

  useFrame(() => {
    const now = performance.now() / 1000;
    const night = dayNight.dark >= EYES.minDarkness && !cutscene.active && !progress.finished;
    let closest = Infinity;

    // Spawn at the jungle edge around the player.
    if (night && !campfireGlow.safe && now >= r.nextSpawn) {
      r.nextSpawn = now + rand(EYES.spawnGap[0], EYES.spawnGap[1]);
      const slot = r.alive.indexOf(0);
      if (slot >= 0) {
        for (let tries = 0; tries < 12; tries++) {
          // Mostly where the player is looking (so they get noticed), sometimes anywhere.
          const ahead = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw));
          const a = Math.random() < EYES.inViewChance ? ahead + (Math.random() - 0.5) * EYES.viewCone : Math.random() * Math.PI * 2;
          const d = rand(EYES.distance[0], EYES.distance[1]);
          const x = player.x + Math.cos(a) * d;
          const z = player.z + Math.sin(a) * d;
          // Just inside the treeline: outside every walkable area, but close to one.
          const camp = Math.hypot(x, z);
          if (inZones(x, z, 1.5) || camp < CAMP1.boundRadius + 1) continue;
          if (!inZones(x, z, EYES.edgeDepth) && camp > CAMP1.boundRadius + EYES.edgeDepth) continue;
          const o = slot * 6;
          r.pool[o] = x;
          r.pool[o + 1] = rand(EYES.height[0], EYES.height[1]);
          r.pool[o + 2] = z;
          r.pool[o + 3] = now;
          r.pool[o + 4] = rand(EYES.life[0], EYES.life[1]);
          r.pool[o + 5] = Math.random() * 10;
          r.alive[slot] = 1;
          if (Math.random() < EYES.growlChance) sfx.growl(Math.max(0.2, 1 - d / EYES.distance[1]));
          break;
        }
      }
    }

    let any = false;
    for (let i = 0; i < EYES.max; i++) {
      if (!r.alive[i]) continue;
      const o = i * 6;
      const x = r.pool[o];
      const z = r.pool[o + 2];
      const age = now - r.pool[o + 3];
      const life = r.pool[o + 4];
      const d = Math.hypot(x - player.x, z - player.z);
      if (age > life || d < EYES.vanishDistance || !night || campfireGlow.safe) {
        r.alive[i] = 0;
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        r.mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      any = true;
      closest = Math.min(closest, d);
      const open = Math.min(1, age / 0.5, (life - age) / 0.4);
      const blink = Math.sin(now * 1.7 + r.pool[o + 5]) > 0.96 ? 0.1 : 1;
      dummy.position.set(x, r.pool[o + 1], z);
      dummy.rotation.set(0, Math.atan2(player.x - x, player.z - z), 0);
      dummy.scale.set(EYES.size, EYES.size * open * blink, EYES.size);
      dummy.updateMatrix();
      r.mesh.setMatrixAt(i, dummy.matrix);
    }
    r.mesh.instanceMatrix.needsUpdate = true;
    r.mesh.visible = any;

    // Heartbeat while something watches from close by.
    if (closest < EYES.heartbeatRange && now >= r.nextBeat) {
      sfx.heartbeat(1 - closest / EYES.heartbeatRange);
      r.nextBeat = now + 0.55 + (closest / EYES.heartbeatRange) * 0.6;
    }
  });

  return <primitive object={r.mesh} />;
}
