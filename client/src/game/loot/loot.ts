import { TREASURE, TREASURES, WOOD, type TreasureKind } from "../../config/loot";
import type { ZoneDef } from "../../config/zones1";
import type { GrassField } from "../../grass/GrassField";
import { mulberry32 } from "../../world/geo/rng";

/**
 * Firewood and treasures for one run. Items sit on a grass cell and stay
 * hidden until that cell is cut. Mutable (picked up inside useFrame); the HUD
 * polls `version`.
 */
export interface LootItem {
  /** "wood" or a treasure kind index. */
  kind: "wood" | number;
  x: number;
  z: number;
  /** Zone index (-1 = Camp 1, always visible) and the cell it hides under. */
  zone: number;
  cell: number;
  value: number;
  collected: boolean;
  /** performance.now()/1000 when first uncovered (0 = still hidden). */
  revealedAt: number;
}

export interface FoundTreasure {
  kind: TreasureKind;
  value: number;
  zone: number;
}

export const loot = {
  items: [] as LootItem[],
  /** Firewood logs being carried. */
  carried: 0,
  found: [] as FoundTreasure[],
  lastFind: null as (FoundTreasure & { at: number }) | null,
  lastWood: 0,
  carryFullUntil: 0,
  version: 0,
};

// Dev only: automated checks inspect loot (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __loot: loot });

const round2 = (v: number) => Math.round(v * 100) / 100;

function pickKind(rng: () => number, zone: number): number {
  const w = TREASURES.map((t, rank) => t.weight * (1 + rank * zone * TREASURE.zoneRarityBoost));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return w.length - 1;
}

/** Scatter wood + treasures over each zone's cuttable cells (seeded, spaced apart). */
export function createLoot(zones: { zone: ZoneDef; field: GrassField }[]) {
  const items: LootItem[] = WOOD.inCamp.map(([x, z]) => ({
    kind: "wood",
    x,
    z,
    zone: -1,
    cell: -1,
    value: 0,
    collected: false,
    revealedAt: 0,
  }));
  zones.forEach(({ field }, zi) => {
    const rng = mulberry32(WOOD.seed + TREASURE.seed + zi * 31);
    const placed: { x: number; z: number }[] = [];
    const want = WOOD.perZone + TREASURE.perZone;
    for (let tries = 0; placed.length < want && tries < 2000; tries++) {
      const cell = Math.floor(rng() * field.count);
      if (!field.type[cell]) continue;
      const x = field.cellX(cell);
      const z = field.cellZ(cell);
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 4)) continue;
      const isTreasure = placed.length >= WOOD.perZone;
      placed.push({ x, z });
      const kind = isTreasure ? pickKind(rng, zi) : "wood";
      const value = isTreasure ? round2(TREASURES[kind as number].value * (1 + zi * TREASURE.zoneValueStep)) : 0;
      items.push({ kind, x, z, zone: zi, cell, value, collected: false, revealedAt: 0 });
    }
  });
  loot.items = items;
  loot.carried = 0;
  loot.found = [];
  loot.lastFind = null;
  loot.lastWood = 0;
  loot.carryFullUntil = 0;
  loot.version++;
}

export const treasureTotal = () => loot.items.filter((i) => i.kind !== "wood").length;
