import { ADVENTURES, ADVENTURE_RULES as R, type AdventureDef } from "../../config/adventures";
import type { ZoneDef } from "../../config/zones1";
import { CAMP1 } from "../../config/camp1";
import type { GrassField } from "../../grass/GrassField";
import type { CampLayout } from "../../world/zones/baseLayout";
import type { FireSpot } from "../campfire/campfires";
import { outpostPlan } from "../../world/zones/outpostLayout";
import { mulberry32 } from "../../world/geo/rng";
import { addCash } from "../economy/economy";
import { note, survival, bumpSurvival } from "../survival/survival";
import { sfx } from "../audio/sfx";
import type { Action } from "../interact/interact";
import { sendAdv } from "../../net/runNet";

/**
 * Per-player mini adventures (one per area). Mutable; the HUD polls `version`.
 * States: 0 new, 1 active, 2 ready to hand in, 3 done.
 */
export const ST = { New: 0, Active: 1, Ready: 2, Done: 3 } as const;

export interface AdvItem {
  x: number;
  z: number;
  /** Grass cell it hides under (-1 = always reachable). */
  zone: number;
  cell: number;
  got: boolean;
}

export interface Adventure {
  def: AdventureDef;
  state: number;
  progress: number;
  items: AdvItem[];
  npc: { x: number; z: number; yaw: number };
  startedAt: number;
  /** This player already got the reward (crew quests pay everyone once). */
  rewarded: boolean;
}

export interface Dialogue {
  name: string;
  lines: string[];
  index: number;
  onEnd: (() => void) | null;
}

export const adventures = {
  list: [] as Adventure[],
  dialogue: null as Dialogue | null,
  celebrate: null as { title: string; icon: string; reward: number; at: number } | null,
  version: 0,
};

// Dev only: automated checks drive adventures (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __adventures: adventures });

const bump = () => {
  adventures.version++;
};
export const doneCount = () => adventures.list.filter((a) => a.state === ST.Done).length;

/** Where the giver of zone `zi` stands (crash site for the meadow, else the outpost before the zone). */
function npcSpot(zi: number) {
  // Captain Rusty stands by his plane's nose wreck, looking at where you wake up.
  if (zi === 0) return { x: 2.2, z: -1.4, yaw: Math.atan2(CAMP1.spawn.x - 2.2, CAMP1.spawn.z + 1.4) };
  const n = outpostPlan(zi - 1).npc;
  return { x: n.x, z: n.z, yaw: n.rotY };
}


/** Seeded item spots on cuttable cells of a zone, spaced apart. */
function itemsIn(zone: ZoneDef, zi: number, field: GrassField, n: number): AdvItem[] {
  const rng = mulberry32(R.seed + zi * 17);
  const out: AdvItem[] = [];
  const r = zone.rect;
  for (let t = 0; t < 3000 && out.length < n; t++) {
    const cell = Math.floor(rng() * field.count);
    if (!field.type[cell]) continue;
    const x = field.cellX(cell);
    const z = field.cellZ(cell);
    if (x < r.minX + 4 || x > r.maxX - 4 || z < r.minZ + 4 || z > r.maxZ - 4) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
    out.push({ x, z, zone: zi, cell, got: false });
  }
  return out;
}

export function createAdventures(zones: { zone: ZoneDef; field: GrassField }[], camps: CampLayout[], fires: FireSpot[]) {
  void camps; // layout args kept for callers; givers stand where the outpost plan says
  void fires;
  adventures.list = ADVENTURES.map((def) => {
    const { zone, field } = zones[def.zone];
    const hidden = def.id === "luggage" || def.id === "frogs" || def.id === "lanterns";
    const rect = zone.rect;
    const items = hidden
      ? itemsIn(zone, def.zone, field, def.count)
      : def.id === "butterflies"
        ? Array.from({ length: def.count }, (_, k) => ({ x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 + k, zone: def.zone, cell: -1, got: false }))
        : [];
    return { def, state: ST.New, progress: 0, items, npc: npcSpot(def.zone), startedAt: 0, rewarded: false };
  });
  adventures.dialogue = null;
  adventures.celebrate = null;
  bump();
}

export function say(name: string, lines: string[], onEnd: (() => void) | null = null) {
  adventures.dialogue = { name, lines, index: 0, onEnd };
  sfx.click();
  bump();
}

/** E / tap while a dialogue is open: next line (runs onEnd after the last). */
export function advanceDialogue() {
  const d = adventures.dialogue;
  if (!d) return;
  d.index++;
  if (d.index >= d.lines.length) {
    adventures.dialogue = null;
    d.onEnd?.();
  } else sfx.click();
  bump();
}

/** Tell the crew this quest changed (online runs; offline it does nothing). reset = a timed quest restarted. */
function share(a: Adventure, reset = false) {
  const i = adventures.list.indexOf(a);
  if (i >= 0) sendAdv({ i, s: a.state, p: a.progress, g: gotBits(a), r: reset });
}
const gotBits = (a: Adventure) => a.items.reduce((m, it, k) => (it.got ? m | (1 << k) : m), 0);

/** Finished: reward (once per player) and celebrate. */
function reward(a: Adventure, crew: string | null) {
  a.state = ST.Done;
  if (a.rewarded) return;
  a.rewarded = true;
  addCash(a.def.reward);
  adventures.celebrate = { title: crew ? `${a.def.title} (team)` : a.def.title, icon: a.def.icon, reward: a.def.reward, at: performance.now() / 1000 };
  sfx.fanfare();
}

export function complete(a: Adventure) {
  reward(a, null);
  share(a);
  bump();
}

/**
 * A crew member changed a quest (or the run sync on joining/continuing: quiet,
 * no popups or rewards). One player talking to a quest giver, finding items
 * or handing in counts for the whole crew; everyone gets the reward once.
 */
export function applyShared(st: { i: number; s: number; p: number; g: number; r?: boolean }, by: string | null, quiet: boolean) {
  const a = adventures.list[st.i];
  if (!a) return;
  const was = a.state;
  const now = performance.now() / 1000;
  if (st.r && st.s === ST.Active) {
    a.progress = st.p;
    a.startedAt = now;
    a.items.forEach((it, k) => (it.got = (st.g & (1 << k)) !== 0));
  } else if (st.s >= a.state) {
    a.state = st.s;
    a.progress = Math.max(a.progress, st.p);
    a.items.forEach((it, k) => (it.got ||= (st.g & (1 << k)) !== 0));
  } else return; // we are ahead: our own update is on its way
  // Two players finding the last items at once: whoever sees the full set moves it on.
  const got = a.items.filter((it) => it.got).length;
  if (a.state === ST.Active && a.items.length && got > a.progress) a.progress = got;
  if (a.state === ST.Active && a.progress >= a.def.count && !quiet) {
    if (a.def.turnIn) a.state = ST.Ready;
    else reward(a, by);
    share(a);
  }
  if (quiet) {
    if (a.state === ST.Done) a.rewarded = true; // paid before (it is in the saved cash)
  } else if (a.state !== was) {
    const who = by ?? "A friend";
    if (a.state === ST.Active) {
      a.startedAt = now;
      note(`${a.def.icon} ${who} started: ${a.def.title}`);
    } else if (a.state === ST.Ready) note(`${a.def.icon} ${who} finished it! Hand it in to ${a.def.npc.name}`);
    else if (a.state === ST.Done) reward(a, who);
  }
  bump();
}

/** Progress +1; finishes or becomes ready to hand in at the target count. */
export function addProgress(a: Adventure) {
  if (a.state !== ST.Active) return;
  a.progress++;
  if (a.progress >= a.def.count) {
    if (a.def.turnIn) {
      a.state = ST.Ready;
      note(`${a.def.icon} Done! Go back to ${a.def.npc.name}`);
    } else complete(a);
  }
  share(a);
  bump();
}

function talk(a: Adventure, now: number) {
  const d = a.def;
  if (a.state === ST.New) {
    say(d.npc.name, d.intro, () => {
      a.state = ST.Active;
      a.startedAt = performance.now() / 1000;
      for (const it of a.items) it.got = false;
      a.progress = 0;
      note(`${d.icon} New adventure: ${d.title}`);
      share(a); // one talk starts it for the whole crew
      bump();
    });
  } else if (a.state === ST.Ready) {
    say(d.npc.name, [d.done], () => complete(a));
  } else if (a.state === ST.Done) {
    say(d.npc.name, ["Thanks again, hero! Good luck out there."]);
  } else if (d.id === "monkeyKing" && survival.pouch.banana > 0) {
    // Hand over bananas one by one.
    const give = Math.min(survival.pouch.banana, d.count - a.progress);
    survival.pouch.banana -= give;
    bumpSurvival();
    for (let k = 0; k < give; k++) a.progress = Math.min(d.count, a.progress + 1);
    sfx.eat();
    share(a);
    if (a.progress >= d.count) say(d.npc.name, [d.done], () => complete(a));
    else say(d.npc.name, [`MMMF! ${a.progress} of ${d.count} bananas! MORE!`]);
    bump();
  } else if (d.id === "butterflies" && a.state === ST.Active && now - a.startedAt > (d.timeLimit ?? 0)) {
    restart(a, now);
  } else {
    say(d.npc.name, [d.reminder]);
  }
}

function restart(a: Adventure, now: number) {
  a.progress = 0;
  a.startedAt = now;
  for (const it of a.items) it.got = false;
  share(a, true);
  say(a.def.npc.name, ["Let's try again! 90 seconds... GO!"]);
  bump();
}

/** Adventure interactions for the player at (px, pz), or null. */
export function adventureAction(px: number, pz: number, now: number): { key: string; action: Action } | null {
  for (const a of adventures.list) {
    if (Math.hypot(a.npc.x - px, a.npc.z - pz) < R.talkRadius) {
      const label =
        a.state === ST.Ready
          ? `Hand in to ${a.def.npc.name}`
          : a.def.timeLimit && a.state === ST.Active && now - a.startedAt > a.def.timeLimit
            ? `Try again with ${a.def.npc.name}`
          : a.def.id === "monkeyKing" && a.state === ST.Active && survival.pouch.banana > 0
            ? `Give bananas (${survival.pouch.banana})`
            : `Talk to ${a.def.npc.name}`;
      return { key: `npc-${a.def.id}-${a.state}`, action: { label, act: (t) => talk(a, t) } };
    }
    if (a.def.id === "lanterns" && a.state === ST.Active) {
      for (let k = 0; k < a.items.length; k++) {
        const it = a.items[k];
        if (it.got || Math.hypot(it.x - px, it.z - pz) > R.pickupRadius + 0.8) continue;
        return {
          key: `lantern-${k}`,
          action: {
            label: "Light the lantern",
            act: () => {
              it.got = true;
              sfx.ignite();
              addProgress(a);
            },
          },
        };
      }
    }
  }
  return null;
}

export const butterflyTimeLeft = (a: Adventure, now: number) => Math.max(0, (a.def.timeLimit ?? 0) - (now - a.startedAt));
export { restart as restartAdventure };
