/** Jungle map (minimap + full map, M). Canvas 2D, refreshed a few times per second. */
export const MAP = {
  /** Static map resolution (pixels per metre). */
  pxPerM: 3,
  /** World padding around the zones (m). */
  pad: 26,
  /** Minimap: diameter in CSS px and the radius of world it shows (m). */
  miniSize: 176,
  miniSizeMobile: 96,
  /** Top offset (px) of the minimap: desktop (under Settings/Leave) / touch (top-left corner). */
  miniTop: 68,
  miniTopMobile: 10,
  miniRadius: 42,
  refreshMs: 100,
  key: "KeyM",
  colors: {
    paper: "#efdcae",
    paperDark: "#d9bf86",
    ink: "#4a2f16",
    jungle: "#2f6b3a",
    jungleLight: "#4c8f4c",
    sand: "#f1d58f",
    path: "#e5c27a",
    dirt: "#a9733f",
    water: "#5b9bb5",
    gateLocked: "#c0392b",
    gateOpen: "#3fae49",
    player: "#ff3b30",
    goal: "#ffd23f",
    fire: "#ff8a1c",
    treasure: "#fff1a8",
  },
  /** Map colour of the uncut plants in each zone, by plant id. */
  plantColors: { 1: "#9be22d", 2: "#4fa83a", 3: "#8fa85a", 4: "#c8d86a", 5: "#5fbf3a", 6: "#e889b8" } as Record<number, string>,
};
