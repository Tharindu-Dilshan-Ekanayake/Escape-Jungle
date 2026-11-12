import { useEffect, useRef } from "react";
import { activeZones } from "../../game/cutting/cutState";
import { player } from "../../game/player/FirstPersonController";
import { HUD } from "../../config/hud";
import { useHud } from "../layout/hudLayout";
import { GATES } from "../../config/zones1";
import { currentZoneIndex } from "../../game/progress/progress";

/**
 * "Clear the area N%" + progress bar, top centre. Polls the grass field a few
 * times per second and writes the DOM directly (no per-frame React renders).
 */
export function ClearBar() {
  const label = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const L = useHud((s) => s.clearBar);

  useEffect(() => {
    let last = "";
    const id = window.setInterval(() => {
      // The zone the player is standing in; otherwise the current goal zone.
      const goal = currentZoneIndex();
      let best = activeZones.list[goal >= 0 ? goal : activeZones.list.length - 1];
      let bestD = 0;
      for (const z of activeZones.list) {
        const r = z.zone.rect;
        const dx = Math.max(r.minX - player.x, 0, player.x - r.maxX);
        const dz = Math.max(r.minZ - player.z, 0, player.z - r.maxZ);
        const d = dx * dx + dz * dz;
        if (d <= bestD) {
          bestD = d;
          best = z;
        }
      }
      const f = best?.field;
      const pct = f ? Math.floor(f.clearRatio * 100) : 0;
      const need = Math.round(GATES.clearToOpen * 100);
      const key = `${best?.zone.id}:${pct}`;
      if (key === last) return;
      last = key;
      if (label.current) label.current.textContent = best ? (useHud.getState().mode === "desktop" ? `${best.zone.name} · cut ${pct}% / ${need}%` : `${best.zone.name} · ${pct}% / ${need}%`) : `Clear the area ${pct}%`;
      if (fill.current) fill.current.style.width = `${f ? f.clearRatio * 100 : 0}%`;
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 z-30 -translate-x-1/2 text-center" style={{ top: L.top, width: L.width }}>
      <span id="clear-label" ref={label} className="block whitespace-nowrap font-typewriter text-outline text-white" style={{ fontSize: L.font }}>
        Clear the area 0%
      </span>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full border-2 border-black/70 bg-black/35">
        <div ref={fill} className="h-full rounded-full bg-[#f5c542] transition-[width] duration-300" style={{ width: "0%" }} />
        {/* Gate threshold marker */}
        <div className="absolute inset-y-0 w-[3px] bg-white/90" style={{ left: `${GATES.clearToOpen * 100}%` }} />
      </div>
    </div>
  );
}
