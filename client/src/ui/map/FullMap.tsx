import { useEffect, useRef, useState } from "react";
import { MAP } from "../../config/map";
import { CAMPFIRE } from "../../config/night";
import { GATES, ZONES1 } from "../../config/zones1";
import { RARITY_COLOR } from "../../config/loot";
import { activeZones } from "../../game/cutting/cutState";
import { progress } from "../../game/progress/progress";
import { currentGoal } from "../../game/progress/goal";
import { loot, treasureTotal } from "../../game/loot/loot";
import { dayNight } from "../../game/time/dayNight";
import { formatCash } from "../../game/economy/economy";
import { useUiStore } from "../../store/uiStore";
import { Panel } from "../Panel";
import { getJungleMap } from "./jungleMap";
import { adventures, ST } from "../../game/adventure/adventures";

/** Compass rose drawn over the map's top-right corner. */
function CompassRose() {
  return (
    <svg className="pointer-events-none absolute right-3 top-3" width="72" height="72" viewBox="-36 -36 72 72" aria-hidden>
      <circle r="30" fill="rgba(239,220,174,0.8)" stroke="#4a2f16" strokeWidth="2" />
      <circle r="24" fill="none" stroke="#4a2f16" strokeWidth="1" strokeDasharray="2 3" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0 -27 L5 0 L0 4 L-5 0 Z" fill={a === 0 ? "#c0392b" : "#4a2f16"} />
      ))}
      <text y="-14" textAnchor="middle" fontSize="9" fontFamily="'Special Elite'" fill="#fff4d6">N</text>
    </svg>
  );
}

/** Full map (M): the whole chapter on parchment, plus zone progress, treasures and firewood. */
export function FullMap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const close = () => useUiStore.getState().openPanel(null);

  useEffect(() => {
    const el = canvas.current;
    const holder = box.current;
    const map = getJungleMap();
    if (!el || !holder || !map) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const maxW = holder.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.68, 760);
    const f = Math.min(maxW / map.worldW, maxH / map.worldH);
    const w = Math.floor(map.worldW * f);
    const h = Math.floor(map.worldH * f);
    el.width = w * dpr;
    el.height = h * dpr;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const ctx = el.getContext("2d")!;
    const t0 = performance.now();
    const draw = () => {
      map.update();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);
      map.draw(ctx, { ox: -map.bounds.minX * f, oy: -map.bounds.minZ * f, f, mini: false }, dpr, (performance.now() - t0) / 1000);
    };
    draw();
    const id = window.setInterval(() => {
      draw();
      setTick((t) => t + 1);
    }, MAP.refreshMs * 2);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const goal = currentGoal();
  const cur = progress.open.findIndex((o) => !o);
  const nightIcon = dayNight.phase === "night" ? "🌙" : dayNight.phase === "day" ? "☀️" : "🌅";

  return (
    <Panel title="Jungle Map" icon="🗺️" onClose={close} width="min(96vw,1060px)">
      <div className="flex flex-col gap-4 md:flex-row">
        <div ref={box} className="relative min-w-0 flex-1">
          <div className="relative mx-auto w-fit rounded-xl border-4 border-[#6b4423] shadow-inner">
            <canvas ref={canvas} className="block rounded-lg" />
            <CompassRose />
          </div>
        </div>
        <aside className="w-full shrink-0 space-y-3 font-lobby text-[#3a2a1a] md:w-64">
          <div className="rounded-xl bg-[#ffd23f]/30 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-[#8a5a34]">Go to</div>
            <div className="text-lg font-bold">➜ {goal.label}</div>
            <div className="text-sm">
              {nightIcon} {dayNight.phase} · 🪵 {loot.carried}/{CAMPFIRE.carryMax} firewood
            </div>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#8a5a34]">Areas</div>
            {activeZones.list.map(({ zone, field }, i) => {
              const pct = Math.floor(field.clearRatio * 100);
              const done = progress.open[i];
              return (
                <div key={zone.id} className={`flex items-center justify-between text-sm ${i === cur ? "font-bold" : ""}`}>
                  <span>
                    {done ? "✅" : i === cur ? "➡️" : "🔒"} {zone.name}
                  </span>
                  <span className={done ? "text-[#2f8a1f]" : ""}>
                    {pct}%{!done && i === cur ? ` / ${Math.round(GATES.clearToOpen * 100)}%` : ""}
                  </span>
                </div>
              );
            })}
            <div className="mt-1 text-sm">{progress.open[ZONES1.length - 1] ? "✈️ Plane Wreck: path open!" : "✈️ Plane Wreck"}</div>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#8a5a34]">
              Treasures {loot.found.length} / {treasureTotal()}
            </div>
            {loot.found.length === 0 && <div className="text-sm text-[#6b5a44]">Cut plants to uncover hidden treasures ✨</div>}
            <div className="flex flex-wrap gap-1.5">
              {loot.found.map((t, i) => (
                <span
                  key={i}
                  title={`${t.kind.name} · ${formatCash(t.value)}`}
                  className="grid h-9 w-9 place-items-center rounded-lg border-2 bg-white text-xl"
                  style={{ borderColor: RARITY_COLOR[t.kind.rarity] }}
                >
                  {t.kind.icon}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#8a5a34]">
              Adventures {adventures.list.filter((a) => a.state === ST.Done).length} / {adventures.list.length}
            </div>
            {adventures.list.map((a) => (
              <div key={a.def.id} className="flex items-center justify-between text-sm">
                <span>
                  {a.def.icon} {a.def.title}
                </span>
                <span>{a.state === ST.Done ? "✅" : a.state === ST.New ? "❗" : a.state === ST.Ready ? "❓" : `${Math.max(0, a.progress)}/${a.def.count}`}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-[#5a4a34]">
            <span>🔴 You</span>
            <span>🟡 Goal</span>
            <span>🟢 Grinder ($)</span>
            <span>🔥 Campfire</span>
            <span>⭐ Treasure</span>
            <span>🟫 Firewood</span>
            <span>🧺 Food store</span>
            <span>💧 Water</span>
            <span>🟣 Berries</span>
            <span>🔵 Party</span>
            <span>🐗 Boar / 🐆 Jaguar</span>
            <span>❗ Adventure</span>
          </div>
        </aside>
      </div>
    </Panel>
  );
}
