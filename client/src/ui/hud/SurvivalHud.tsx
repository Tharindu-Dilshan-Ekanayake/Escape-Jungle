import { useEffect, useRef, useState } from "react";
import { FOOD_ITEMS, type FoodItem } from "@shared";
import { HUD } from "../../config/hud";
import { EAT_KEY, FOODS, INTERACT_KEY, SURVIVAL } from "../../config/survival";
import { eat, survival } from "../../game/survival/survival";
import { doInteract, interact } from "../../game/interact/interact";
import { economy } from "../../game/economy/economy";
import { pos, useHud } from "../layout/hudLayout";
import { TUT_GLOW, useTutorialHighlight } from "./TutorialCard";

/** Re-render when a mutable store's version changes (polled, never per frame). */
function usePolled(read: () => number, ms = HUD.pollMs) {
  const [, set] = useState(0);
  useEffect(() => {
    let last = -1;
    const id = window.setInterval(() => {
      const v = read();
      if (v !== last) {
        last = v;
        set(v);
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [read, ms]);
}
const survivalVersion = () => survival.version;
const interactVersion = () => interact.version;

function Bar({ value, color, icon, low, width }: { value: number; color: string; icon: string; low: boolean; width: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`flex items-center gap-1 ${low ? "animate-pulse" : ""}`}>
      <span className="w-6 text-center text-lg drop-shadow">{icon}</span>
      <div className="h-3.5 overflow-hidden rounded-full border-2 border-black/70 bg-black/45" style={{ width }}>
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** Health / food / water bars + the food pouch, above the hotbar. Tap a food (or press F) to eat. */
export function SurvivalBars() {
  usePolled(survivalVersion);
  const s = survival;
  const w = SURVIVAL.warnBelow;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === EAT_KEY && !e.repeat) eat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const B = useHud((st) => st.bars);
  const P = useHud((st) => st.pouch);
  const touch = useHud((st) => st.touch);
  const items = FOOD_ITEMS.filter((k) => s.pouch[k] > 0);
  const stack = B.kind === "stack";
  return (
    <>
      {items.length > 0 && (
        <div className={`fixed z-30 flex gap-1 select-none ${P.center ? "left-1/2 -translate-x-1/2" : ""}`} style={pos(P)}>
          {items.map((k: FoodItem) => (
            <button
              key={k}
              type="button"
              onClick={() => eat(k)}
              title={FOODS[k].edible ? `Eat ${FOODS[k].name}` : "Cook it at a campfire first"}
              className={`relative grid h-10 w-10 place-items-center rounded-lg border-2 bg-black/50 text-2xl ${FOODS[k].edible ? "border-white/80" : "border-[#ff8a5a]/80"}`}
            >
              {FOODS[k].icon}
              <span className="absolute -bottom-1 -right-1 rounded bg-white px-1 text-[11px] font-bold text-black">{s.pouch[k]}</span>
            </button>
          ))}
          {!touch && <span className="self-center rounded bg-white/90 px-1.5 text-xs font-bold text-black">F</span>}
        </div>
      )}
      <div
        className={`pointer-events-none fixed z-30 flex gap-x-2 gap-y-1 rounded-xl bg-black/35 px-2 py-1 select-none ${stack ? "origin-bottom-left flex-col" : "left-1/2 -translate-x-1/2"}`}
        style={{ ...pos(B), transform: stack && B.scale !== 1 ? `scale(${B.scale})` : undefined }}
      >
        <Bar width={B.barW} value={s.health} color="linear-gradient(90deg,#c0392b,#ff5a4a)" icon="❤️" low={s.health < w} />
        <Bar width={B.barW} value={s.hunger} color="linear-gradient(90deg,#c46a12,#ffb347)" icon="🍖" low={s.hunger < w} />
        <Bar width={B.barW} value={s.thirst} color="linear-gradient(90deg,#1f6fb0,#5bc0ff)" icon="💧" low={s.thirst < w} />
      </div>
    </>
  );
}

/** "E  Drink water" style prompt for the nearest interaction (a button for touch). */
export function InteractPrompt() {
  usePolled(interactVersion, 100);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === INTERACT_KEY && !e.repeat && !economy.nearShop) doInteract();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const touch = useHud((st) => st.touch);
  const P = useHud((st) => st.prompt);
  const glow = useTutorialHighlight() === "interact";
  const a = interact.current;
  if (!a || economy.nearShop) return null;
  // Touch: a big pill you just tap ("Talk to Captain Rusty"), as well as the round USE button.
  return (
    <button
      type="button"
      onClick={doInteract}
      disabled={!a.act}
      style={{ top: P.top, fontSize: P.font }}
      className={`fixed left-1/2 z-30 w-max max-w-[92vw] -translate-x-1/2 rounded-xl bg-black/65 px-4 py-2 font-typewriter text-white disabled:opacity-90 ${touch && a.act ? "border-2 border-[#ffd23f] py-2.5 active:scale-95" : ""} ${glow && a.act ? TUT_GLOW : ""}`}
    >
      {a.act && (touch ? <span className="mr-2">👆</span> : <span className="mr-2 rounded bg-white/90 px-1.5 text-sm font-bold text-black">E</span>)}
      {a.label}
    </button>
  );
}

/** Red flash when hurt, low-health pulse, short notes, and the passed-out screen. */
export function SurvivalOverlay() {
  usePolled(survivalVersion, 100);
  const flash = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!flash.current) return;
      const now = performance.now() / 1000;
      const hit = Math.max(0, 1 - (now - survival.hurtAt) / 0.5);
      const low = survival.health < SURVIVAL.warnBelow ? 0.25 + Math.sin(now * 6) * 0.1 : 0;
      flash.current.style.opacity = String(Math.max(hit * 0.7, low));
    }, 50);
    return () => window.clearInterval(id);
  }, []);
  const now = performance.now() / 1000;
  const showNote = survival.note.text && now - survival.note.at < 3;
  return (
    <>
      <div
        ref={flash}
        className="pointer-events-none fixed inset-0 z-[11]"
        style={{ background: "radial-gradient(ellipse at center, rgba(200,0,0,0) 40%, rgba(200,10,10,0.85) 100%)", opacity: 0 }}
      />
      {showNote && (
        <div key={survival.note.at} className="sale-pop pointer-events-none fixed left-1/2 top-[44%] z-30 -translate-x-1/2 whitespace-nowrap rounded-xl bg-black/55 px-4 py-1.5 font-lobby text-lg font-bold text-white">
          {survival.note.text}
        </div>
      )}
      {survival.faintAt > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 text-center font-lobby text-white transition-opacity">
          <div>
            <div className="text-4xl font-bold text-[#ff6a5a]">You passed out...</div>
            <div className="mt-2 text-lg text-white/80">You dropped your bag, firewood and raw meat.</div>
            <div className="mt-1 text-white/60">Waking up at camp</div>
          </div>
        </div>
      )}
    </>
  );
}
