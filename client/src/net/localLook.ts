import { LOOK_KEYS, sanitizeLook, type Look } from "@shared";
import { getSDK } from "../platform/boxity";

/** The local player's equipped Boxity ids + the SDK's composed skin texture URL. */
export interface LocalLook {
  look: Look;
  /** Legion.SDK.avatar.getSkinTextureUrl() (face/shirt/pants already drawn on). */
  skinUrl?: string;
}

const listeners = new Set<(l: LocalLook) => void>();
let current: LocalLook = { look: {} };
let subscribed = false;

function read(): LocalLook {
  const avatar = getSDK()?.avatar;
  if (!avatar) return { look: {} };
  try {
    // SDK slots are named hatId, skinId, ...; ours are hat, skin, ...
    const eq = avatar.getEquipped() as Record<string, unknown>;
    const raw: Record<string, unknown> = {};
    for (const k of LOOK_KEYS) raw[k] = eq[`${k}Id`];
    return { look: sanitizeLook(raw), skinUrl: avatar.getSkinTextureUrl?.() || undefined };
  } catch {
    return { look: {} };
  }
}

export function getLocalLook(): LocalLook {
  return current;
}

/** Subscribe to the local look (fires immediately, then on avatar changes / login). */
export function onLocalLook(cb: (l: LocalLook) => void): () => void {
  listeners.add(cb);
  cb(current);
  return () => {
    listeners.delete(cb);
  };
}

function refresh() {
  current = read();
  listeners.forEach((cb) => cb(current));
}

/** Call once after Legion.SDK.init (from the connection bootstrap). */
export function startLocalLook() {
  if (subscribed) return;
  subscribed = true;
  refresh();
  const sdk = getSDK();
  sdk?.avatar?.onAvatarChanged?.(() => refresh());
  sdk?.auth.onUserChanged(() => refresh());
}
