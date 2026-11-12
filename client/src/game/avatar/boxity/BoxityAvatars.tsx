import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, Group, InstancedMesh, Matrix4, MeshBasicMaterial } from "three";
import { ROOM_LIMITS, sanitizeLook } from "@shared";
import { AVATAR, AVATAR_ASSETS as A } from "../../../config/lobby";
import { loadTemplate } from "./avatarAssets";
import { AvatarRig } from "./AvatarRig";
import { localEmote, remotePlayers, stepRemote, type AvatarColors } from "../../../net/remotePlayers";
import { onLocalLook } from "../../../net/localLook";
import { player } from "../../player/FirstPersonController";
import { useQualityStore } from "../../../store/qualityStore";
import { Avatars } from "../Avatars";
import { heldTool } from "../../viewmodel/toolModels";

/** Length of a remote machete swing animation (s). */
const SWING_S = 0.45;

const SHADOW_Y = 0.075;
const shadowM = new Matrix4();

interface Props {
  showLocal: boolean;
  localColors: AvatarColors;
}

/** Boxity avatars once player.glb is loaded; blocky avatars while loading or if it fails. */
export function AvatarLayer(props: Props) {
  const [template, setTemplate] = useState<Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadTemplate()
      .then((t) => alive && setTemplate(t))
      .catch((err) => console.warn("[avatar] player.glb failed, using blocky avatars", err));
    return () => {
      alive = false;
    };
  }, []);
  return template ? <BoxityAvatars template={template} showLocal={props.showLocal} /> : <Avatars {...props} />;
}

function BoxityAvatars({ template, showLocal }: { template: Group; showLocal: boolean }) {
  const group = useMemo(() => new Group(), []);
  const localRef = useRef<AvatarRig | null>(null);
  const rigs = useRef(new Map<string, AvatarRig>());
  const low = useQualityStore((s) => s.level === "LOW");
  const shadowRef = useRef<InstancedMesh>(null);
  const shadowGeo = useMemo(() => new CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), []);
  const shadowMat = useMemo(() => new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28, depthWrite: false }), []);

  // The local rig lives inside the effect so a StrictMode/dev re-mount builds a
  // fresh rig and always re-applies the skin (no stale in-flight loads).
  useEffect(() => {
    const rig = new AvatarRig(template);
    group.add(rig.root);
    localRef.current = rig;
    const off = onLocalLook((l) => rig.setLook(l.look, l.skinUrl));
    return () => {
      off();
      rig.dispose();
      localRef.current = null;
    };
  }, [group, template]);

  // Create/remove rigs, apply looks and pick LOD outside the frame loop.
  useEffect(() => {
    const map = rigs.current;
    const tick = () => {
      const ranked: { id: string; d: number }[] = [];
      for (const r of remotePlayers.values()) {
        const d = Math.hypot(r.x - player.x, r.z - player.z);
        if (r.here && d <= A.maxDistance) ranked.push({ id: r.id, d });
      }
      ranked.sort((a, b) => a.d - b.d);
      const bodies = low ? A.bodies.low : A.bodies.desktop;
      const detailed = low ? A.detailed.low : A.detailed.desktop;
      const allowed = new Map(ranked.slice(0, bodies).map((e, i) => [e.id, i < detailed]));
      for (const [id, rig] of map) {
        if (!remotePlayers.has(id)) {
          rig.dispose();
          map.delete(id);
        }
      }
      for (const r of remotePlayers.values()) {
        let rig = map.get(r.id);
        const ok = allowed.has(r.id);
        if (!rig && ok) {
          rig = new AvatarRig(template);
          group.add(rig.root);
          map.set(r.id, rig);
        }
        if (!rig) continue;
        rig.root.visible = ok;
        rig.setDetail(allowed.get(r.id) === true);
        const tool = r.zone !== "lobby" ? r.tool : "";
        if (tool !== rig.heldKey) rig.setHeldTool(tool, tool ? heldTool(tool) : null);
        try {
          rig.setLook(sanitizeLook(JSON.parse(r.look || "{}")));
        } catch {
          rig.setLook({});
        }
      }
    };
    tick();
    const id = window.setInterval(tick, A.lodIntervalS * 1000);
    return () => {
      window.clearInterval(id);
      for (const rig of map.values()) rig.dispose();
      map.clear();
    };
  }, [group, template, low]);

  useEffect(
    () => () => {
      shadowGeo.dispose();
      shadowMat.dispose();
    },
    [shadowGeo, shadowMat],
  );

  useFrame((_, dt) => {
    const now = performance.now() / 1000;
    const sh = shadowRef.current;
    let n = 0;
    const blob = (x: number, y: number, z: number) => {
      if (!sh) return;
      const s = Math.max(0.4, 1 - y * 0.25);
      sh.setMatrixAt(n++, shadowM.makeScale(s, 1, s).setPosition(x, SHADOW_Y, z));
    };

    const local = localRef.current;
    if (local) local.root.visible = showLocal;
    if (local && showLocal) {
      const speed = Math.hypot(player.vx, player.vz);
      local.emote = localEmote.current;
      local.pose(player.x, player.y, player.z, player.facing, speed, player.grounded, now);
      localEmote.current = local.emote; // cleared when moving / finished
      blob(player.x, player.y, player.z);
    }

    for (const r of remotePlayers.values()) {
      stepRemote(r, dt, AVATAR.smoothing, AVATAR.walkFreq);
      const rig = rigs.current.get(r.id);
      if (!rig || !rig.root.visible || !r.here) {
        if (rig && !r.here) rig.root.visible = false;
        continue;
      }
      rig.emote = r.emote;
      const su = r.swingAt > 0 ? (now - r.swingAt) / SWING_S : -1;
      rig.pose(r.x, r.y, r.z, r.yaw, r.speed, r.y < 0.08, now, su <= 1 ? su : -1);
      r.emote = rig.emote;
      blob(r.x, r.y, r.z);
    }
    if (sh) {
      sh.count = n;
      sh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={group} />
      <instancedMesh ref={shadowRef} args={[shadowGeo, shadowMat, ROOM_LIMITS.lobbyMaxClients]} frustumCulled={false} renderOrder={1} />
    </>
  );
}
