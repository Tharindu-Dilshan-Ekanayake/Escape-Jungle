import { useEffect, useState } from "react";
import { BALANCE } from "../../config/balance";
import { pickShareTarget, teammates } from "../../game/survival/share";
import { affordableCount, bagCapacity, buyNextTool, economy, formatCash, isBagFull, nextTool, tool } from "../../game/economy/economy";
import { useEconomyVersion } from "../../game/economy/useEconomy";
import { HUD } from "../../config/hud";
import { CAMPFIRE } from "../../config/night";
import { loot } from "../../game/loot/loot";
import { LogIcon } from "./NightLootHud";
import { useUiStore } from "../../store/uiStore";
import { sfx } from "../../game/audio/sfx";
import { pos, useHud } from "../layout/hudLayout";
import { ToolIcon } from "./ToolIcon";
import { TUT_GLOW, useTutorialHighlight } from "./TutorialCard";

const keyCap = "rounded bg-white/90 px-1.5 text-sm font-bold text-black";

/** Carried firewood, polled (changes outside React). */
function useCarried() {
  const [n, setN] = useState(loot.carried);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => (v === loot.carried ? v : loot.carried)), HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

/** Bottom-left status card: bag (fill bar, red when full), cash and firewood, in one tidy panel. */
export function StatusCard() {
  useEconomyVersion();
  const L = useHud((s) => s.bag);
  const logs = useCarried();
  const full = isBagFull();
  const cap = bagCapacity();
  const fill = Math.min(100, (economy.bag / cap) * 100);
  const logsFull = logs >= CAMPFIRE.carryMax;
  return (
    <div className="pointer-events-none fixed z-30 origin-bottom-left select-none" style={{ ...pos(L), transform: `scale(${L.scale})` }}>
      <div className="w-[214px] rounded-2xl border-2 border-white/25 bg-gradient-to-b from-[#1d2a1d]/80 to-[#101810]/80 p-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2">
          <span className="text-3xl drop-shadow">🎒</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between font-typewriter text-outline text-white">
              <span className={`text-2xl ${full ? "text-[#ff5a4a]" : ""}`}>{economy.bag}</span>
              <span className="text-sm text-white/80">/ {cap}</span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full border border-black/60 bg-black/50">
              <div className={`h-full rounded-full transition-[width] duration-300 ${full ? "animate-pulse bg-[#ff5a4a]" : "bg-gradient-to-r from-[#7bd13a] to-[#c6f03a]"}`} style={{ width: `${fill}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/15 pt-2">
          <span className="font-typewriter text-outline text-3xl leading-none text-[#5ee05e]">{formatCash(economy.cash)}</span>
          <span className={`flex items-center gap-1 rounded-full bg-black/35 py-0.5 pl-1 pr-2 ${logsFull ? "animate-pulse" : ""}`}>
            <LogIcon size={28} />
            <span className={`font-typewriter text-outline text-lg ${logsFull ? "text-[#ffb347]" : "text-white"}`}>
              {logs}/{CAMPFIRE.carryMax}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Hotbar slot 1 with the current tool. */
export function Hotbar() {
  useEconomyVersion();
  const L = useHud((s) => s.hotbar);
  return (
    <div className="pointer-events-none fixed left-1/2 z-30 -translate-x-1/2 select-none" style={{ bottom: L.bottom }}>
      <div className="relative grid place-items-center rounded-xl border-4 border-white/85 bg-black/45" style={{ width: L.size, height: L.size }}>
        <span className="absolute left-1.5 top-0.5 font-typewriter text-outline text-lg text-white">1</span>
        <ToolIcon tool={economy.tool} size={Math.round(L.size * 0.75)} />
      </div>
      {L.label && <div className="mt-1 text-center font-lobby text-outline text-sm font-bold text-white">{tool().name}</div>}
    </div>
  );
}

/** UPGRADES (TAB) with a red badge = affordable upgrades. inline = the small one in the phones' top row. */
export function UpgradesButton({ inline = false, size = 40 }: { inline?: boolean; size?: number }) {
  useEconomyVersion();
  const L = useHud((s) => s.upgrades);
  const touch = useHud((s) => s.touch);
  const n = affordableCount();
  const glow = useTutorialHighlight() === "upgrades";
  if (inline)
    return (
      <button
        type="button"
        onClick={() => useUiStore.getState().openPanel("upgrades")}
        aria-label="Upgrades"
        className={`relative flex items-center gap-1 rounded-xl border-2 bg-[#3f8f4f]/90 px-2 font-lobby font-bold text-white shadow ${n ? "border-[#ffd23f]" : "border-black/40"} ${glow ? TUT_GLOW : ""}`}
        style={{ height: size, fontSize: size < 44 ? 13 : 15 }}
      >
        <span className="text-lg">⬆️</span>
        {n > 0 && <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-[#e8302a] text-[11px] font-bold">{n}</span>}
      </button>
    );
  return (
    <button
      type="button"
      onClick={() => useUiStore.getState().openPanel("upgrades")}
      style={pos(L)}
      className={`fixed z-30 flex flex-col items-center rounded-2xl border-4 bg-[#3f8f4f]/90 px-2 font-lobby text-white shadow-lg ${L.compact ? "w-[76px] py-0.5" : "w-28 py-2"} ${n ? "animate-pulse border-[#ffd23f]" : "border-white/70"} ${glow ? TUT_GLOW : ""}`}
    >
      {!touch && <span className={`absolute -left-2 -top-3 ${keyCap}`}>TAB</span>}
      {n > 0 && (
        <span className="absolute -right-3 -top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#e8302a] text-base font-bold">{n}</span>
      )}
      <span className={L.compact ? "text-xl" : "text-3xl"}>⬆️</span>
      <span className={`text-outline font-bold ${L.compact ? "text-[10px]" : "text-sm"}`}>UPGRADES</span>
    </button>
  );
}

/** Open the team give & swap panel (any teammate in the run). */
export function openTeamPanel() {
  if (pickShareTarget()) useUiStore.getState().openPanel("share");
}

/** Team (T, only with teammates) + upgrades (phones) + settings (Leave is inside settings; L still works). */
export function TopButtons() {
  const L = useHud((s) => s.topButtons);
  const touch = useHud((s) => s.touch);
  const mode = useHud((s) => s.mode);
  const [mates, setMates] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMates(teammates().length), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="fixed z-30 flex gap-2" style={pos(L)}>
      {mates > 0 && (
        <button
          type="button"
          onClick={openTeamPanel}
          aria-label="Team: give and swap"
          className="rounded-xl border-2 border-black/40 bg-[#2f8f4f]/90 px-3 font-lobby font-bold text-white shadow"
          style={{ height: L.size, fontSize: L.size < 44 ? 15 : 18 }}
        >
          🤝{mode === "desktop" && <span className="ml-1">Team</span>} {mode === "desktop" && !touch && <span className={`ml-1 ${keyCap}`}>T</span>}
        </button>
      )}
      {mode !== "desktop" && <UpgradesButton inline size={L.size} />}
      <button
        type="button"
        onClick={() => useUiStore.getState().openPanel("settings")}
        aria-label="Settings"
        className="grid place-items-center rounded-xl border-2 border-black/40 bg-black/45 text-xl"
        style={{ width: L.size, height: L.size }}
      >
        ⚙️
      </button>
    </div>
  );
}

/** "+$2.10" after selling, and (desktop) the tool-rack buy prompt. Touch buys with the USE button. */
export function SaleAndShop() {
  useEconomyVersion();
  const touch = useHud((s) => s.touch);
  const P = useHud((s) => s.prompt);
  const next = nextTool();
  const price = next ? BALANCE.tools[next].price : 0;
  const canAfford = economy.cash >= price;
  return (
    <>
      {economy.lastSale.amount > 0 && (
        <div key={economy.lastSale.at} className="sale-pop pointer-events-none fixed left-1/2 top-[38%] z-30 -translate-x-1/2 font-typewriter text-outline text-5xl text-[#5ee05e]">
          +{formatCash(economy.lastSale.amount)}
        </div>
      )}
      {economy.nearShop && (
        <button
          type="button"
          onClick={() => buyNextTool() && sfx.equip()}
          disabled={!next || !canAfford}
          style={{ top: P.top, fontSize: P.font }}
          className={`fixed left-1/2 z-30 w-max max-w-[92vw] -translate-x-1/2 rounded-xl bg-black/65 px-4 py-2 text-left font-typewriter text-white disabled:opacity-80 ${touch ? "border-2 border-[#ffd23f] py-2.5" : ""}`}
        >
          {next ? (
            <>
              {touch ? <span className="mr-2">👆</span> : <span className={`mr-2 ${keyCap}`}>E</span>}
              Buy {BALANCE.tools[next].name} <span className={canAfford ? "text-[#5ee05e]" : "text-[#ff6b5a]"}>{formatCash(price)}</span>
            </>
          ) : (
            "You have the best tool here"
          )}
        </button>
      )}
    </>
  );
}
