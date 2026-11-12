import { BALANCE } from "../../config/balance";
import { UPGRADE_CARDS, type UpgradeKey } from "../../config/economy";
import { bagCapacity, buyUpgrade, economy, formatCash, swingMultiplier, upgradePrice } from "../../game/economy/economy";
import { useEconomyVersion } from "../../game/economy/useEconomy";
import { useUiStore } from "../../store/uiStore";
import { Panel } from "../Panel";
import { sfx } from "../../game/audio/sfx";

/** What the stat is right now, in player-facing words. */
function statText(key: UpgradeKey): string {
  switch (key) {
    case "backpack":
      return `${bagCapacity()} blades`;
    case "sharpness":
      return `+${economy.levels.sharpness} a swing`;
    case "swing":
      return `x${swingMultiplier().toFixed(2)} faster`;
    case "legs":
      return `${(BALANCE.upgrades.legs.baseSpeed + BALANCE.upgrades.legs.step * economy.levels.legs).toFixed(1)} speed`;
  }
}

/** Upgrades panel (TAB): spend cash on bag space, sharpness, swing speed, walk speed. */
export function UpgradesPanel() {
  useEconomyVersion();
  const close = () => useUiStore.getState().openPanel(null);

  return (
    <Panel title="Upgrades" icon="⬆️" onClose={close}>
      <div className="mb-3 flex items-center justify-end font-lobby text-xl font-bold text-[#2f8a1f]">Cash: {formatCash(economy.cash)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {UPGRADE_CARDS.map((card) => {
          const lvl = economy.levels[card.key];
          const price = upgradePrice(card.key);
          const affordable = price !== null && economy.cash >= price;
          return (
            <div key={card.key} className={`flex flex-col items-center rounded-2xl bg-gradient-to-b ${card.color} p-3 text-white shadow`}>
              <div className="text-5xl drop-shadow">{card.icon}</div>
              <div className="font-lobby text-outline mt-1 text-xl font-bold">{card.title}</div>
              <div className="font-lobby text-outline text-sm font-semibold">{statText(card.key)}</div>
              <div className="my-2 flex flex-wrap justify-center gap-0.5">
                {Array.from({ length: BALANCE.upgrades.maxLevel }, (_, i) => (
                  <span key={i} className={`h-2 w-2 shrink-0 rounded-full border sm:h-3 sm:w-3 border-black/40 ${i < lvl ? "bg-[#c8f56a]" : "bg-black/30"}`} />
                ))}
              </div>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => buyUpgrade(card.key) && sfx.upgrade()}
                className={`w-full rounded-xl border-b-4 py-1.5 font-lobby text-outline text-lg font-bold ${
                  price === null
                    ? "border-[#8a6a10] bg-[#f2c230]"
                    : affordable
                      ? "border-[#2f8a1f] bg-gradient-to-b from-[#8af04a] to-[#4cc12e]"
                      : "border-[#7a7a7a] bg-[#b8b8b8]"
                }`}
              >
                {price === null ? "MAX" : formatCash(price)}
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
