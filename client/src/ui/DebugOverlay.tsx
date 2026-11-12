import { useEffect, useRef } from "react";
import { DEBUG_REFRESH_MS, DEBUG_TOGGLE_KEY, PERF_BUDGETS } from "../config/debug";
import { rendererStats, useDebugStore } from "../store/debugStore";
import { useQualityStore } from "../store/qualityStore";
import { DEVICE } from "../store/device";

const budget = DEVICE.isLowEnd ? PERF_BUDGETS.mobile : PERF_BUDGETS.desktop;
const OK = "#9BE22D";
const BAD = "#ff5a5a";

/** Installs the F3 toggle. Mounted once, independent of overlay visibility. */
export function useDebugHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== DEBUG_TOGGLE_KEY || e.repeat) return;
      e.preventDefault(); // F3 is "find next" in some browsers
      useDebugStore.getState().toggleOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * F3 overlay: FPS, draw calls, triangles. Reads the mutable `rendererStats`
 * on an interval and writes text straight into the DOM: no per-frame React renders.
 */
export function DebugOverlay() {
  const visible = useDebugStore((s) => s.overlayVisible);
  const level = useQualityStore((s) => s.level);
  const ceiling = useQualityStore((s) => s.deviceCeiling);
  const fps = useRef<HTMLSpanElement>(null);
  const calls = useRef<HTMLSpanElement>(null);
  const tris = useRef<HTMLSpanElement>(null);
  const mem = useRef<HTMLSpanElement>(null);
  const info = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      const s = rendererStats;
      if (fps.current) {
        fps.current.textContent = `${s.fps.toFixed(0)} (${s.frameMs.toFixed(1)} ms)`;
        fps.current.style.color = s.fps >= budget.minFps ? OK : BAD;
      }
      if (calls.current) {
        calls.current.textContent = `${s.drawCalls} / ${budget.drawCalls}`;
        calls.current.style.color = s.drawCalls <= budget.drawCalls ? OK : BAD;
      }
      if (tris.current) {
        tris.current.textContent = `${s.triangles.toLocaleString()} / ${budget.triangles.toLocaleString()}`;
        tris.current.style.color = s.triangles <= budget.triangles ? OK : BAD;
      }
      if (mem.current) {
        mem.current.textContent = `geo ${s.geometries} · tex ${s.textures} · dpr ${s.dpr.toFixed(2)}`;
      }
      if (info.current) info.current.textContent = s.info;
    }, DEBUG_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      id="debug-overlay"
      className="pointer-events-none fixed left-2 top-14 z-40 rounded-md bg-black/70 px-3 py-2 font-mono text-xs leading-5 text-white"
    >
      <div>
        FPS <span id="dbg-fps" ref={fps}>-</span>
      </div>
      <div>
        Draw calls <span id="dbg-calls" ref={calls}>-</span>
      </div>
      <div>
        Triangles <span id="dbg-tris" ref={tris}>-</span>
      </div>
      <div className="text-white/70">
        <span ref={mem}>-</span>
      </div>
      <div className="text-white/70">
        Quality {level} (max {ceiling}) · {DEVICE.isLowEnd ? "low-end" : "desktop"} · {DEVICE.cores} cores
      </div>
      <div id="dbg-info" ref={info} className="text-white/70" />
      <div className="text-white/50">F3 to hide</div>
    </div>
  );
}
