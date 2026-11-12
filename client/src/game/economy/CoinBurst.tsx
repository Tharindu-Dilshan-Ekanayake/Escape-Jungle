import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from "three";
import { COINS } from "../../config/economy";
import { PALETTE } from "../../config/palette";

// Pooled coin particles (hard cap COINS.pool); spawned by the grinder.
const pos = new Float32Array(COINS.pool * 3);
const vel = new Float32Array(COINS.pool * 3);
const life = new Float32Array(COINS.pool);
const spin = new Float32Array(COINS.pool);
let next = 0;

/** Burst of coins at (x, y, z). Only writes typed arrays (safe from useFrame). */
export function spawnCoins(x: number, y: number, z: number, n = COINS.perSale) {
  for (let k = 0; k < n; k++) {
    const i = next;
    next = (next + 1) % COINS.pool;
    const a = Math.random() * Math.PI * 2;
    const out = Math.random() * COINS.outSpeed;
    pos.set([x, y, z], i * 3);
    vel.set([Math.cos(a) * out, COINS.upSpeed[0] + Math.random() * (COINS.upSpeed[1] - COINS.upSpeed[0]), Math.sin(a) * out], i * 3);
    life[i] = COINS.life;
    spin[i] = Math.random() * 6;
  }
}

export function CoinBurst() {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new CylinderGeometry(1, 1, 0.25, 10).rotateX(Math.PI / 2), []);
  const material = useMemo(() => new MeshLambertMaterial({ color: PALETTE.gold, emissive: "#6b4a00" }), []);
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
    let any = false;
    for (let i = 0; i < COINS.pool; i++) {
      if (life[i] <= 0) {
        if (spin[i] !== -1) {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          spin[i] = -1;
          any = true;
        }
        continue;
      }
      any = true;
      life[i] -= step;
      const o = i * 3;
      vel[o + 1] -= COINS.gravity * step;
      pos[o] += vel[o] * step;
      pos[o + 1] = Math.max(0.05, pos[o + 1] + vel[o + 1] * step);
      pos[o + 2] += vel[o + 2] * step;
      spin[i] += step * 10;
      dummy.position.set(pos[o], pos[o + 1], pos[o + 2]);
      dummy.rotation.set(0, spin[i], 0);
      dummy.scale.setScalar(COINS.size * Math.min(1, life[i] * 4));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    if (any) m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, COINS.pool]}
      frustumCulled={false}
      onUpdate={(m) => m.instanceMatrix.array.fill(0)}
    />
  );
}
