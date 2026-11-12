import type { BloxityEnvironment } from "./legion";

/**
 * The ONE client-side environment helper (docs/SDK.md > ENVIRONMENTS).
 * Order: SDK-told environment -> window.BLOXITY_ENV -> prod fallback.
 * Never derive the environment from hostname, referrer or build flags.
 */
const PROD_FALLBACK: BloxityEnvironment = {
  env: "prod",
  apiUrl: "https://api.bloxity.io",
  playUrl: "https://play.bloxity.io",
  portalUrl: "https://bloxity.io",
  staticUrl: "https://static.bloxity.io",
};

export function getBloxityEnv(): BloxityEnvironment {
  try {
    const fromSdk = window.Legion?.SDK?.environment?.();
    if (fromSdk) return fromSdk;
  } catch {
    /* SDK not ready yet: fall through */
  }
  return window.BLOXITY_ENV ?? PROD_FALLBACK;
}
