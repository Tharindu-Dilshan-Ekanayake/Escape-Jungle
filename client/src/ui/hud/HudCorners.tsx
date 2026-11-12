import { useEffect, useState } from "react";
import { BALANCE } from "../../config/balance";
import { pickShareTarget, teammates } from "../../game/survival/share";
import { affordableCount, bagCapacity, buyNextTool, economy, formatCash, isBagFull, nextTool, tool } from "../../game/economy/economy";
import { useEconomyVersion } from "../../game/economy/useEconomy";
import { leaveRun } from "../../net/lobbyConnection";
import { useUiStore } from "../../store/uiStore";
import { sfx } from "../../game/audio/sfx";
import { pos, useHud } from "../layout/hudLayout";
import { ToolIcon } from "./ToolIcon";
import { TUT_GLOW, useTutorialHighlight } from "./TutorialCard";

const keyCap = "rounded bg-white/90 px-1.5 text-sm font-bold text-black";

/** Bag count / capacity (red when full) and cash; scales down on phones. */
export function BagCash() {
  useEconomyVersion();
  const L = useHud((s) => s.bag);
  const full = isBagFull();
  return (
    <div className="pointer-events-none fixed z-30 origin-bottom-left select-none" style={{ ...pos(L), transform: `scale(${L.scale})` }}>
      <div className="flex items-end gap-2">
        <div className="relative text-5xl drop-shadow">🎒</div>
        <div className="leading-none">
          <div className="font-typewriter text-outline text-sm text-white">{bagCapacity()}</div>
          <div className={`font-typewriter text-outline text-4xl ${full ? "text-[#ff4d3d]" : "text-white"}`}>{economy.bag}</div>
        </div>
      </div>
      <div className="font-typewriter text-outline mt-1 text-4xl text-[#5ee05e]">{formatCash(economy.cash)}</div>
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

/** UPGRADES (TAB) with a red badge = affordable upgrades. */
export function UpgradesButton() {
  useEconomyVersion();
  const L = useHud((s) => s.upgrades);
  const touch = useHud((s) => s.touch);
  const n = affordableCount();
  const glow = useTutorialHighlight() === "upgrades";
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

/** Settings + Team (T, only with teammates) + Leave (L). */
export function TopButtons() {
  const L = useHud((s) => s.topButtons);
  const touch = useHud((s) => s.touch);
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
          🤝 Team {!touch && <span className={`ml-1 ${keyCap}`}>T</span>}
        </button>
      )}
      <button
        type="button"
        onClick={() => useUiStore.getState().openPanel("settings")}
        aria-label="Settings"
        className="grid place-items-center rounded-xl border-2 border-black/40 bg-black/45 text-xl"
        style={{ width: L.size, height: L.size }}
      >
        ⚙️
      </button>
      <button
        type="button"
        onClick={leaveRun}
        className="rounded-xl border-2 border-black/40 bg-[#c0392b]/90 px-3 font-lobby font-bold text-white shadow"
        style={{ height: L.size, fontSize: L.size < 44 ? 15 : 18 }}
      >
        Leave {!touch && <span className={`ml-1 ${keyCap}`}>L</span>}
      </button>
    </div>
  );
}

/** "+$2.10" after selling, and (desktop) the tool-rack buy prompt. Touch buys with the USE button. */
export function SaleAndShop() {
  useEconomyVersion();
  const touch = useHud((s) => s.touch);
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
      {economy.nearShop && !touch && (
        <button
          type="button"
          onClick={() => buyNextTool() && sfx.equip()}
          disabled={!next || !canAfford}
          className="fixed left-1/2 top-[56%] z-30 -translate-x-1/2 rounded-xl bg-black/60 px-4 py-2 text-left font-typewriter text-white disabled:opacity-80"
        >
          {next ? (
            <>
              <span className={`mr-2 ${keyCap}`}>E</span>
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
