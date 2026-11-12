import { Room, type Client } from "@colyseus/core";
import { verifyPlayer } from "../platform/verifyToken.js";
import { saveStore } from "../save/store.js";
import type { JoinOptions, VerifiedIdentity } from "../shared/index.js";

/** Shared auth for every room: identity comes only from server-side verify. */
export abstract class BaseRoom<State extends object = object> extends Room<State> {
  async onAuth(client: Client, options: JoinOptions): Promise<VerifiedIdentity> {
    const id = await verifyPlayer(options?.token, client.sessionId, options?.guestName, options?.saveKey);
    // Which maps they unlocked (escaped chapters are kept with their saves).
    id.best = id.saveId ? await saveStore().getProgress(id.saveId).then((p) => p?.best ?? 0, () => 0) : 0;
    return id;
  }
}
