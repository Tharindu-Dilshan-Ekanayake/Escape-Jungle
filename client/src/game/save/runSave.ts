import { RUN_MSG, SAVE_RULES, type PlayerSave } from "@shared";
import { BALANCE } from "../../config/balance";
import { TREASURES } from "../../config/loot";
import { ZONES1 } from "../../config/zones1";
import { economy, type ToolKey } from "../economy/economy";
import { survival } from "../survival/survival";
import { loot } from "../loot/loot";
import { progress, runSeconds } from "../progress/progress";
import { runStats } from "../cutting/cutState";
import { player } from "../player/FirstPersonController";
import { escape } from "../escape/escape";
import { cutscene } from "../../cutscene/cutsceneState";
import { runNet } from "../../net/runNet";

/**
 * Expedition saves, client side (server: server/src/save/). The server keeps
 * the shared jungle; each player reports their OWN progress every few seconds
 * and right before leaving (quests are shared by the crew, so the server
 * saves those with the jungle). Which save a run continues (solo or exactly this
 * crew) is decided by the server; it sends our part back in runStart.
 */
const bits = (flags: boolean[]) => flags.reduce((m, on, i) => (on ? m | (1 << i) : m), 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** This player's progress right now. */
export function buildPlayerSave(): PlayerSave {
  return {
    x: r2(player.x),
    z: r2(player.z),
    yaw: r2(player.yaw),
    cash: r2(economy.cash),
    bag: economy.bag,
    bagValue: Math.round(economy.bagValue * 1000) / 1000,
    tool: economy.tool,
    levels: { ...economy.levels },
    health: r2(survival.health),
    hunger: r2(survival.hunger),
    thirst: r2(survival.thirst),
    pouch: { ...survival.pouch },
    carried: loot.carried,
    found: loot.found.map((f) => [TREASURES.indexOf(f.kind), f.value, f.zone]),
    gates: bits(progress.open),
    time: r2(runSeconds()),
    cut: runStats.cellsCut,
    blades: runStats.blades,
  };
}

/** Put saved progress back (after the stage reset everything). The shared jungle arrives separately (run sync). */
export function applyPlayerSave(s: PlayerSave) {
  economy.cash = s.cash;
  economy.bag = s.bag;
  economy.bagValue = s.bagValue;
  economy.tool = s.tool in BALANCE.tools ? (s.tool as ToolKey) : (BALANCE.startTool as ToolKey);
  for (const k of Object.keys(economy.levels) as (keyof typeof economy.levels)[]) economy.levels[k] = s.levels[k] ?? 0;
  economy.version++;

  survival.health = s.health;
  survival.hunger = s.hunger;
  survival.thirst = s.thirst;
  for (const k of Object.keys(survival.pouch) as (keyof typeof survival.pouch)[]) survival.pouch[k] = s.pouch[k] ?? 0;
  survival.version++;

  loot.carried = s.carried;
  loot.found = s.found.filter(([k]) => TREASURES[k]).map(([k, value, zone]) => ({ kind: TREASURES[k], value, zone }));
  loot.version++;

  const now = performance.now() / 1000;
  // Gates already open stay open quietly; the run clock continues from the saved time.
  progress.open = ZONES1.map((_, i) => (s.gates & (1 << i)) !== 0);
  progress.startedAt = now - s.time;
  progress.version++;
  runStats.cellsCut = s.cut;
  runStats.blades = s.blades;

  Object.assign(player, { x: s.x, y: 0, z: s.z, vx: 0, vy: 0, vz: 0, yaw: s.yaw, facing: s.yaw });
  runNet.teleport = true; // the server accepts the jump to where we were
}

/** Send my progress now (only while really playing an online run). */
export function saveNow() {
  if (!runNet.online || !runNet.room || cutscene.active || escape.active || progress.finished) return;
  runNet.room.send(RUN_MSG.save, { p: buildPlayerSave() });
}

/** We escaped: the server deletes the save so the next expedition starts fresh. */
export function sendRunFinished() {
  if (runNet.online) runNet.room?.send(RUN_MSG.finished);
}

let timer = 0;

/** Save every few seconds and when the tab is hidden or closed. Returns stop. */
export function startAutoSave() {
  window.clearInterval(timer);
  timer = window.setInterval(saveNow, SAVE_RULES.clientIntervalS * 1000);
  const onHide = () => {
    if (document.visibilityState === "hidden") saveNow();
  };
  window.addEventListener("pagehide", saveNow);
  document.addEventListener("visibilitychange", onHide);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pagehide", saveNow);
    document.removeEventListener("visibilitychange", onHide);
  };
}
