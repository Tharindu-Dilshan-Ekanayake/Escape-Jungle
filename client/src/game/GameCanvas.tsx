import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { CAMERA } from "../config/render";
import { CameraFar } from "./CameraFar";
import { CameraFov } from "./CameraFov";
import { PERF_MAX_FLIPFLOPS, PERF_MIN_FPS, PERF_WARMUP_MS } from "../config/quality";
import { useBootStore } from "../store/bootStore";
import { useGameStore } from "../store/gameStore";
import { useQualityStore } from "../store/qualityStore";
import { usePlatformStore } from "../store/platformStore";
import { DEVICE } from "../store/device";
import { RendererStats } from "./RendererStats";

// Stages are split into their own chunks and loaded lazily: the lobby first,
// the jungle only when a party starts a run.
const LobbyScene = lazy(() => import("../world/lobby/LobbyScene"));
const Chapter1Scene = lazy(() => import("../world/chapter1/Chapter1Scene"));

// r3f-perf: dev only, opt-in with `?perf` (its GPU timer queries spam warnings on
// some drivers). `import.meta.env.DEV` is false in builds, so the import is dropped.
const DevPerf =
  import.meta.env.DEV && new URLSearchParams(location.search).has("perf")
    ? lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf })))
    : null;

// Dev only: `?quality=MEDIUM|HIGH|LOW` pins the preset (no FPS auto-drop) for testing visuals.
const PINNED_QUALITY = import.meta.env.DEV ? new URLSearchParams(location.search).get("quality")?.toUpperCase() : undefined;
if (PINNED_QUALITY === "LOW" || PINNED_QUALITY === "MEDIUM" || PINNED_QUALITY === "HIGH") {
  useQualityStore.getState().setRequested(PINNED_QUALITY);
}

/** Antialias needs a new GL context to change, so it is fixed per device at startup. */
const ANTIALIAS = !DEVICE.isLowEnd;

export default function GameCanvas() {
  const preset = useQualityStore((s) => s.preset);
  const degrade = useQualityStore((s) => s.degrade);
  const adBreak = usePlatformStore((s) => s.adBreak);
  const ready = useBootStore((s) => s.ready);
  const scene = useGameStore((s) => s.scene);
  const runKey = useGameStore((s) => s.run?.runId ?? "run");

  // Start the FPS monitor only after load hitches have passed.
  const [monitorOn, setMonitorOn] = useState(false);
  useEffect(() => {
    if (!ready || PINNED_QUALITY) return;
    const id = window.setTimeout(() => setMonitorOn(true), PERF_WARMUP_MS);
    return () => window.clearTimeout(id);
  }, [ready]);

  // Context loss: keep the page alive, then remount the canvas to rebuild GPU resources.
  const [canvasKey, setCanvasKey] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);

  const onLost = useCallback((e: Event) => {
    e.preventDefault();
    setContextLost(true);
    console.warn("[gl] WebGL context lost");
  }, []);
  const onRestored = useCallback(() => {
    console.info("[gl] WebGL context restored, remounting canvas");
    setContextLost(false);
    setCanvasKey((k) => k + 1);
  }, []);

  const onCreated = useCallback(
    ({ gl }: RootState) => {
      canvasEl.current = gl.domElement;
      gl.domElement.addEventListener("webglcontextlost", onLost);
      gl.domElement.addEventListener("webglcontextrestored", onRestored);
    },
    [onLost, onRestored],
  );

  useEffect(
    () => () => {
      canvasEl.current?.removeEventListener("webglcontextlost", onLost);
      canvasEl.current?.removeEventListener("webglcontextrestored", onRestored);
    },
    [canvasKey, onLost, onRestored],
  );

  const far = preset.viewDistance * CAMERA.farMultiplier;

  return (
    <>
      <Canvas
        key={canvasKey}
        className="fixed! inset-0"
        dpr={preset.dpr}
        shadows={preset.shadows}
        frameloop={adBreak || contextLost ? "never" : "always"}
        gl={{ antialias: ANTIALIAS, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: CAMERA.fov, near: CAMERA.near, far }}
        flat
        onCreated={onCreated}
      >
        {monitorOn && (
          <PerformanceMonitor
            bounds={() => [PERF_MIN_FPS, Number.POSITIVE_INFINITY]}
            flipflops={PERF_MAX_FLIPFLOPS}
            onDecline={() => degrade()}
          />
        )}
        <RendererStats />
        <CameraFar far={far} />
        <CameraFov />
        <Suspense fallback={null}>{scene === "lobby" ? <LobbyScene key="lobby" /> : <Chapter1Scene key={runKey} />}</Suspense>
        {DevPerf && (
          <Suspense fallback={null}>
            <DevPerf position="bottom-right" minimal />
          </Suspense>
        )}
      </Canvas>
      {contextLost && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 font-lobby text-2xl text-white">
          Graphics paused, recovering...
        </div>
      )}
    </>
  );
}
