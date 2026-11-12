import { FORAGE, SURVIVAL } from "../../config/survival";
import type { CampLayout, ForageLayout } from "../../world/zones/baseLayout";
import { campfires, isLit } from "../campfire/campfires";
import { addFood, drink, note, survival } from "../survival/survival";
import { sfx } from "../audio/sfx";
import { useUiStore } from "../../store/uiStore";
import { adventureAction, adventures, advanceDialogue } from "../adventure/adventures";
import { nearestTeammate, setShareTarget } from "../survival/share";
import { chop, chopTree, standing, takeLog } from "../chop/chopTrees";
import { FIREWOOD } from "../../config/firewood";
import { CAMPFIRE } from "../../config/night";
import { loot } from "../loot/loot";
import { RUN_RULES } from "@shared";
import { ESCAPE, escape, startEscape } from "../escape/escape";
import { runNet, sendBoard } from "../../net/runNet";

/** Solo / offline: off you go. A crew: the helicopter leaves when everyone still in the run is aboard. */
function boardHelicopter() {
  if (!runNet.online) {
    startEscape();
    return;
  }
  escape.boardedMe = true;
  sendBoard();
  note("🚁 You're aboard! It takes off when the whole crew is in");
  sfx.click();
}
import { ZONES1 } from "../../config/zones1";

/**
 * World interactions (E / tap the prompt): drink water, pick berries and
 * bananas, cook meat at a burning fire, open the Food Store. The nearest
 * available one becomes `interact.current`; the HUD shows it as a button.
 */
export interface Action {
  label: string;
  /** null = hint only (nothing to do yet). */
  act: ((now: number) => void) | null;
}

export const interact = {
  current: null as Action | null,
  key: "",
  /** Forage regrow times (performance.now()/1000 when ready again). */
  bushReady: [] as number[],
  bananaReady: [] as number[],
  layout: null as { camps: CampLayout[]; forage: ForageLayout } | null,
  version: 0,
};

// Dev only: automated checks trigger interactions (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __interact: interact });

export function resetInteract(camps: CampLayout[], forage: ForageLayout) {
  interact.layout = { camps, forage };
  interact.bushReady = forage.berryBushes.map(() => 0);
  interact.bananaReady = forage.bananas.map(() => 0);
  interact.current = null;
  interact.key = "";
  interact.version++;
}

const near = (x: number, z: number, px: number, pz: number, r = SURVIVAL.interactRadius) => Math.hypot(x - px, z - pz) < r;

/** Pick the best action for a player standing at (px, pz). */
export function findAction(px: number, pz: number, now: number): { key: string; action: Action } | null {
  const L = interact.layout;
  if (!L) return null;
  // Talking to quest givers / lighting lanterns comes first.
  const adv = adventureAction(px, pz, now);
  if (adv) return adv;
  // Cooking at a burning fire.
  for (let i = 0; i < campfires.fires.length; i++) {
    const f = campfires.fires[i];
    if (!near(f.x, f.z, px, pz, SURVIVAL.cookRadius)) continue;
    if (!isLit(f)) return survival.pouch.rawMeat > 0 ? { key: `fire${i}`, action: { label: "Add firewood to light the fire, then cook", act: null } } : null;
    if (survival.cooking >= 0) return { key: `cook${i}`, action: { label: `Cooking... ${Math.floor((survival.cooking / SURVIVAL.cookSeconds) * 100)}%`, act: null } };
    if (survival.pouch.rawMeat > 0)
      return { key: `fire${i}`, action: { label: `Cook meat (${survival.pouch.rawMeat})`, act: () => (survival.cooking = 0) } };
  }
  // The way out: board the rescue helicopter at the plane wreck.
  const exitPad = ZONES1[ZONES1.length - 1].base;
  if (!escape.active && near(exitPad.x, exitPad.z, px, pz, ESCAPE.boardRadius)) {
    if (escape.boardedMe) {
      const a = escape.aboard;
      return { key: `heli-wait-${a?.n ?? 1}`, action: { label: `Aboard! Waiting for the crew ${a ? `${a.n}/${a.total}` : ""}`, act: null } };
    }
    return { key: "board-heli", action: { label: "Board the helicopter 🚁", act: () => boardHelicopter() } };
  }
  // Firewood trees: take logs from a pile, or chop a standing tree (USE swings at it too).
  for (let i = 0; i < chop.trees.length; i++) {
    const t = chop.trees[i];
    if (t.pile > 0 && near(t.x + 1.1, t.z + 0.6, px, pz, FIREWOOD.takeRadius)) {
      if (loot.carried >= CAMPFIRE.carryMax) return { key: `logs${i}`, action: { label: `Hands full (${CAMPFIRE.carryMax} logs): feed a fire first`, act: null } };
      return { key: `logs${i}-${t.pile}`, action: { label: `Take firewood (${t.pile} left)`, act: () => takeLog(i) } };
    }
    if (standing(t) && near(t.x, t.z, px, pz, FIREWOOD.promptRadius))
      return { key: `tree${i}-${t.hp}`, action: { label: `Chop the tree 🪓 ${RUN_RULES.treeHp - t.hp}/${RUN_RULES.treeHp}`, act: () => chopTree(i, 1) } };
  }
  for (let i = 0; i < L.camps.length; i++) {
    const c = L.camps[i];
    if (near(c.store.x, c.store.z, px, pz, SURVIVAL.interactRadius + 0.8))
      return { key: `store${i}`, action: { label: "Open Food Store", act: () => useUiStore.getState().openPanel("store") } };
    if (near(c.water.x, c.water.z, px, pz, SURVIVAL.interactRadius + ((c.water.scale ?? 1) - 1) * 1.4)) return { key: `water${i}`, action: { label: "Drink water", act: (t) => drink(t) } };
  }
  for (let i = 0; i < L.forage.springs.length; i++) {
    const s = L.forage.springs[i];
    if (near(s.x, s.z, px, pz, SURVIVAL.interactRadius + 1)) return { key: `spring${i}`, action: { label: "Drink from the spring", act: (t) => drink(t) } };
  }
  for (let i = 0; i < L.forage.berryBushes.length; i++) {
    const b = L.forage.berryBushes[i];
    if (!near(b.x, b.z, px, pz)) continue;
    if (now < interact.bushReady[i]) return { key: `bush${i}`, action: { label: `Berries regrow in ${Math.ceil(interact.bushReady[i] - now)}s`, act: null } };
    return {
      key: `bush${i}`,
      action: {
        label: "Pick berries",
        act: (t) => {
          if (addFood("berries", FORAGE.berriesPerPick)) {
            interact.bushReady[i] = t + FORAGE.berryRegrow;
            sfx.woodPick();
            note(`+${FORAGE.berriesPerPick} berries (F to eat)`);
          }
        },
      },
    };
  }
  for (let i = 0; i < L.forage.bananas.length; i++) {
    const b = L.forage.bananas[i];
    if (!near(b.x, b.z, px, pz) || now < interact.bananaReady[i]) continue;
    return {
      key: `banana${i}`,
      action: {
        label: "Pick bananas",
        act: (t) => {
          if (addFood("banana", FORAGE.bananasPerPick)) {
            interact.bananaReady[i] = t + FORAGE.bananaRegrow;
            sfx.woodPick();
            note(`+${FORAGE.bananasPerPick} bananas (F to eat)`);
          }
        },
      },
    };
  }
  return shareAction();
}

/** Lowest priority: a teammate right next to you -> share food, firewood or cash. */
function shareAction(): { key: string; action: Action } | null {
  const t = nearestTeammate();
  if (!t) return null;
  return {
    key: `share-${t.sid}`,
    action: {
      label: `Share with ${t.name}`,
      act: () => {
        setShareTarget(t.sid, t.name);
        useUiStore.getState().openPanel("share");
      },
    },
  };
}

/** Run the current action (E key / prompt tap). */
export function doInteract() {
  if (adventures.dialogue) {
    advanceDialogue();
    return;
  }
  interact.current?.act?.(performance.now() / 1000);
  interact.version++;
}
