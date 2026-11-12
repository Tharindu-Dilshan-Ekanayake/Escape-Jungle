/** Options every client sends when joining a room. */
export interface JoinOptions {
  /** Legion.SDK.auth.getToken(); verified server-side, never trusted as-is. */
  token?: string | null;
  /** Boxity guest name (Legion.SDK.auth.getGuest().username) when signed out. Display only, never an id. */
  guestName?: string;
  /** Signed-out browsers only: a random key kept in this browser for guest saves (never an account id). */
  saveKey?: string;
}

/** Identity the server attaches to a client after verification. */
export interface VerifiedIdentity {
  /** "legion_<id>" for verified accounts, "guest_<sessionId>" otherwise. */
  accountId: string;
  username: string;
  isGuest: boolean;
  /** Whose saves this player uses: the verified account, a guest-only key, or null (no saving). */
  saveId: string | null;
  /** Boxity guest accounts this browser played as before signing in (their progress may carry over). */
  carriedFrom?: string[];
  /** Highest chapter this player escaped (0 = none yet); loaded at join. */
  best?: number;
}
