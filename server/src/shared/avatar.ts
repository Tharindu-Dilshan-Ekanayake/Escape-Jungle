/**
 * Boxity avatar "look": the equipped item ids we replicate between players
 * (docs/SDK.md: replicate ids only, never URLs). Shared by client + server.
 */
export const LOOK_KEYS = [
  "skin", "face", "shirt", "pants", "hat", "hair", "mask", "back", "neck", "chest", "waist",
] as const;

export type LookKey = (typeof LOOK_KEYS)[number];
export type Look = Partial<Record<LookKey, string>>;

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

/** True for a real equipped id ('-1', '', 'undefined', 'null' mean not equipped). */
export function isRealId(id: unknown): id is string {
  return typeof id === "string" && id !== "-1" && id !== "" && id !== "undefined" && id !== "null" && ID_RE.test(id);
}

/** Keep only known keys with valid ids (server-side validation, client normalisation). */
export function sanitizeLook(input: unknown): Look {
  const out: Look = {};
  if (!input || typeof input !== "object") return out;
  for (const k of LOOK_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (isRealId(v)) out[k] = v;
  }
  return out;
}

/** Emote catalogue ids are 24-char hex strings. */
export function isEmoteId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{24}$/.test(id);
}
