import { useEffect, useState } from "react";
import { FOOD_ITEMS } from "@shared";
import { FOODS } from "../../config/survival";
import { CAMPFIRE } from "../../config/night";
import { CASH_STEPS, giveCash, giveFood, giveWood, pickShareTarget, setShareTarget, share, teammates } from "../../game/survival/share";
import { survival } from "../../game/survival/survival";
import { loot } from "../../game/loot/loot";
import { economy, formatCash } from "../../game/economy/economy";
import { useUiStore } from "../../store/uiStore";
import { Panel } from "../Panel";

/**
 * Team panel: pick any teammate in the run (near or far) and give them food,
 * firewood or cash, one tap at a time. Swapping = you both give. Anything that
 * doesn't fit in their pouch / hands comes back.
 */
export function SharePanel() {
  const [, set] = useState(0);
  const close = () => useUiStore.getState().openPanel(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      // Closes only when nobody is left to give to.
      if (!pickShareTarget()) close();
      set(survival.version * 1e6 + loot.version * 1e3 + economy.version + share.version * 1e9);
    }, 200);
    return () => window.clearInterval(id);
  }, []);
  const mates = teammates();
  const btn = "rounded-lg border-b-4 border-[#2f6a1f] bg-[#4cc12e] px-3 py-1.5 font-bold text-white active:translate-y-0.5 disabled:border-gray-500 disabled:bg-gray-400";
  const row = "flex items-center gap-3 rounded-xl bg-white/70 p-2 font-lobby text-[#3a2a1a]";
  return (
    <Panel title="Team · give & swap" icon="🤝" onClose={close} width="min(94vw,540px)">
      <div className="mb-3 flex flex-wrap gap-2">
        {mates.map((m) => (
          <button
            key={m.sid}
            type="button"
            onClick={() => setShareTarget(m.sid, m.name)}
            className={`rounded-full border-2 px-3 py-1 font-lobby font-bold ${
              m.sid === share.target.sid ? "border-[#2f6a1f] bg-[#4cc12e] text-white" : "border-[#c8b48a] bg-white/80 text-[#3a2a1a]"
            }`}
          >
            👤 {m.name}
          </button>
        ))}
      </div>
      <p className="mb-3 font-lobby text-sm text-[#5a4a34]">
        Giving to <b>{share.target.name}</b>. Want to swap? You give, they give back. If their hands are full, it comes back to you.
      </p>
      <div className="grid gap-2">
        <div className={`${row} flex-wrap`}>
          <span className="text-3xl">💵</span>
          <div className="flex-1 font-bold">
            Cash <span className="font-normal text-[#6b5a44]">{formatCash(economy.cash)}</span>
          </div>
          {CASH_STEPS.map((c) => (
            <button key={c} type="button" className={btn} disabled={economy.cash < c} onClick={() => giveCash(c)}>
              ${c}
            </button>
          ))}
        </div>
        {FOOD_ITEMS.map((k) => (
          <div key={k} className={row}>
            <span className="text-3xl">{FOODS[k].icon}</span>
            <div className="flex-1 font-bold">
              {FOODS[k].name} <span className="font-normal text-[#6b5a44]">× {survival.pouch[k]}</span>
            </div>
            <button type="button" className={btn} disabled={survival.pouch[k] <= 0} onClick={() => giveFood(k)}>
              Give
            </button>
          </div>
        ))}
        <div className={row}>
          <span className="text-3xl">🪵</span>
          <div className="flex-1 font-bold">
            Firewood <span className="font-normal text-[#6b5a44]">× {loot.carried} / {CAMPFIRE.carryMax}</span>
          </div>
          <button type="button" className={btn} disabled={loot.carried <= 0} onClick={giveWood}>
            Give
          </button>
        </div>
      </div>
    </Panel>
  );
}
