import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Object3D } from "three";
import { ANIMALS, AS } from "../../config/animals";
import type { Region } from "../player/collision";
import { player } from "../player/FirstPersonController";
import { remotePlayers } from "../../net/remotePlayers";
import { isRunHost, runHandlers, runNet, sendAnimals } from "../../net/runNet";
import { cutscene } from "../../cutscene/cutsceneState";
import { progress } from "../progress/progress";
import { isSafeAt } from "../campfire/campfires";
import { addFood, hurt, note, survival } from "../survival/survival";
import { sfx } from "../audio/sfx";
import { animals, applyHit, packAnimals, resetAnimals, unpackAnimals } from "./animals";
import { hostTick, resetAI, type Prey } from "./animalAI";
import { boarParts, jaguarParts, monkeyParts, type Species } from "./animalModels";

const dummy = new Object3D();
const mA = new Matrix4();
const mL = new Matrix4();
const mR = new Matrix4();
const WHITE = new Color("#ffffff");
const HIT = new Color("#ff6a5a");

interface SpeciesMeshes {
  parts: Species;
  body: InstancedMesh;
  legs: InstancedMesh;
  tail: InstancedMesh | null;
  eyes: InstancedMesh | null;
}

/**
 * Boars and jaguars: the run host simulates them (animalAI) and broadcasts
 * snapshots; others smooth toward them. Renders every species with instanced
 * parts (body, legs, tail): <= 5 draw calls for all animals.
 */
export function AnimalSystem({ region }: { region: Region }) {
  const r = useMemo(() => {
    const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    // Unlit, unfogged: a jaguar's eyes shine in the dark.
    const glow = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
    const make = (parts: Species): SpeciesMeshes => {
      const n = ANIMALS.pool;
      const body = new InstancedMesh(parts.body, material, n);
      const legs = new InstancedMesh(parts.leg, material, n * 4);
      const tail = parts.tail ? new InstancedMesh(parts.tail, material, n) : null;
      const eyes = parts.eyes ? new InstancedMesh(parts.eyes, glow, n) : null;
      for (const m of [body, legs, tail, eyes]) if (m) m.frustumCulled = false;
      for (let i = 0; i < n; i++) body.setColorAt(i, WHITE);
      return { parts, body, legs, tail, eyes };
    };
    const species = [make(boarParts()), make(jaguarParts()), make(monkeyParts())];
    // Reused prey objects (local player + up to 3 party members).
    const prey: Prey[] = Array.from({ length: 4 }, () => ({ sid: "", x: 0, z: 0, safe: false }));
    return { material, glow, species, prey, preyList: [] as Prey[], packed: [] as number[], nextSend: 0 };
  }, []);

  useEffect(() => {
    resetAnimals();
    resetAI();
    runHandlers.animals = (data) => {
      if (!isRunHost()) unpackAnimals(data);
    };
    runHandlers.hit = (id, dmg, sid) => {
      const a = animals.list.find((q) => q.id === id);
      if (a && isRunHost()) applyHit(a, dmg, sid);
    };
    runHandlers.bite = (dmg) => hurt(dmg);
    runHandlers.meat = (n) => {
      const got = addFood("rawMeat", n);
      if (got) note(`+${got} 🥩 raw meat: cook it at a campfire`);
      sfx.pickupMeat();
    };
    return () => {
      runHandlers.animals = runHandlers.hit = runHandlers.bite = runHandlers.meat = null;
      resetAnimals();
      r.material.dispose();
      r.glow.dispose();
      for (const s of r.species) {
        s.parts.body.dispose();
        s.parts.leg.dispose();
        s.parts.tail?.dispose();
        s.parts.eyes?.dispose();
      }
    };
  }, [r]);

  useFrame((_, dt) => {
    const now = performance.now() / 1000;
    const host = isRunHost();
    if (host) {
      if (!cutscene.active && !progress.finished) {
        // Who the animals can see: me (unless passed out) + party members in this run.
        const list = r.preyList;
        list.length = 0;
        let k = 0;
        if (!survival.faintAt) {
          const p = r.prey[k++];
          p.sid = runNet.me;
          p.x = player.x;
          p.z = player.z;
          p.safe = isSafeAt(p.x, p.z);
          list.push(p);
        }
        for (const rp of remotePlayers.values()) {
          if (!rp.here || k >= r.prey.length) continue;
          const p = r.prey[k++];
          p.sid = rp.id;
          p.x = rp.x;
          p.z = rp.z;
          p.safe = isSafeAt(p.x, p.z);
          list.push(p);
        }
        hostTick(Math.min(dt, 0.1), now, list, region);
      }
      if (runNet.online && now >= r.nextSend) {
        r.nextSend = now + 1 / ANIMALS.netHz;
        sendAnimals(packAnimals(r.packed));
      }
    } else {
      // Smooth toward the host's snapshot.
      const k = 1 - Math.exp(-ANIMALS.smoothing * dt);
      for (const a of animals.list) {
        const dx = (a.nx - a.x) * k;
        const dz = (a.nz - a.z) * k;
        a.x += dx;
        a.z += dz;
        a.yaw += Math.atan2(Math.sin(a.nyaw - a.yaw), Math.cos(a.nyaw - a.yaw)) * k;
        a.speed += (Math.hypot(dx, dz) / Math.max(dt, 1e-4) - a.speed) * Math.min(1, dt * 6);
      }
    }
    draw(r.species, dt, now);
  });

  return (
    <>
      {r.species.map((s, i) => (
        <group key={i}>
          <primitive object={s.body} />
          <primitive object={s.legs} />
          {s.tail && <primitive object={s.tail} />}
          {s.eyes && <primitive object={s.eyes} />}
        </group>
      ))}
    </>
  );
}

const used = new Int8Array(3);

function draw(species: SpeciesMeshes[], dt: number, now: number) {
  used.fill(0);
  for (const a of animals.list) {
    const s = species[a.kind];
    const slot = used[a.kind];
    if (slot >= ANIMALS.pool) continue;
    used[a.kind]++;
    const dead = a.state === AS.Dead;
    const age = dead ? now - a.deadAt : 0;
    a.phase += dt * Math.min(a.speed, 8) * s.parts.stepFreq;
    const sink = dead ? -Math.max(0, age - 2.5) * 0.4 : 0;
    dummy.position.set(a.x, sink, a.z);
    dummy.rotation.set(0, a.yaw, dead ? Math.min(1, age * 3) * (Math.PI / 2) : 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mA.copy(dummy.matrix);
    s.body.setMatrixAt(slot, mA);
    s.eyes?.setMatrixAt(slot, mA);
    s.body.setColorAt(slot, now - a.hitAt < ANIMALS.hitFlash ? HIT : WHITE);
    const amp = dead ? 0 : Math.min(1, a.speed / 3) * s.parts.legSwing;
    for (let l = 0; l < 4; l++) {
      const h = s.parts.hips[l];
      const sw = Math.sin(a.phase + (l === 0 || l === 3 ? 0 : Math.PI)) * amp;
      mR.makeRotationX(sw);
      mR.setPosition(h[0], h[1], h[2]);
      mL.multiplyMatrices(mA, mR);
      s.legs.setMatrixAt(slot * 4 + l, mL);
    }
    if (s.tail) {
      const tb = s.parts.tailBase;
      mR.makeRotationY(Math.sin(now * 2.2 + a.id) * 0.4);
      mL.makeRotationX(-0.5 + Math.sin(now * 1.3 + a.id) * 0.15);
      mR.multiply(mL);
      mR.setPosition(tb[0], tb[1], tb[2]);
      mL.multiplyMatrices(mA, mR);
      s.tail.setMatrixAt(slot, mL);
    }
  }
  // Hide unused slots.
  dummy.scale.setScalar(0);
  dummy.position.set(0, -50, 0);
  dummy.updateMatrix();
  species.forEach((s, k) => {
    for (let i = used[k]; i < ANIMALS.pool; i++) {
      s.body.setMatrixAt(i, dummy.matrix);
      for (let l = 0; l < 4; l++) s.legs.setMatrixAt(i * 4 + l, dummy.matrix);
      s.tail?.setMatrixAt(i, dummy.matrix);
      s.eyes?.setMatrixAt(i, dummy.matrix);
    }
    const any = used[k] > 0;
    s.body.visible = s.legs.visible = any;
    if (s.tail) s.tail.visible = any;
    if (s.eyes) {
      s.eyes.visible = any;
      s.eyes.instanceMatrix.needsUpdate = true;
    }
    s.body.instanceMatrix.needsUpdate = true;
    if (s.body.instanceColor) s.body.instanceColor.needsUpdate = true;
    s.legs.instanceMatrix.needsUpdate = true;
    if (s.tail) s.tail.instanceMatrix.needsUpdate = true;
  });
}

