import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, IcosahedronGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from "three";
import { SMOKE } from "../config/cutscene";

// Pooled smoke/dust puffs (hard cap SMOKE.pool). Module-level so the cutscene
// can move the emitter and fire bursts without React state.
const pos = new Float32Array(SMOKE.pool * 3);
const vel = new Float32Array(SMOKE.pool * 3);
const life = new Float32Array(SMOKE.pool);
const colorIdx = new Uint8Array(SMOKE.pool);
const fresh = new Uint8Array(SMOKE.pool);
let next = 0;

/** Continuous emitter (engine trail, then the wreck). rate 0 = off. */
export const smokeEmitter = { x: 0, y: 0, z: 0, rate: 0, acc: 0 };

function spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, dust: boolean) {
  const i = next;
  next = (next + 1) % SMOKE.pool;
  pos.set([x, y, z], i * 3);
  vel.set([vx, vy, vz], i * 3);
  life[i] = SMOKE.life;
  colorIdx[i] = (dust ? 10 : 0) + Math.floor(Math.random() * 3);
  fresh[i] = 1;
}

/** Ring of dust thrown out on impact. */
export function dustBurst(x: number, y: number, z: number) {
  for (let k = 0; k < SMOKE.dustBurst; k++) {
    const a = (k / SMOKE.dustBurst) * Math.PI * 2;
    const s = 3 + Math.random() * 4;
    spawn(x, y, z, Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s, true);
  }
}

/** Rendered only when the quality preset allows particles. */
export function SmokeParticles() {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new MeshLambertMaterial({ flatShading: true }), []);
  const palette = useMemo(() => {
    const p: Color[] = [];
    SMOKE.colors.forEach((c, i) => (p[i] = new Color(c)));
    SMOKE.dust.forEach((c, i) => (p[10 + i] = new Color(c)));
    return p;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      smokeEmitter.rate = 0;
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const step = Math.min(dt, 0.05);
    if (smokeEmitter.rate > 0) {
      smokeEmitter.acc += smokeEmitter.rate * step;
      while (smokeEmitter.acc >= 1) {
        smokeEmitter.acc -= 1;
        spawn(
          smokeEmitter.x + (Math.random() - 0.5) * 0.6,
          smokeEmitter.y,
          smokeEmitter.z + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          SMOKE.rise * (0.7 + Math.random() * 0.6),
          (Math.random() - 0.5) * 0.6,
          false,
        );
      }
    }
    for (let i = 0; i < SMOKE.pool; i++) {
      if (life[i] <= 0 && !fresh[i]) continue;
      if (fresh[i]) {
        m.setColorAt(i, palette[colorIdx[i]]);
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        fresh[i] = 0;
      }
      life[i] -= step;
      const o = i * 3;
      vel[o] *= 1 - step * 1.5;
      vel[o + 2] *= 1 - step * 1.5;
      pos[o] += vel[o] * step;
      pos[o + 1] += vel[o + 1] * step;
      pos[o + 2] += vel[o + 2] * step;
      const t = 1 - Math.max(0, life[i]) / SMOKE.life;
      const size = life[i] > 0 ? (SMOKE.startSize + (SMOKE.endSize - SMOKE.startSize) * t) * Math.min(1, (1 - t) * 3) : 0;
      dummy.position.set(pos[o], pos[o + 1], pos[o + 2]);
      dummy.rotation.set(t * 2, t * 3, 0);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, material, SMOKE.pool]} frustumCulled={false} onUpdate={(im) => im.instanceMatrix.array.fill(0)} />
  );
}
