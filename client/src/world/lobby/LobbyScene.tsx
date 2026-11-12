import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBasicMaterial, MeshLambertMaterial } from "three";
import { LOBBY_LAYOUT, padAt } from "@shared";
import { buildLobby } from "./buildLobby";
import { Sky } from "../environment/Sky";
import { ChunkMeshes } from "../ChunkMeshes";
import { PropLabels } from "../PropLabels";
import { LobbyLife } from "./LobbyLife";
import { LobbyFun } from "./LobbyFun";
import { Banners } from "../banners/BannerMesh";
import { PadSigns } from "./PadSignBoards";
import { AvatarPortrait } from "../../game/avatar/AvatarPortrait";
import { FirstPersonController, player } from "../../game/player/FirstPersonController";
import { AvatarLayer } from "../../game/avatar/boxity/BoxityAvatars";
import { NameTags } from "../../game/avatar/NameTags";
import { colorsFor, setAvatarScope } from "../../net/remotePlayers";
import { FOG, LIGHTING } from "../../config/render";
import { SceneFog } from "../environment/SceneFog";
import { useQualityStore } from "../../store/qualityStore";
import { useBootStore } from "../../store/bootStore";
import { useLobbyStore } from "../../store/lobbyStore";
import { hideScreen, reportScreen } from "../../platform/boxity";
import { startAmbience } from "../../game/audio/ambience";

const LOCAL_PAD_POLL_MS = 200;

/**
 * Lobby hub (separate from the jungle): third-person, other players as blocky
 * avatars, party pads that start jungle runs. Lazy-loaded; disposes on unmount.
 */
export default function LobbyScene() {
  const preset = useQualityStore((s) => s.preset);
  const markReady = useBootStore((s) => s.markReady);
  const gl = useThree((s) => s.gl);
  const status = useLobbyStore((s) => s.status);
  const me = useLobbyStore((s) => s.me);
  const myUid = useLobbyStore((s) => s.players.find((p) => p.id === s.me)?.uid ?? "local");

  const world = useMemo(() => buildLobby(), []);
  const materials = useMemo(
    () => ({
      solid: new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      glow: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    }),
    [],
  );
  const localColors = useMemo(() => colorsFor(myUid), [myUid]);
  useEffect(() => setAvatarScope("lobby"), []);

  useEffect(
    () => () => {
      world.dispose();
      materials.solid.dispose();
      materials.glow.dispose();
    },
    [world, materials],
  );

  // Static shadow casters only: draw the shadow map once.
  useEffect(() => {
    if (!preset.shadows) return;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, preset.shadows, preset.shadowMapSize]);

  useEffect(() => {
    markReady();
    reportScreen("lobby");
    const stopAmbience = startAmbience("lobby");
    return () => {
      stopAmbience();
      hideScreen();
    };
  }, [markReady]);

  // Offline: detect the pad under the player locally (online the server decides).
  useEffect(() => {
    if (status === "online") return;
    const id = window.setInterval(() => {
      const at = padAt(player.x, player.z);
      const pad = at >= 0 && LOBBY_LAYOUT.pads[at].chapter === 1 ? at : -1; // other maps need the server (unlocks)
      if (pad !== useLobbyStore.getState().localPad) useLobbyStore.setState({ localPad: pad });
    }, LOCAL_PAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [status]);

  // Pad info is printed on the live signboards (PadSigns), not floating labels.
  const labels = world.labels;

  const s = LIGHTING.shadowArea;
  const mapSize = preset.shadowMapSize || 1;

  return (
    <>
      <FirstPersonController view="third" colliders={world.colliders} spawn={LOBBY_LAYOUT.spawn} region={world.region} />
      <SceneFog color={FOG.lobbyColor} startRatio={FOG.lobbyStartRatio} minView={FOG.lobbyMinView} />
      <Sky />
      <hemisphereLight args={[LIGHTING.hemiSky, LIGHTING.hemiGround, LIGHTING.hemiIntensity]} />
      <directionalLight
        position={LIGHTING.sunPosition}
        intensity={LIGHTING.sunIntensity}
        color={LIGHTING.sun}
        castShadow={preset.shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={LIGHTING.shadowBias}
        shadow-camera-left={-s}
        shadow-camera-right={s}
        shadow-camera-top={s}
        shadow-camera-bottom={-s}
        shadow-camera-far={LIGHTING.shadowFar}
      />
      <ChunkMeshes chunks={world.solid} material={materials.solid} shadows={preset.shadows} minView={FOG.lobbyMinView} />
      <ChunkMeshes chunks={world.glow} material={materials.glow} shadows={false} minView={FOG.lobbyMinView} />
      <AvatarLayer showLocal localColors={localColors} />
      <NameTags showLocalBubble={me !== "" || status !== "online"} />
      <PropLabels labels={labels} font="lobby" />
      <LobbyLife />
      <LobbyFun />
      <Banners specs={world.banners} />
      <PadSigns />
      <AvatarPortrait />
    </>
  );
}
