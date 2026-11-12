/**
 * Boxity environment (docs/SDK.md > ENVIRONMENTS). Every Boxity URL on the
 * server is built from these values. The prod fallbacks below are the only
 * place Boxity hostnames are written, as the SDK spec requires.
 */
export const bloxityEnv = {
  env: process.env.BLOXITY_ENV ?? "prod",
  apiUrl: process.env.BLOXITY_API_URL ?? "https://api.bloxity.io",
  matchmakerUrl: process.env.BLOXITY_MATCHMAKER_URL ?? "https://play.bloxity.io",
  portalUrl: process.env.BLOXITY_PORTAL_URL ?? "https://bloxity.io",
  staticUrl: process.env.BLOXITY_STATIC_URL ?? "https://static.bloxity.io",
  /** Slug this game is registered under on bloxity.io. */
  gameSlug: process.env.BLOXITY_GAME_SLUG ?? "MY_GAME_SLUG",
} as const;
