import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
} from "three";
import { LOBBY_VIEW as L } from "../../config/lobby";
import { PartBuilder } from "../geo/PartBuilder";
import { mulberry32 } from "../geo/rng";
import { player } from "../../game/player/FirstPersonController";
import { sfx } from "../../game/audio/sfx";
import { useQualityStore } from "../../store/qualityStore";

const dummy = new Object3D();
const ARROW = new Color("#d6ff4a");
const tint = new Color();

function chevron() {
  const b = new PartBuilder(Infinity, mulberry32(71));
  for (const s of [-1, 1]) b.box([0.22, 0.03, 1.0], { pos: [s * 0.3, 0, 0.2], rot: [0, s * 0.75, 0], color: "#ffffff", glow: true });
  return b.build().glow[0].geometry;
}

function mushroomCap() {
  const b = new PartBuilder(Infinity, mulberry32(72));
  b.ico(1.15, 1, { pos: [0, 0, 0], scale: [1, 0.55, 1], color: "#d63a3a", top: "#ff5a4a" });
  b.cyl(1.0, 1.0, 0.12, 12, { pos: [0, -0.18, 0], color: "#f3e6c4" });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
    const r = i % 3 === 0 ? 0.25 : 0.72;
    b.ico(0.17, 0, { pos: [Math.cos(a) * r, 0.5 - r * 0.32, Math.sin(a) * r], scale: [1, 0.4, 1], color: "#ffffff" });
  }
  return b.build().solid[0].geometry;
}

const WATER_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float fall = 1.0 - uv.y;
  p.z += pow(max(0.0, uv.y - 0.72), 2.0) * 3.2; // curls over the lip at the top
  p.x *= 1.0 + fall * fall * 0.35; // spreads out as it falls
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const WATER_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float fall = 1.0 - vUv.y;
  // Water accelerates as it falls: stretch the pattern lower down.
  float flow = fall * 2.2 + fall * fall * 2.6 - uTime * 1.9;
  float n1 = noise(vec2(vUv.x * 16.0, flow * 3.0));
  float n2 = noise(vec2(vUv.x * 7.0 + 3.1, flow * 1.4 - uTime * 0.4));
  float streak = smoothstep(0.55, 0.95, n1 * 0.65 + n2 * 0.5);
  vec3 deep = vec3(0.12, 0.42, 0.55);
  vec3 light = vec3(0.55, 0.82, 0.9);
  vec3 col = mix(deep, light, n2 * 0.6 + 0.2);
  col = mix(col, vec3(0.96, 0.99, 1.0), streak * 0.75);
  // White water at the lip and churning foam at the bottom.
  float lip = smoothstep(0.88, 1.0, vUv.y);
  float foam = smoothstep(0.16, 0.0, vUv.y) * (0.6 + 0.4 * noise(vec2(vUv.x * 10.0, uTime * 3.0)));
  col = mix(col, vec3(1.0), max(lip * 0.6, foam));
  // Ragged, see-through edges.
  float rag = noise(vec2(vUv.y * 9.0 - uTime * 2.0, 1.7)) * 0.12;
  float edge = smoothstep(0.0, 0.14 + rag, vUv.x) * smoothstep(1.0, 0.86 - rag, vUv.x);
  gl_FragColor = vec4(col, (0.35 + 0.55 * streak + 0.3 * foam) * edge);
}`;

/**
 * Lobby fun + life: pulsing arrows to the pads, bouncy mushrooms (stand on
 * one to fly) and the animated waterfall (falling water, foam, mist, pool
 * ripples). ~7 draw calls; foam/mist scale with the quality preset.
 */
export function LobbyFun() {
  const level = useQualityStore((s) => s.level);
  const foamN = level === "LOW" ? 10 : 22;

  const r = useMemo(() => {
    const w = L.waterfall;
    const a = L.arrows;
    const arrowN = Math.floor((a.fromZ - a.toZ) / a.step) + 1;
    const glow = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const arrows = new InstancedMesh(chevron(), glow, arrowN);
    for (let i = 0; i < arrowN; i++) {
      dummy.position.set(a.x, 0.07, a.fromZ - i * a.step);
      dummy.rotation.set(0, 0, 0); // chevron tip points north (-Z), toward the pads
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      arrows.setMatrixAt(i, dummy.matrix);
      arrows.setColorAt(i, ARROW);
    }
    const capMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const caps = new InstancedMesh(mushroomCap(), capMat, L.mushrooms.length);
    const waterMat = new ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false });
    const sheet = new Mesh(new PlaneGeometry(w.fallWidth, w.height, 6, 20), waterMat);
    sheet.position.set(w.x, w.height / 2, w.z + 1.2);
    const foamMat = new MeshBasicMaterial({ color: "#f4fbff", transparent: true, opacity: 0.9 });
    const foam = new InstancedMesh(new IcosahedronGeometry(0.28, 0), foamMat, 22);
    const mistMat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.16, depthWrite: false });
    const mist = new InstancedMesh(new IcosahedronGeometry(1, 1), mistMat, 5);
    const ringMat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false });
    const rings = new InstancedMesh(new RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), ringMat, 3);
    for (const m of [arrows, caps, foam, mist, rings]) m.frustumCulled = false;
    return { arrows, caps, sheet, foam, mist, rings, glow, capMat, waterMat, foamMat, mistMat, ringMat, squash: new Float32Array(L.mushrooms.length).fill(-1), arrowN };
  }, []);

  useEffect(
    () => () => {
      for (const m of [r.arrows, r.caps, r.foam, r.mist, r.rings, r.sheet]) m.geometry.dispose();
      for (const m of [r.glow, r.capMat, r.waterMat, r.foamMat, r.mistMat, r.ringMat]) m.dispose();
    },
    [r],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const w = L.waterfall;
    // Arrows: a wave of light running toward the pads.
    for (let i = 0; i < r.arrowN; i++) {
      const k = Math.pow(Math.max(0, Math.sin(t * 4 - i * 0.7)), 2);
      r.arrows.setColorAt(i, tint.copy(ARROW).multiplyScalar(0.3 + 0.9 * k));
    }
    if (r.arrows.instanceColor) r.arrows.instanceColor.needsUpdate = true;
    // Mushrooms: bounce the player, squash the cap.
    L.mushrooms.forEach(([x, z], i) => {
      if (Math.hypot(player.x - x, player.z - z) < L.bounce.radius && player.y < 1.2 && player.vy <= 0.5) {
        player.vy = L.bounce.velocity;
        player.grounded = false;
        r.squash[i] = 0;
        sfx.boing();
      }
      let sy = 1;
      let sxz = 1;
      if (r.squash[i] >= 0) {
        r.squash[i] += Math.min(dt, 0.05);
        const u = r.squash[i] / 0.45;
        if (u >= 1) r.squash[i] = -1;
        else {
          const wob = Math.sin(u * Math.PI * 3) * (1 - u);
          sy = 1 - 0.35 * wob;
          sxz = 1 + 0.2 * wob;
        }
      }
      dummy.position.set(x, 1.12, z);
      dummy.rotation.set(0, i, 0);
      dummy.scale.set(sxz, sy, sxz);
      dummy.updateMatrix();
      r.caps.setMatrixAt(i, dummy.matrix);
    });
    r.caps.instanceMatrix.needsUpdate = true;
    // Waterfall.
    r.waterMat.uniforms.uTime.value = t;
    for (let i = 0; i < foamN; i++) {
      const u = (t * 0.8 + i * 0.137) % 1;
      const a = i * 2.39;
      const d = 0.4 + u * 1.8;
      dummy.position.set(w.x + Math.cos(a) * d * 1.3, 0.15 + Math.sin(u * Math.PI) * 0.6, w.z + 1.6 + Math.abs(Math.sin(a)) * d);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.6 + (1 - u) * 0.9);
      dummy.updateMatrix();
      r.foam.setMatrixAt(i, dummy.matrix);
    }
    r.foam.count = foamN;
    for (let i = 0; i < 5; i++) {
      dummy.position.set(w.x + (i - 2) * 1.1, 0.8 + Math.sin(t * 0.7 + i) * 0.3, w.z + 2.2);
      dummy.scale.setScalar(1.3 + Math.sin(t * 1.3 + i * 2) * 0.3);
      dummy.updateMatrix();
      r.mist.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i / 3) % 1;
      dummy.position.set(w.x, 0.11, w.poolZ - 1.5);
      dummy.scale.setScalar(1 + u * (w.poolR - 1.5));
      dummy.updateMatrix();
      r.rings.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [r.foam, r.mist, r.rings]) m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={r.arrows} />
      <primitive object={r.caps} />
      <primitive object={r.sheet} />
      <primitive object={r.foam} />
      <primitive object={r.mist} />
      <primitive object={r.rings} />
    </>
  );
}
