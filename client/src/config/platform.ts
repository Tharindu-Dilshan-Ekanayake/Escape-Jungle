/**
 * Boxity platform config (docs/SDK.md). Keep every platform constant here.
 */

/** Slug this game is registered under on bloxity.io (change here if the portal slug differs from the hosting id). */
export const BOXITY_GAME_SLUG = "escape-the-jungle";

/**
 * Boxity hosting id of the Colyseus backend (<id>.host.bloxity.io). Production
 * builds connect through the Boxity matchmaker (Legion.SDK.net.resolveEndpoint);
 * `npm run dev` (null here) uses the local server below.
 */
export const BOXITY_HOSTING_ID: string | null = import.meta.env.PROD ? "escape-the-jungle" : null;

/** Local dev Colyseus endpoint, used only when BOXITY_HOSTING_ID is null. */
// Dev only: `?server=ws://localhost:2667` points the client at another local server (testing).
export const DEV_SERVER_WS =
  (import.meta.env.DEV ? new URLSearchParams(location.search).get("server") : null) ?? "ws://localhost:2567";

/** Settings we support. Registering a listener shows the control in the portal menu. */
export const SUPPORTED_SETTINGS = [
  "master_volume",
  "music_volume",
  "graphics_quality",
  "show_fps",
  "camera_sensitivity",
] as const;

/**
 * Screen-ad declaration (docs/SDK.md > SCREEN ADS). Gameplay banners stay
 * OFF until the developer explicitly asks for them.
 */
export const AD_SCREENS = {
  lobby: {},
  panel: {},
  results: {},
  gameplay: {},
} as const;

export interface LeaderboardDef {
  id: string;
  label: string;
  order: "asc" | "desc";
  mode: "best" | "sum" | "latest";
  format: "number" | "compact" | "time";
  reset: "none" | "daily" | "weekly" | "monthly";
}

/**
 * Proposed boards from CLAUDE.md 5.10 (Grass Cut, Escapees, Best Times).
 * Board ids/settings are PERMANENT once declared, so define() only runs
 * after the developer confirms them (see BLOXITY_CODE_METADATA.md).
 */
export const LEADERBOARDS_CONFIRMED = false;
export const LEADERBOARDS: LeaderboardDef[] = [
  { id: "grass_cut", label: "Grass Cut", order: "desc", mode: "sum", format: "compact", reset: "none" },
  { id: "escapes", label: "Escapees", order: "desc", mode: "sum", format: "number", reset: "none" },
  { id: "best_time", label: "Best Time", order: "asc", mode: "best", format: "time", reset: "none" },
];
