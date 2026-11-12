import { ZONES1 } from "./zones1";

/** Where firewood trees stand inside each zone (fractions of the zone rect, near its edges). */
const IN_ZONE: [number, number][] = [
  [0.12, 0.22],
  [0.88, 0.55],
  [0.24, 0.86],
];

/**
 * Firewood trees at the Landing Site and in every zone: chop them (any blade, swing at the trunk)
 * and they fall into a pile of logs anyone in the team can carry to a fire.
 * Hits, logs and regrow time are shared rules (RUN_RULES.tree*).
 */
/** Firewood tree spots for the zones currently loaded (applyChapter refreshes them). */
export function firewoodSpots(): [number, number][] {
  return [
    [-8.2, -5.8],
    [-10.2, -1.8],
    [7.4, -8.0],
    ...ZONES1.flatMap((zn) => IN_ZONE.map(([fx, fz]) => [zn.rect.minX + fx * (zn.rect.maxX - zn.rect.minX), zn.rect.minZ + fz * (zn.rect.maxZ - zn.rect.minZ)] as [number, number])),
  ];
}

export const FIREWOOD = {
  /** Tree spots [x, z]: three by the stone head at the Landing Site, then three per zone (per chapter). */
  spots: firewoodSpots(),
  /** Grass is kept clear this far round each trunk. */
  grassClear: 1.9,
  /** Only trees this close to the camera are drawn. */
  drawRange: 55,
  /** Swing reach to the trunk (m, added to the tool range check). */
  reach: 2.6,
  /** Stand this close to a tree for the "Chop" prompt (E / USE). */
  promptRadius: 2.2,
  /** Trunk collider radius (the stump stays solid). */
  trunkR: 0.45,
  /** Stand this close to a log pile to take a log (E / USE). */
  takeRadius: 2.4,
  /** Fall animation and hit shake (s). */
  fallS: 1.1,
  shakeS: 0.35,
};
