import { bloxityEnv } from "./env.js";
import { GUEST_SAVE_KEY, type VerifiedIdentity } from "../shared/index.js";

interface VerifyResponse {
  valid?: boolean;
  user?: { _id: string; username: string; displayName?: string };
  carriedFrom?: string[];
}

/**
 * SERVER IDENTITY (docs/SDK.md): verify the client's Boxity token and use ONLY
 * the returned user._id. Missing or refused token -> server-made guest id.
 */
/** A Boxity guest name looks like "Comet42": letters then up to 3 digits. Anything else is ignored. */
const GUEST_NAME = /^[A-Za-z]{2,12}[0-9]{0,3}$/;

export async function verifyPlayer(
  token: string | null | undefined,
  sessionId: string,
  guestName?: unknown,
  saveKey?: unknown,
): Promise<VerifiedIdentity> {
  // Guests keep their Boxity guest name for DISPLAY only; the account id is always made here.
  const shown = typeof guestName === "string" && GUEST_NAME.test(guestName) ? guestName : `Guest${sessionId.slice(0, 4)}`;
  // Guests may keep progress under a guest-only key from their browser (docs/SDK.md); never an account.
  const guestSave = typeof saveKey === "string" && GUEST_SAVE_KEY.test(saveKey) ? `gk_${saveKey}` : null;
  const guest: VerifiedIdentity = {
    accountId: `guest_${sessionId}`,
    username: shown,
    isGuest: true,
    saveId: guestSave,
  };
  if (!token) return guest;
  try {
    const res = await fetch(`${bloxityEnv.apiUrl}/v1/auth/game-token/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ gameSlug: bloxityEnv.gameSlug }),
    });
    if (!res.ok) return guest;
    const data = (await res.json()) as VerifyResponse;
    if (!data.valid || !data.user?._id) return guest;
    const accountId = `legion_${data.user._id}`;
    return {
      accountId,
      username: data.user.displayName || data.user.username,
      isGuest: false,
      saveId: accountId,
      carriedFrom: (data.carriedFrom ?? []).filter((id) => typeof id === "string" && id.length < 64).slice(0, 5).map((id) => `legion_${id}`),
    };
  } catch (err) {
    console.warn("[auth] token verify failed, treating as guest:", (err as Error).message);
    return guest;
  }
}
