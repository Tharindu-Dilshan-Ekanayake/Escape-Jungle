import { Room, type Client } from "@colyseus/core";
import { verifyPlayer } from "../platform/verifyToken.js";
import type { JoinOptions, VerifiedIdentity } from "../shared/index.js";

/** Shared auth for every room: identity comes only from server-side verify. */
export abstract class BaseRoom<State extends object = object> extends Room<State> {
  async onAuth(client: Client, options: JoinOptions): Promise<VerifiedIdentity> {
    return verifyPlayer(options?.token, client.sessionId, options?.guestName);
  }
}
