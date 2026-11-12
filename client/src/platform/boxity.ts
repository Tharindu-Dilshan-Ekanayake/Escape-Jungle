/**
 * The single Boxity SDK integration point (docs/SDK.md). Nothing else in the
 * client touches window.Legion directly; import from here instead.
 */
import type { AdScreen, AdScreenType, LegionSDK } from "./legion";
import { getBloxityEnv } from "./env";
import {
  AD_SCREENS,
  BOXITY_GAME_SLUG,
  LEADERBOARDS,
  LEADERBOARDS_CONFIRMED,
  SUPPORTED_SETTINGS,
} from "../config/platform";
import { usePlatformStore } from "../store/platformStore";
import { qualityFromPlatform, useQualityStore } from "../store/qualityStore";
import { DEBUG_FROM_URL, useDebugStore } from "../store/debugStore";
import { useUiStore } from "../store/uiStore";
import { setMasterVolume, setMusicVolume, setMuted } from "../game/audio";

let sdk: LegionSDK | null = null;
let initialized = false;
const respawnListeners = new Set<() => void>();
const emoteListeners = new Set<(id: string) => void>();

/** Boxity emote picker: the local player chose an emote (catalogue id). */
export function onPlayEmote(cb: (id: string) => void) {
  emoteListeners.add(cb);
  return () => {
    emoteListeners.delete(cb);
  };
}

/** Subscribe to Boxity's "Reset Character" (instant respawn). Returns unsubscribe. */
export function onRespawnRequest(cb: () => void) {
  respawnListeners.add(cb);
  return () => {
    respawnListeners.delete(cb);
  };
}

/** The SDK, or null when the script failed to load (offline dev, blocked CDN). */
export function getSDK(): LegionSDK | null {
  return sdk;
}

let graphicsSeen = false;

function applySetting(key: (typeof SUPPORTED_SETTINGS)[number], value: string) {
  switch (key) {
    case "graphics_quality": {
      // The listener fires once right away with the saved/default value (Boxity default: "High").
      // We start on LOW so low-end PCs never lag; only a change the player makes afterwards applies.
      if (!graphicsSeen) {
        graphicsSeen = true;
        break;
      }
      const level = qualityFromPlatform(value);
      if (level) useQualityStore.getState().setRequested(level);
      break;
    }
    case "show_fps":
      useDebugStore.getState().setOverlay(value === "true" || DEBUG_FROM_URL);
      break;
    case "master_volume": {
      const v = Number(value);
      if (Number.isFinite(v)) {
        usePlatformStore.setState({ masterVolume: v });
        setMasterVolume(v);
      }
      break;
    }
    case "music_volume": {
      const v = Number(value);
      if (Number.isFinite(v)) {
        usePlatformStore.setState({ musicVolume: v });
        setMusicVolume(v);
      }
      break;
    }
    case "camera_sensitivity": {
      const v = Number(value);
      if (Number.isFinite(v)) usePlatformStore.setState({ cameraSensitivity: v });
      break;
    }
  }
}

/** Call ONCE on startup, before any other SDK use. Safe if the SDK is missing. */
export function initBoxity() {
  if (initialized) return;
  initialized = true;

  sdk = window.Legion?.SDK ?? null;
  if (!sdk) {
    console.warn("[boxity] SDK not loaded; running without platform features.");
    usePlatformStore.setState({ env: getBloxityEnv() });
    return;
  }

  try {
    sdk.init({ gameSlug: BOXITY_GAME_SLUG });
  } catch (err) {
    console.error("[boxity] init failed:", err);
    sdk = null;
    return;
  }

  // Emotes: Boxity draws the picker; register on boot so its button appears.
  sdk.game.registerFeature("emotes");

  // Ad breaks (REQUIRED): pause the simulation and mute all audio.
  sdk.ads.onBreakStart(() => {
    usePlatformStore.setState({ adBreak: true });
    setMuted(true);
  });
  sdk.ads.onBreakEnd(() => {
    usePlatformStore.setState({ adBreak: false });
    setMuted(false);
  });

  // Screen ads (REQUIRED): list every screen once. Gameplay banners stay off.
  sdk.ads.declareScreens(AD_SCREENS);

  // Leaderboards: ids are permanent, so only declare once confirmed.
  if (LEADERBOARDS_CONFIRMED) sdk.leaderboard.define(LEADERBOARDS);

  // Environment is told by the platform; keep the store in sync.
  usePlatformStore.setState({
    sdkAvailable: true,
    embedded: sdk.portal.isEmbeddedInLegion(),
    env: getBloxityEnv(),
  });
  sdk.onEnvironmentChanged((env) => usePlatformStore.setState({ env }));

  // Settings: each listener fires immediately, then on change.
  for (const key of SUPPORTED_SETTINGS) {
    sdk.settings.listen(key, (value) => applySetting(key, value));
  }

  // The ONE auth subscription: source of truth for user-facing identity.
  // Signed out -> Boxity's own guest identity (a Boxity-made name like "Comet42", same in every Boxity game).
  const auth = sdk.auth;
  auth.onUserChanged((user) => usePlatformStore.setState({ user, guest: user ? null : (auth.getGuest?.() ?? null) }));

  // Portal player events: "Reset Character" and pointer-lock changes.
  sdk.player.onEvent((event, data) => {
    if (event === "respawn_request") respawnListeners.forEach((cb) => cb());
    else if (event === "play_emote" && typeof data === "string") emoteListeners.forEach((cb) => cb(data));
    else if (event === "pointer_lock_changed") useUiStore.setState({ pointerLocked: data === true });
  });

  console.info(`[boxity] initialized (env=${getBloxityEnv().env}, embedded=${sdk.portal.isEmbeddedInLegion()})`);
}

export function loadingStep(text: string) {
  sdk?.game.loadingStep(text);
}

export function loadingEnd() {
  sdk?.game.loadingEnd();
}

export function gameplayStart() {
  sdk?.game.gameplayStart();
}

export function gameplayEnd() {
  sdk?.game.gameplayEnd();
}

let currentScreen: AdScreen | null = null;

/** Report a declared screen as it opens (replaces the previous one). */
export function reportScreen(type: AdScreenType) {
  if (!sdk) return;
  currentScreen = sdk.ads.screen(type);
}

export function hideScreen() {
  currentScreen?.hide();
  currentScreen = null;
}

/** Token to send in Colyseus join options; the server verifies it. */
/** The name to show for the local player: account name, else the Boxity guest name. */
export function localPlayerName(): string {
  const { user, guest } = usePlatformStore.getState();
  return user?.displayName || user?.username || guest?.displayName || guest?.username || "";
}

/** Boxity guest name sent with the join options (display only; the server still makes the guest id). */
export function guestNameForServer(): string | undefined {
  // Read the SDK directly: at boot the store may not have the guest yet.
  if (sdk?.auth.getUser()) return undefined;
  return sdk?.auth.getGuest?.()?.username ?? usePlatformStore.getState().guest?.username;
}

export function getAuthToken(): string | null {
  return sdk?.auth.getToken() ?? null;
}

/** Tell Boxity the room players can join ('' in menus / offline). */
export function updateRoom(roomId: string) {
  sdk?.game.updateRoom(roomId);
}

/** Friend-join toasts: someone joined after us. */
export function playerJoined(username: string) {
  sdk?.game.playerJoined(username);
}

/** Friend-join toasts: someone was already in the room when we joined. */
export function playerInRoom(username: string) {
  sdk?.game.playerInRoom(username);
}

/**
 * Boxity draws the chat UI; the game only shows each player's latest message
 * above their character. Returns unsubscribe (no-op without the SDK).
 */
export function onChatBubble(cb: (userId: string, text: string, seconds: number, isLocal: boolean) => void) {
  if (!sdk?.chat) return () => {};
  const chat = sdk.chat;
  return chat.onMessage((m) => cb(m.userId, chat.bubbleText(m), chat.bubbleSeconds, m.isLocalPlayer));
}
