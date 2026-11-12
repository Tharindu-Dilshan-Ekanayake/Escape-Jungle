import { GATES, ZONES1, type ZoneDef } from "./zones1";
import { ADVENTURES, type AdventureDef } from "./adventures";
import { CYCLE, LIGHT_KEYS, type LightKey } from "./night";
import { FOG } from "./render";
import { FIREWOOD, firewoodSpots } from "./firewood";
import { chapter2 } from "./chapter2";

/**
 * Every map (chapter) is data on top of the same systems. The run code reads
 * ZONES1, ADVENTURES, GATES, CYCLE, LIGHT_KEYS, FOG and FIREWOOD as before;
 * applyChapter(n) loads chapter n's values into them before the stage is built.
 */
export interface ChapterData {
  zones: ZoneDef[];
  adventures: AdventureDef[];
  clearToOpen: number;
  cycle: { day: number; dusk: number; night: number; dawn: number };
  light: { day: LightKey; dusk: LightKey; night: LightKey };
  fogStartRatio: number;
  /** Chapter 1 opens with the plane-crash intro and ends at the plane wreck. */
  intro: boolean;
  /** Shown when the chapter starts without an intro. */
  startNote?: string;
  /** Name of the starting camp (map, campfire, signs). */
  campName: string;
}

// Chapter 1 is whatever the config files say (taken once, before anything changes it).
const CH1: ChapterData = {
  zones: ZONES1.map((z) => ({ ...z })),
  adventures: ADVENTURES.map((a) => ({ ...a })),
  clearToOpen: GATES.clearToOpen,
  cycle: { day: CYCLE.day, dusk: CYCLE.dusk, night: CYCLE.night, dawn: CYCLE.dawn },
  light: { day: { ...LIGHT_KEYS.day }, dusk: { ...LIGHT_KEYS.dusk }, night: { ...LIGHT_KEYS.night } },
  fogStartRatio: FOG.startRatio,
  intro: true,
  campName: "Landing Site",
};

const DATA: Record<number, ChapterData> = { 1: CH1, 2: chapter2(CH1) };

/** Which chapter is loaded; version bumps on every change (caches compare it). */
export const chapterState = { n: 1, version: 0 };

export const chapterData = (): ChapterData => DATA[chapterState.n] ?? CH1;

/** Load chapter n into the shared config objects (call before building the stage). */
export function applyChapter(n: number) {
  const d = DATA[n] ?? CH1;
  ZONES1.splice(0, ZONES1.length, ...d.zones.map((z) => ({ ...z })));
  ADVENTURES.splice(0, ADVENTURES.length, ...d.adventures.map((a) => ({ ...a })));
  GATES.clearToOpen = d.clearToOpen;
  Object.assign(CYCLE, d.cycle);
  Object.assign(LIGHT_KEYS.day, d.light.day);
  Object.assign(LIGHT_KEYS.dusk, d.light.dusk);
  Object.assign(LIGHT_KEYS.night, d.light.night);
  FOG.startRatio = d.fogStartRatio;
  FIREWOOD.spots = firewoodSpots();
  chapterState.n = DATA[n] ? n : 1;
  chapterState.version++;
}
