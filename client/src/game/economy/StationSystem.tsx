import { useFrame } from "@react-three/fiber";
import { CAMP1 } from "../../config/camp1";
import { STATIONS } from "../../config/economy";
import { player } from "../player/FirstPersonController";
import { economy, sellBag } from "./economy";
import { spawnCoins } from "./CoinBurst";
import { cutscene } from "../../cutscene/cutsceneState";
import { allGrinders } from "../../world/zones/stations";
import { sfx } from "../audio/sfx";
import { BALANCE } from "../../config/balance";
import { campLayouts } from "../../world/zones/baseLayout";
import type { ToolKey } from "./economy";

/** World position of a camp prop (props face the clearing centre unless rotY is set). */
function propSpot(kind: string) {
  const p = CAMP1.props.find((q) => q.kind === kind)!;
  return { x: p.x, z: p.z };
}

/** Every grinder intake (camp + outposts). */
export const GRINDERS = allGrinders();
/** Every tool shop: the camp tool board, then one per outpost, each selling a better tool. */
export const SHOPS: { x: number; z: number; tool: ToolKey }[] = [
  { ...propSpot("toolBoard"), tool: BALANCE.shopTools[0] as ToolKey },
  ...campLayouts()
    .slice(1)
    .flatMap((c, i) => (c.shop && BALANCE.shopTools[i + 1] ? [{ x: c.shop.x, z: c.shop.z, tool: BALANCE.shopTools[i + 1] as ToolKey }] : [])),
];

if (import.meta.env.DEV) Object.assign(window, { __shops: SHOPS });

/** The grinder intake nearest to (x, z) (HUD arrow target). */
export function nearestGrinder(x: number, z: number) {
  let best = GRINDERS[0];
  let bestD = Infinity;
  for (const g of GRINDERS) {
    const d = (g.ix - x) ** 2 + (g.iz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}

/**
 * Base stations: walking into the grinder's intake sells the bag (coins pop
 * out); standing at the tool rack enables the buy prompt. Mutable state only.
 */
export function StationSystem() {
  useFrame(() => {
    if (cutscene.active) return;
    const now = performance.now() / 1000;
    const g = STATIONS.grinder;
    const near = nearestGrinder(player.x, player.z);
    const dg = Math.hypot(player.x - near.ix, player.z - near.iz);
    if (dg < g.radius && economy.bag > 0 && now - economy.lastSale.at > g.cooldownS) {
      if (sellBag(now) > 0) {
        spawnCoins(near.ix, 0.7, near.iz);
        sfx.sell();
      }
    }
    let shop: ToolKey | null = null;
    for (const s of SHOPS) if (Math.hypot(player.x - s.x, player.z - s.z) < STATIONS.toolShopRadius) shop = s.tool;
    if ((shop !== null) !== economy.nearShop || shop !== economy.shopTool) {
      economy.nearShop = shop !== null;
      economy.shopTool = shop;
      economy.version++;
    }
  });
  return null;
}
