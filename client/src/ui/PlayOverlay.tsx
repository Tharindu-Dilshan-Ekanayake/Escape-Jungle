import { lazy, Suspense } from "react";
import { useUiStore } from "../store/uiStore";
import { useBootStore } from "../store/bootStore";
import { useGameStore } from "../store/gameStore";
import { DEVICE } from "../store/device";
import { requestPointerLock } from "../game/player/input";
import { TouchControls } from "./TouchControls";
import { UpgradesPanel } from "./hud/UpgradesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { CutsceneOverlay } from "./cutscene/CutsceneOverlay";
import { useCutsceneStore } from "../cutscene/cutsceneState";
import { LobbyHud } from "./lobby/LobbyHud";

// Jungle-only UI loads with the stage, not with the lobby.
const RunHud = lazy(() => import("./hud/RunHud").then((m) => ({ default: m.RunHud })));
const FullMap = lazy(() => import("./map/FullMap").then((m) => ({ default: m.FullMap })));
const SharePanel = lazy(() => import("./hud/SharePanel").then((m) => ({ default: m.SharePanel })));
const FoodStorePanel = lazy(() => import("./hud/FoodStorePanel").then((m) => ({ default: m.FoodStorePanel })));

/** Scene-specific HUD + pointer-lock prompt (desktop) or touch controls (mobile). */
export function PlayOverlay() {
  const ready = useBootStore((s) => s.ready);
  const locked = useUiStore((s) => s.pointerLocked);
  const scene = useGameStore((s) => s.scene);
  const panel = useUiStore((s) => s.panel);
  const cinematic = useCutsceneStore((s) => s.playing);
  if (!ready) return null;
  if (cinematic) return <CutsceneOverlay />;

  const hint =
    scene === "run"
      ? "WASD move · Mouse look · Hold click cut · TAB upgrades · M map · E use · F eat · L leave · Esc release"
      : "WASD move · Mouse look · Space jump · Esc release";

  return (
    <>
      <Suspense fallback={null}>{scene === "run" ? <RunHud /> : <LobbyHud />}</Suspense>
      {panel === "upgrades" && scene === "run" && <UpgradesPanel />}
      {panel === "settings" && <SettingsPanel />}
      {panel === "share" && scene === "run" && (
        <Suspense fallback={null}>
          <SharePanel />
        </Suspense>
      )}
      {panel === "store" && scene === "run" && (
        <Suspense fallback={null}>
          <FoodStorePanel />
        </Suspense>
      )}
      {panel === "map" && scene === "run" && (
        <Suspense fallback={null}>
          <FullMap />
        </Suspense>
      )}
      {DEVICE.prefersTouchControls ? (
        <TouchControls showCut={scene === "run"} />
      ) : (
        scene === "run" &&
        !locked &&
        !panel && (
          <button
            type="button"
            onClick={requestPointerLock}
            className="fixed left-1/2 top-[26%] z-20 -translate-x-1/2 rounded-xl bg-black/45 px-6 py-3 text-center text-white"
          >
            <span className="block font-lobby text-outline text-3xl font-bold">Click to play</span>
            <span className="block font-lobby text-sm text-white/85">{hint}</span>
          </button>
        )
      )}
    </>
  );
}
