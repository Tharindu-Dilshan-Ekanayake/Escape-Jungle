import { useEffect, useRef, useState } from "react";
import { HUD } from "../../config/hud";
import { CAMPFIRE, VIGNETTE } from "../../config/night";
import { RARITY_COLOR, TREASURE } from "../../config/loot";
import { dayNight, formatClock } from "../../game/time/dayNight";
import { campfireGlow } from "../../game/campfire/campfires";
import { loot, treasureTotal, type FoundTreasure } from "../../game/loot/loot";
import { formatCash } from "../../game/economy/economy";
import { pos, useHud } from "../layout/hudLayout";

/** Dark vignette that deepens at night (lighter near a lit campfire) + warm firelight tint. */
export function NightVignette() {
  const dark = useRef<HTMLDivElement>(null);
  const warm = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const k = dayNight.dark;
      const night = campfireGlow.safe ? VIGNETTE.nightSafe : VIGNETTE.night;
      if (dark.current) dark.current.style.opacity = String(VIGNETTE.day + (night - VIGNETTE.day) * k);
      if (warm.current) warm.current.style.opacity = String(campfireGlow.amount * k * 0.55);
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <div
        ref={dark}
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-500"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(2,6,12,0.95) 100%)", opacity: VIGNETTE.day }}
      />
      <div
        ref={warm}
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-500"
        style={{ background: "radial-gradient(ellipse at 50% 85%, rgba(255,140,40,0.35) 0%, rgba(255,110,20,0) 65%)", opacity: 0 }}
      />
    </>
  );
}

/** Sun / moon pill under the minimap: time until the next phase. */
export function DayClock() {
  const el = useRef<HTMLDivElement>(null);
  const C = useHud((s) => s.clock);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!el.current) return;
      const p = dayNight.phase;
      const left = formatClock(dayNight.phaseLeft);
      const text =
        p === "day" ? `☀️ Night in ${left}` : p === "dusk" ? `🌅 Sunset ${left}` : p === "night" ? `🌙 Dawn in ${left}` : `🌄 Sunrise ${left}`;
      if (el.current.textContent !== text) el.current.textContent = text;
      el.current.style.color = p === "night" || p === "dusk" ? "#ffd27a" : "#ffffff";
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      ref={el}
      className="pointer-events-none fixed z-30 rounded-full bg-black/55 px-3 py-1 font-typewriter text-outline text-sm"
      style={pos(C)}
    />
  );
}

/** Log icon (SVG) for the firewood counter. */
function LogIcon() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden>
      <rect x="4" y="8" width="30" height="13" rx="6" fill="#6b4423" stroke="#2a1a0a" strokeWidth="2" />
      <path d="M9 12 H26 M11 17 H30" stroke="#4a2c14" strokeWidth="1.6" />
      <ellipse cx="33" cy="14.5" rx="4.5" ry="6.5" fill="#e0c08c" stroke="#2a1a0a" strokeWidth="2" />
      <circle cx="33" cy="14.5" r="2" fill="none" stroke="#a8804a" strokeWidth="1.2" />
      <path d="M14 8 Q16 2 21 3" stroke="#6b4423" strokeWidth="2.5" fill="none" />
      <path d="M21 3 q4 -2 6 1 q-4 1 -6 -1" fill="#4f9a3a" />
    </svg>
  );
}

/** Bottom-left, above the bag: carried firewood (pulses when full). */
export function WoodCounter() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let last = -1;
    const id = window.setInterval(() => {
      if (loot.carried !== last) {
        last = loot.carried;
        setN(last);
      }
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);
  const full = n >= CAMPFIRE.carryMax;
  const W = useHud((s) => s.wood);
  return (
    <div className={`pointer-events-none fixed z-30 flex items-center gap-1 ${full ? "animate-pulse" : ""}`} style={pos(W)}>
      <LogIcon />
      <span className={`font-typewriter text-outline text-2xl ${full ? "text-[#ffb347]" : "text-white"}`}>
        {n}/{CAMPFIRE.carryMax}
      </span>
    </div>
  );
}

/** "TREASURE FOUND!" card when a treasure is picked up. */
export function FindPopup() {
  const [find, setFind] = useState<(FoundTreasure & { at: number }) | null>(null);
  // Remembered across renders: each find shows exactly once. (It used to reset
  // when the card closed, so the same card popped up again and again.)
  const shownAt = useRef(loot.lastFind?.at ?? 0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const f = loot.lastFind;
      const now = performance.now() / 1000;
      if (f && f.at !== shownAt.current) {
        shownAt.current = f.at;
        setFind(f);
      } else if (now - shownAt.current > TREASURE.popupSeconds) setFind((cur) => (cur ? null : cur));
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);
  const popupTop = useHud((s) => s.popupTop);
  if (!find) return null;
  const color = RARITY_COLOR[find.kind.rarity];
  return (
    <div key={find.at} className="find-pop pointer-events-none fixed left-1/2 z-40 w-max max-w-[94vw] -translate-x-1/2" style={{ top: popupTop }}>
      <div className="rounded-2xl p-[3px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${color}, #8a5a34, ${color})` }}>
        <div className="flex items-center gap-3 rounded-[14px] bg-[#1d140c]/90 px-5 py-3">
          <div className="grid h-16 w-16 place-items-center rounded-full text-5xl" style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}>
            {find.kind.icon}
          </div>
          <div className="font-lobby text-white">
            <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
              Treasure found! · {find.kind.rarity}
            </div>
            <div className="text-outline text-2xl font-bold">{find.kind.name}</div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-typewriter text-xl text-[#5ee05e]">+{formatCash(find.value)}</span>
              <span className="text-white/70">
                {loot.found.length} / {treasureTotal()} found
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
