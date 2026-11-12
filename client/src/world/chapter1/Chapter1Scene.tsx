import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBasicMaterial, MeshLambertMaterial } from "three";
import { buildChapter1 } from "./buildChapter1";
import { buildGround } from "../environment/buildGround";
import { Sky } from "../environment/Sky";
import { Fireflies } from "../environment/Fireflies";
import { ChunkMeshes } from "../ChunkMeshes";
import { PropLabels } from "../PropLabels";
import { GrassChunks } from "../../grass/GrassChunks";
import { LeafParticles } from "../../grass/LeafParticles";
import { FirstPersonController } from "../../game/player/FirstPersonController";
import { CutSystem } from "../../game/cutting/CutSystem";
import { activeZones } from "../../game/cutting/cutState";
import { ViewModel } from "../../game/viewmodel/ViewModel";
import { StationSystem } from "../../game/economy/StationSystem";
import { CoinBurst } from "../../game/economy/CoinBurst";
import { resetEconomy } from "../../game/economy/economy";
import { GateSystem } from "../../game/progress/GateSystem";
import { GateLabels } from "../../game/progress/GateLabels";
import { resetProgress, startRunTimer } from "../../game/progress/progress";
import { useUiStore } from "../../store/uiStore";
import { IntroCutscene } from "../../cutscene/IntroCutscene";
import { SmokeParticles } from "../../cutscene/SmokeParticles";
import { WreckFire } from "../../cutscene/WreckFire";
import { FarPlume } from "../../cutscene/FarPlume";
import { LightShafts } from "../environment/LightShafts";
import { Banners } from "../banners/BannerMesh";
import { cancelCutscene, onCutsceneEnd, startCutscene } from "../../cutscene/cutsceneState";
import { startIntroAudio } from "../../cutscene/cutsceneAudio";
import { startAmbience } from "../../game/audio/ambience";
import { CAMP1 } from "../../config/camp1";
import { FOG } from "../../config/render";
import { PALETTE } from "../../config/palette";
import { SceneFog } from "../environment/SceneFog";
import { useQualityStore } from "../../store/qualityStore";
import { useBootStore } from "../../store/bootStore";
import { rendererStats } from "../../store/debugStore";
import { gameplayEnd, gameplayStart, hideScreen, reportScreen } from "../../platform/boxity";
import { LootSystem } from "../../game/loot/LootSystem";
import { ChopSystem } from "../../game/chop/ChopSystem";
import { createLoot } from "../../game/loot/loot";
import { CampfireSystem } from "../../game/campfire/CampfireSystem";
import { resetCampfires } from "../../game/campfire/campfires";
import { NightEyes } from "../../game/night/NightEyes";
import { resetDayNight } from "../../game/time/dayNight";
import { AnimalSystem } from "../../game/animals/AnimalSystem";
import { AdventureSystem } from "../../game/adventure/AdventureSystem";
import { adventures, createAdventures } from "../../game/adventure/adventures";
import { campfireSpots } from "../../game/campfire/campfires";
import { SurvivalSystem } from "../../game/survival/SurvivalSystem";
import { ForageSystem } from "../../game/interact/ForageSystem";
import { resetSurvival } from "../../game/survival/survival";
import { resetFoodStore } from "../../game/survival/foodStore";
import { setBurn } from "../../game/campfire/campfires";
import { AvatarLayer } from "../../game/avatar/boxity/BoxityAvatars";
import { NameTags } from "../../game/avatar/NameTags";
import { colorsFor, setAvatarScope } from "../../net/remotePlayers";
import { beginRun, endRun } from "../../net/runNet";
import { RUN_RULES } from "@shared";
import { useGameStore } from "../../store/gameStore";
import { EscapeSystem } from "../../game/escape/EscapeSystem";
import { TutorialSystem } from "../../game/tutorial/TutorialSystem";

/** The crash site's fire is already burning when you land (seconds). */
const CRASH_FIRE_SECONDS = RUN_RULES.crashFireSeconds;

/**
 * Chapter 1 stage: Camp 1 + the first grass zone. Lazy-loaded; everything it
 * creates is disposed on unmount.
 */
export default function Chapter1Scene() {
  const preset = useQualityStore((s) => s.preset);
  const markReady = useBootStore((s) => s.markReady);
  const gl = useThree((s) => s.gl);
  const run = useGameStore((s) => s.run);
  const partyColors = useMemo(() => colorsFor("me"), []);

  const world = useMemo(() => buildChapter1(), []);
  const ground = useMemo(() => buildGround(), []);
  const materials = useMemo(
    () => ({
      solid: new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      glow: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    }),
    [],
  );
  const fields = useMemo(() => world.zones.map((z) => z.field), [world]);
  // Per-run state the systems below read in their own useMemo: create it first.
  useMemo(() => {
    createLoot(world.zones);
    resetCampfires();
    setBurn(0, CRASH_FIRE_SECONDS);
    resetDayNight();
    resetSurvival();
    resetFoodStore();
    createAdventures(world.zones, world.camps, campfireSpots());
    // Quest givers are solid (the Monkey King's throne is bigger).
    for (const adv of adventures.list) world.colliders.push({ kind: "circle", x: adv.npc.x, z: adv.npc.z, r: adv.def.npc.look === "monkeyKing" ? 1.15 : 0.5 });
  }, [world]);
  // Uncut plants block movement: test the step one axis at a time against the
  // cell grid (slide along edges; never squeezes through; can always walk out).
  const collideGrass = useMemo(() => {
    const blocked = (x: number, z: number, r: number) => fields.some((f) => f.overlaps(x, z, r));
    return (p: { x: number; z: number }, r: number, prevX: number, prevZ: number) => {
      if (!blocked(p.x, p.z, r) || blocked(prevX, prevZ, r)) return;
      if (!blocked(p.x, prevZ, r)) p.z = prevZ;
      else if (!blocked(prevX, p.z, r)) p.x = prevX;
      else {
        p.x = prevX;
        p.z = prevZ;
      }
    };
  }, [fields]);

  useEffect(() => {
    activeZones.list = world.zones;
    rendererStats.info = world.stats;
    return () => {
      activeZones.list = [];
      rendererStats.info = "";
      world.dispose();
      ground.dispose();
      materials.solid.dispose();
      materials.glow.dispose();
    };
  }, [world, ground, materials]);

  // Every shadow caster is static: render the shadow map once, not every frame.
  useEffect(() => {
    if (!preset.shadows) return;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, preset.shadows, preset.shadowMapSize]);

  useEffect(() => {
    resetEconomy(); // every run starts with an empty bag, no cash, the starter tool
    resetProgress(); // all gates closed, timer stopped
    // Party sync: show my run's members, ask the server for the shared state (children registered their handlers first).
    setAvatarScope(run?.runId ?? "solo");
    beginRun(!!run && !run.solo);
    markReady();
    // Plane-crash intro first; gameplay (and the SDK gameplay screen) starts when it ends or is skipped.
    const offEnd = onCutsceneEnd(() => {
      startRunTimer();
      gameplayStart();
      reportScreen("gameplay");
    });
    const stopIntroAudio = startIntroAudio();
    const offAudioEnd = onCutsceneEnd(stopIntroAudio);
    const stopAmbience = startAmbience("jungle");
    startCutscene();
    return () => {
      offEnd();
      offAudioEnd();
      stopIntroAudio();
      stopAmbience();
      cancelCutscene();
      useUiStore.setState({ panel: null });
      hideScreen();
      gameplayEnd();
      endRun();
      setAvatarScope("lobby");
    };
  }, [markReady, run]);

  return (
    <>
      {/* First: useFrame callbacks run in mount order, so the camera is updated before anything reads it. */}
      <FirstPersonController
        colliders={world.colliders}
        spawn={CAMP1.spawn}
        region={world.region}
        extraCollide={collideGrass}
      />
      <CutSystem fields={fields} />
      <StationSystem />
      <GateSystem zones={world.zones} gateColliders={world.gateColliders} />
      <GateLabels fields={fields} />
      <SceneFog color={PALETTE.fog} startRatio={FOG.startRatio} />
      {/* Sky + day/night cycle (owns the hemisphere and sun/moon lights). */}
      <Sky dayNight />
      <mesh geometry={ground} material={materials.solid} receiveShadow={preset.shadows} matrixAutoUpdate={false} />
      <ChunkMeshes chunks={world.solid} material={materials.solid} shadows={preset.shadows} />
      <ChunkMeshes chunks={world.glow} material={materials.glow} shadows={false} />
      {fields.map((f) => (
        <GrassChunks key={f.plantId} field={f} />
      ))}
      <LootSystem fields={fields} />
      <SurvivalSystem camps={world.camps} forage={world.forage} />
      <ForageSystem forage={world.forage} />
      <AnimalSystem region={world.region} />
      <AdventureSystem fields={fields} />
      {/* Party members (Boxity avatars holding their machetes) + name tags. */}
      <AvatarLayer showLocal={false} localColors={partyColors} />
      <NameTags showLocalBubble={false} />
      <CampfireSystem />
      <NightEyes />
      <LeafParticles count={preset.particleCap} />
      <CoinBurst />
      <IntroCutscene smoke={preset.smoke} />
      {preset.smoke > 0 && <SmokeParticles />}
      <WreckFire />
      <FarPlume />
      <LightShafts />
      <EscapeSystem />
      <TutorialSystem />
      <ChopSystem />
      <Fireflies anchors={world.fireflies} count={preset.fireflies} />
      <PropLabels labels={world.labels} />
      <Banners specs={world.banners} />
      {/* Last: owns the render loop (world pass + viewmodel pass). */}
      <ViewModel />
    </>
  );
}
