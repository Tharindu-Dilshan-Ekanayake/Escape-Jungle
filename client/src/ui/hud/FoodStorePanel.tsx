import { useEffect, useState } from "react";
import { FOOD_ITEMS, RUN_RULES } from "@shared";
import { FOODS, SURVIVAL } from "../../config/survival";
import { foodStore, storePut, storeTake, storeTotal } from "../../game/survival/foodStore";
import { pouchCount, survival } from "../../game/survival/survival";
import { runNet } from "../../net/runNet";
import { useUiStore } from "../../store/uiStore";
import { Panel } from "../Panel";

/** Shared Food Store: move food between your pouch and the party's store. */
export function FoodStorePanel() {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set(foodStore.version * 1000 + survival.version), 150);
    return () => window.clearInterval(id);
  }, []);
  const close = () => useUiStore.getState().openPanel(null);
  const btn = "rounded-lg border-b-4 px-2 py-1 font-bold text-white disabled:border-gray-500 disabled:bg-gray-400";
  return (
    <Panel title="Food Store" icon="🧺" onClose={close} width="min(94vw,620px)">
      <p className="mb-3 font-lobby text-sm text-[#5a4a34]">
        {runNet.online ? "Shared with your whole party, at every camp." : "Available at every camp."} Store: {storeTotal()} / {RUN_RULES.storeCapacity} · Your
        pouch: {pouchCount()} / {SURVIVAL.pouchCapacity}
      </p>
      <div className="grid gap-2">
        {FOOD_ITEMS.map((k) => (
          <div key={k} className="flex items-center gap-3 rounded-xl bg-white/70 p-2 font-lobby text-[#3a2a1a]">
            <span className="text-3xl">{FOODS[k].icon}</span>
            <div className="flex-1">
              <div className="font-bold">{FOODS[k].name}</div>
              <div className="text-xs text-[#6b5a44]">
                {FOODS[k].edible ? `+${FOODS[k].food} food${FOODS[k].water ? `, +${FOODS[k].water} water` : ""}` : "Cook at a burning campfire"}
              </div>
            </div>
            <div className="text-center text-sm">
              <div className="font-bold">{survival.pouch[k]}</div>
              <div className="text-[10px] uppercase text-[#8a5a34]">pouch</div>
            </div>
            <button type="button" className={`${btn} border-[#2f6a1f] bg-[#4cc12e]`} disabled={survival.pouch[k] <= 0} onClick={() => storePut(k)}>
              Store ➜
            </button>
            <button type="button" className={`${btn} border-[#8a4a12] bg-[#e8892a]`} disabled={foodStore.counts[k] <= 0} onClick={() => storeTake(k)}>
              ⬅ Take
            </button>
            <div className="text-center text-sm">
              <div className="font-bold">{foodStore.counts[k]}</div>
              <div className="text-[10px] uppercase text-[#8a5a34]">store</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
