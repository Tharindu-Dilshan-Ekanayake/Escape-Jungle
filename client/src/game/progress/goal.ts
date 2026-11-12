import { ZONES1 } from "../../config/zones1";
import { isBagFull } from "../economy/economy";
import { nearestGrinder } from "../economy/StationSystem";
import { player } from "../player/FirstPersonController";
import { loot } from "../loot/loot";
import { campfires, fireFull } from "../campfire/campfires";
import { dayNight } from "../time/dayNight";
import { currentZoneIndex } from "./progress";

export interface Goal {
  x: number;
  z: number;
  label: string;
  kind: "grinder" | "fire" | "gate" | "rescue";
}

/** Seconds before dusk when gathering firewood becomes the goal. */
const FIREWOOD_WARNING = 25;

/** Night is here or close. */
export const nightNear = () =>
  dayNight.phase === "dusk" || dayNight.phase === "night" || (dayNight.phase === "day" && dayNight.phaseLeft < FIREWOOD_WARNING);

/** Nearest campfire that can take more logs, or null. */
export function nearestOpenFire() {
  let best = null as (typeof campfires.fires)[number] | null;
  let bestD = Infinity;
  for (const f of campfires.fires) {
    if (fireFull(f)) continue;
    const d = Math.hypot(f.x - player.x, f.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

/** Where the player should head now (map marker + dashed route). */
export function currentGoal(): Goal {
  if (isBagFull()) {
    const g = nearestGrinder(player.x, player.z);
    return { x: g.ix, z: g.iz, label: "Grinder", kind: "grinder" };
  }
  if (loot.carried > 0 && nightNear()) {
    const f = nearestOpenFire();
    if (f) return { x: f.x, z: f.z, label: "Campfire", kind: "fire" };
  }
  const i = currentZoneIndex();
  if (i >= 0) {
    const g = ZONES1[i].gate;
    return { x: g.x, z: g.z, label: `${ZONES1[i].name} gate`, kind: "gate" };
  }
  const exit = ZONES1[ZONES1.length - 1].base;
  return { x: exit.x, z: exit.z, label: "Rescue helicopter", kind: "rescue" };
}
