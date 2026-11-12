import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, MeshLambertMaterial, Object3D } from "three";
import { leafTemplate } from "../world/geo/leaf";
import { LEAF_PARTICLES as LP, PLANT_TYPES } from "../config/grass";

/** Hard pool cap (HIGH preset); the active cap comes from preset.particleCap. */
const POOL = 300;
const pos = new Float32Array(POOL * 3);
const vel = new Float32Array(POOL * 3);
const rot = new Float32Array(POOL * 3);
const life = new Float32Array(POOL);
const tintIdx = new Uint8Array(POOL);
const fresh = new Uint8Array(POOL);
let cap = 0;

/** All plants' tints in one palette; per plant the indices into it. */
const ALL_TINTS: string[] = [];
const PLANT_TINT_INDEX: Record<number, number[]> = {};
for (const p of Object.values(PLANT_TYPES)) {
  PLANT_TINT_INDEX[p.id] = p.tints.map((t) => ALL_TINTS.push(t) - 1);
}
let next = 0;

/**
 * Spawn cut-leaf particles (ring buffer: the oldest particle is reused).
 * No-op on LOW (cap 0). Safe to call from useFrame: it only writes typed arrays.
 */
export function spawnLeaves(x: number, y: number, z: number, n: number, plantId = 1) {
  const tints = PLANT_TINT_INDEX[plantId] ?? PLANT_TINT_INDEX[1];
  for (let k = 0; k < n && cap > 0; k++) {
    const i = next;
    next = (next + 1) % cap;
    const a = Math.random() * Math.PI * 2;
    const out = Math.random() * LP.outSpeed;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    vel[i * 3] = Math.cos(a) * out;
    vel[i * 3 + 1] = LP.upSpeed[0] + Math.random() * (LP.upSpeed[1] - LP.upSpeed[0]);
    vel[i * 3 + 2] = Math.sin(a) * out;
    rot[i * 3] = Math.random() * 6.28;
    rot[i * 3 + 1] = Math.random() * 6.28;
    rot[i * 3 + 2] = Math.random() * 6.28;
    life[i] = LP.life;
    tintIdx[i] = tints[Math.floor(Math.random() * tints.length)];
    fresh[i] = 1;
  }
}

export function LeafParticles({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => leafTemplate(), []);
  const material = useMemo(() => new MeshLambertMaterial({ flatShading: true }), []);
  const tints = useMemo(() => ALL_TINTS.map((t) => new Color(t)), []);
  const active = Math.min(count, POOL);

  useEffect(() => {
    cap = active;
    next = 0;
    life.fill(0);
    return () => {
      cap = 0;
    };
  }, [active]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < active; i++) {
      if (life[i] <= 0 && !fresh[i]) continue;
      if (fresh[i]) {
        m.setColorAt(i, tints[tintIdx[i]]);
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        fresh[i] = 0;
      }
      life[i] -= step;
      const o = i * 3;
      vel[o + 1] -= LP.gravity * step;
      pos[o] += vel[o] * step;
      pos[o + 1] = Math.max(0.02, pos[o + 1] + vel[o + 1] * step);
      pos[o + 2] += vel[o + 2] * step;
      rot[o] += LP.spin * step;
      rot[o + 2] += LP.spin * 0.6 * step;
      dummy.position.set(pos[o], pos[o + 1], pos[o + 2]);
      dummy.rotation.set(rot[o], rot[o + 1], rot[o + 2]);
      dummy.scale.setScalar(life[i] > 0 ? LP.size * Math.min(1, life[i] * 3) : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (active <= 0) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, material, active]} frustumCulled={false} onUpdate={(m) => m.instanceMatrix.array.fill(0)} />
  );
}
