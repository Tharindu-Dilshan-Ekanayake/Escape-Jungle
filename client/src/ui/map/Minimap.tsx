import { useEffect, useRef } from "react";
import { MAP } from "../../config/map";
import { DEVICE } from "../../store/device";
import { player } from "../../game/player/FirstPersonController";
import { useUiStore } from "../../store/uiStore";
import { getJungleMap } from "./jungleMap";
import { pos, useHud } from "../layout/hudLayout";

/**
 * Round north-up minimap (top-right; top-left on touch screens): parchment map centred on the player with
 * live cleared areas, gates, camps, fires, uncovered loot and the goal route.
 * Canvas 2D redrawn ~10x/s on a timer (never per frame). Tap/click or M = full map.
 */
export function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The M key hint only makes sense on a desktop-sized layout.
  const showKey = useHud((s) => s.mode === "desktop") && !DEVICE.prefersTouchControls;
  const M = useHud((s) => s.mini);
  const size = M.size;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = size * dpr;
    el.height = size * dpr;
    const ctx = el.getContext("2d")!;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const map = getJungleMap();
      if (!map) return;
      map.update();
      const half = size / 2;
      const f = half / MAP.miniRadius;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(half * dpr, half * dpr, half * dpr, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = MAP.colors.paper;
      ctx.fillRect(0, 0, el.width, el.height);
      map.draw(ctx, { ox: half - player.x * f, oy: half - player.z * f, f, mini: true }, dpr, (performance.now() - t0) / 1000);
      ctx.restore();
    }, MAP.refreshMs);
    return () => window.clearInterval(id);
  }, [size]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === MAP.key && !e.repeat) useUiStore.getState().openPanel("map");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      onClick={() => useUiStore.getState().openPanel("map")}
      aria-label="Open map"
      className="fixed z-30 rounded-full p-[5px] shadow-xl"
      style={{ ...pos(M), background: "conic-gradient(from 20deg, #8a5a34, #c89a62, #6b4423, #c89a62, #8a5a34)" }}
    >
      <div className="relative rounded-full border-2 border-[#3a2412]" style={{ width: size, height: size }}>
        <canvas ref={canvas} className="block rounded-full" style={{ width: size, height: size }} />
        <span className="absolute left-1/2 top-0.5 -translate-x-1/2 font-typewriter text-outline text-sm text-[#ffd23f]">N</span>
        {showKey && <span className="absolute -bottom-2 -left-2 rounded bg-white/90 px-1.5 text-xs font-bold text-black">M</span>}
      </div>
    </button>
  );
}
