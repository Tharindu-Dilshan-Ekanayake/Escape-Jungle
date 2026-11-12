/** Minimal typings for the parts of window.Legion.SDK this game uses (docs/SDK.md). */
export interface LegionUser {
  _id: string;
  username: string;
  displayName?: string;
  email?: string;
  pfp?: string;
  avatar?: unknown;
}

export interface BloxityEnvironment {
  env: "prod" | "stage" | "local";
  apiUrl: string;
  playUrl: string;
  portalUrl: string;
  staticUrl: string;
}

type Unsubscribe = () => void;

export interface ChatMessage {
  userId: string;
  username: string;
  text: string;
  isGif: boolean;
  at: number;
  isLocalPlayer: boolean;
}

export type AdScreenType = "menu" | "lobby" | "results" | "panel" | "gameplay";

export interface AdScreen {
  state: "pending" | "showing" | "closed";
  onStateChange(cb: (state: string, reason?: string) => void): Unsubscribe;
  hide(): void;
}

/** Boxity guest (signed out): a Boxity-made name like "Comet42", kept per browser. */
export interface LegionGuest {
  username: string;
  displayName?: string;
  pfp?: string;
  isGuest: true;
}

export interface LegionSDK {
  init(opts: { gameSlug: string }): void;
  environment(): BloxityEnvironment;
  onEnvironmentChanged(cb: (env: BloxityEnvironment) => void): Unsubscribe;
  auth: {
    getUser(): LegionUser | null;
    /** The signed-out player's stable Boxity guest identity (e.g. "Comet42"); null when signed in. */
    getGuest?(): LegionGuest | null;
    /** Outside Boxity only (our own Log in button). Never inside Boxity. */
    showAuthPopup?(): Promise<LegionUser | null>;
    /** Outside Boxity only. */
    logout?(): void;
    getToken(): string | null;
    isLoggedIn(): boolean;
    onUserChanged(cb: (user: LegionUser | null) => void): Unsubscribe;
    authenticateWithServer(url: string): Promise<unknown>;
  };
  settings: {
    listen(key: string, cb: (value: string) => void): Unsubscribe;
    get(key: string): string;
    set(values: Record<string, string | number | boolean>): void;
    triggerAll(): void;
  };
  game: {
    loadingStep(text: string): void;
    loadingEnd(): void;
    gameplayStart(): void;
    gameplayEnd(): void;
    updateRoom(roomId: string, partyId?: string): void;
    registerFeature(name: string): void;
    playerJoined(username: string): void;
    playerInRoom(username: string): void;
  };
  chat?: {
    onMessage(cb: (m: ChatMessage) => void): Unsubscribe;
    bubbleText(m: ChatMessage): string;
    bubbleSeconds: number;
  };
  ads: {
    onBreakStart(cb: (e: { kind?: string }) => void): Unsubscribe | void;
    onBreakEnd(cb: (e: { kind?: string }) => void): Unsubscribe | void;
    declareScreens(screens: Record<string, unknown>): void;
    screen(type: AdScreenType, opts?: Record<string, unknown>): AdScreen;
    hideScreen(): void;
    isAvailable(): boolean;
  };
  leaderboard: {
    define(boards: unknown[]): void;
    submit(id: string, score: number): Promise<unknown>;
  };
  net: {
    resolveEndpoint(hostingId: string, opts?: { version?: string }): Promise<{ endpoint: string }>;
  };
  avatar?: {
    getEquipped(): Record<string, string | null>;
    getSkinTextureUrl?(): string;
    onAvatarChanged?(cb: (equipped: Record<string, string | null>) => void): Unsubscribe;
  };
  player: {
    onEvent(cb: (event: string, data?: unknown) => void): Unsubscribe;
  };
  portal: {
    isInIframe(): boolean;
    isEmbeddedInLegion(): boolean;
    showMenu(open: boolean): void;
  };
}

declare global {
  interface Window {
    Legion?: { SDK: LegionSDK };
    BLOXITY_ENV?: BloxityEnvironment;
  }
}
