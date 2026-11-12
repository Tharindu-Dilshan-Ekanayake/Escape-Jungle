import { useEffect, useState } from "react";
import { BALANCE } from "../config/balance";
import { buyNextTool, economy, formatCash, nextTool } from "../game/economy/economy";
import { doInteract, interact } from "../game/interact/interact";
import { adventures, advanceDialogue } from "../game/adventure/adventures";
import { sfx } from "../game/audio/sfx";
import { useHud } from "./layout/hudLayout";
import { TUT_GLOW, useTutorialHighlight } from "./hud/TutorialCard";

interface UseState {
  label: string;
  icon: string;
  enabled: boolean;
  act: (() => void) | null;
}

/** What the USE button would do right now (dialogue > shop > world interaction). */
function current(): UseState | null {
  if (adventures.dialogue) return { label: "Next", icon: "💬", enabled: true, act: advanceDialogue };
  if (economy.nearShop) {
    const next = nextTool();
    if (!next) return { label: "Best tool owned", icon: "🛠️", enabled: false, act: null };
    const price = BALANCE.tools[next].price;
    const ok = economy.cash >= price;
    return {
      label: `Buy ${BALANCE.tools[next].name} ${formatCash(price)}`,
      icon: "🛒",
      enabled: ok,
      act: () => {
        if (buyNextTool()) sfx.equip();
      },
    };
  }
  const a = interact.current;
  if (!a) return null;
  const l = a.label.toLowerCase();
  const icon = l.includes("drink") ? "💧" : l.includes("pick") ? "🫐" : l.includes("cook") ? "🍖" : l.includes("store") ? "🧺" : l.includes("talk") || l.includes("hand in") ? "💬" : l.includes("lantern") ? "🏮" : l.includes("banana") ? "🍌" : l.includes("share") ? "🎁" : "✋";
  return { label: a.label, icon, enabled: !!a.act, act: a.act ? doInteract : null };
}

/**
 * Touch: one round contextual action button (the E key on desktop) with a
 * label bubble. Polled 10x/s; hidden when there's nothing to do.
 */
export function UseButton() {
  const glow = useTutorialHighlight() === "interact";
  const L = useHud((s) => s.use);
  const [state, setState] = useState<UseState | null>(null);
  useEffect(() => {
    let key = "";
    const id = window.setInterval(() => {
      const c = current();
      const k = c ? `${c.label}|${c.enabled}` : "";
      if (k !== key) {
        key = k;
        setState(c);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  // Always on screen (dim when there is nothing to do) so players know where USE is.
  if (!state)
    return (
      <div className="absolute flex flex-col items-center opacity-45" style={{ right: L.right, bottom: L.bottom, width: L.size }}>
        <div aria-hidden className="grid place-items-center rounded-full border-4 border-white/40 bg-[#8a5a34]/60 text-3xl" style={{ width: L.size, height: L.size }}>
          ✋
        </div>
      </div>
    );
  return (
    <div className="absolute flex flex-col items-center" style={{ right: L.right, bottom: L.bottom, width: L.size }}>
      <button
        type="button"
        aria-label={state.label}
        disabled={!state.enabled}
        onPointerDown={(e) => {
          e.stopPropagation();
          state.act?.();
        }}
        className={`grid place-items-center rounded-full border-4 border-[#ffd23f] bg-[#8a5a34]/85 text-3xl shadow-lg active:scale-95 disabled:border-white/40 disabled:opacity-60 ${glow ? TUT_GLOW : ""}`}
        style={{ width: L.size, height: L.size }}
      >
        {state.icon}
      </button>
    </div>
  );
}
