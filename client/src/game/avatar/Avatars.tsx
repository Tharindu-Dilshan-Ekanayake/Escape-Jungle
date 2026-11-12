import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CircleGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Vector3 } from "three";
import { ROOM_LIMITS } from "@shared";
import { AVATAR } from "../../config/lobby";
import { remotePlayers, stepRemote, type AvatarColors } from "../../net/remotePlayers";
import { player } from "../player/FirstPersonController";

type ColorKey = "skin" | "shirt" | "pants" | "eyes";
type Swing = 0 | 1 | -1;

/** Blocky avatar parts: size, pivot (feet = 0, front = -Z), hang offset for limbs, swing sign. */
const PARTS: { c: ColorKey; size: [number, number, number]; pivot: [number, number, number]; hang: number; swing: Swing }[] = [
  { c: "shirt", size: [0.9, 0.9, 0.45], pivot: [0, 1.35, 0], hang: 0, swing: 0 },
  { c: "skin", size: [0.62, 0.62, 0.62], pivot: [0, 2.12, 0], hang: 0, swing: 0 },
  { c: "shirt", size: [0.34, 0.86, 0.34], pivot: [-0.63, 1.78, 0], hang: -0.43, swing: 1 },
  { c: "shirt", size: [0.34, 0.86, 0.34], pivot: [0.63, 1.78, 0], hang: -0.43, swing: -1 },
  { c: "pants", size: [0.42, 0.9, 0.42], pivot: [-0.22, 0.9, 0], hang: -0.45, swing: -1 },
  { c: "pants", size: [0.42, 0.9, 0.42], pivot: [0.22, 0.9, 0], hang: -0.45, swing: 1 },
  { c: "eyes", size: [0.09, 0.13, 0.02], pivot: [-0.13, 2.17, -0.315], hang: 0, swing: 0 },
  { c: "eyes", size: [0.09, 0.13, 0.02], pivot: [0.13, 2.17, -0.315], hang: 0, swing: 0 },
];
const MAX_AVATARS = ROOM_LIMITS.lobbyMaxClients;

// Scratch objects (never allocated per frame).
const base = new Matrix4();
const m = new Matrix4();
const t = new Matrix4();
const SHADOW_Y = 0.075;
const scaleVec = new Vector3(AVATAR.scale, AVATAR.scale, AVATAR.scale);
const eyes = new Color(AVATAR.eyes);
let localPhase = 0;

/** Write one avatar's 8 part matrices + colours into instance `slot`. No allocations. */
function writeAvatar(im: InstancedMesh, shadow: InstancedMesh | null, slot: number, x: number, y: number, z: number, yaw: number, swing: number, colors: AvatarColors) {
  base.makeRotationY(yaw).scale(scaleVec).setPosition(x, y, z);
  if (shadow) {
    // Blob shadow stays on the ground and shrinks while jumping.
    const s = Math.max(0.4, 1 - y * 0.25);
    shadow.setMatrixAt(slot, m.makeScale(s, 1, s).setPosition(x, SHADOW_Y, z));
  }
  for (let p = 0; p < PARTS.length; p++) {
    const part = PARTS[p];
    m.makeScale(part.size[0], part.size[1], part.size[2]);
    m.premultiply(t.makeTranslation(0, part.hang, 0));
    if (part.swing) m.premultiply(t.makeRotationX(swing * part.swing));
    m.premultiply(t.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2]));
    m.premultiply(base);
    const i = slot * PARTS.length + p;
    im.setMatrixAt(i, m);
    im.setColorAt(i, part.c === "eyes" ? eyes : colors[part.c]);
  }
}

interface Props {
  /** Draw the local player's own avatar (third-person lobby). */
  showLocal: boolean;
  localColors: AvatarColors;
}

/**
 * All avatars (local + remote) in ONE InstancedMesh of unit boxes: 8 parts
 * per avatar, coloured per instance. One draw call for up to 20 players.
 */
export function Avatars({ showLocal, localColors }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const shadowMesh = useRef<InstancedMesh>(null);
  const shadowGeo = useMemo(() => new CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), []);
  const shadowMat = useMemo(() => new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28, depthWrite: false }), []);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new MeshLambertMaterial({ flatShading: true }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
    },
    [geometry, material, shadowGeo, shadowMat],
  );

  useFrame((_, dt) => {
    const im = mesh.current;
    if (!im) return;
    const sh = shadowMesh.current;
    let slot = 0;
    if (showLocal) {
      const speed = Math.hypot(player.vx, player.vz);
      localPhase += dt * speed * AVATAR.walkFreq;
      const swing = Math.sin(localPhase) * AVATAR.walkSwing * Math.min(1, speed / 3);
      writeAvatar(im, sh, slot++, player.x, player.y, player.z, player.facing, swing, localColors);
    }

    for (const r of remotePlayers.values()) {
      stepRemote(r, dt, AVATAR.smoothing, AVATAR.walkFreq);
      if (!r.here || slot >= MAX_AVATARS) continue;
      writeAvatar(im, sh, slot++, r.x, 0, r.z, r.yaw, Math.sin(r.phase) * AVATAR.walkSwing * Math.min(1, r.speed / 3), r.colors);
    }

    im.count = slot * PARTS.length;
    if (sh) {
      sh.count = slot;
      sh.instanceMatrix.needsUpdate = true;
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, MAX_AVATARS * PARTS.length]} frustumCulled={false} castShadow={false} />
      <instancedMesh ref={shadowMesh} args={[shadowGeo, shadowMat, MAX_AVATARS]} frustumCulled={false} renderOrder={1} />
    </>
  );
}
