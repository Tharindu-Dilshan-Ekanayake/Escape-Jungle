/** Options every client sends when joining a room. */
export interface JoinOptions {
  /** Legion.SDK.auth.getToken(); verified server-side, never trusted as-is. */
  token?: string | null;
  /** Boxity guest name (Legion.SDK.auth.getGuest().username) when signed out. Display only, never an id. */
  guestName?: string;
}

/** Identity the server attaches to a client after verification. */
export interface VerifiedIdentity {
  /** "legion_<id>" for verified accounts, "guest_<sessionId>" otherwise. */
  accountId: string;
  username: string;
  isGuest: boolean;
}
