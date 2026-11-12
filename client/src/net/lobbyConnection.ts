/**
 * Connection to the lobby room (docs/SDK.md > MULTIPLAYER CONNECTION):
 * - resolve a fresh endpoint on every connect, build a NEW Client from it;
 * - ?roomId= in the URL joins that room directly, falling back to matchmaking;
 * - always send the Boxity token; the server verifies it;
 * - retry with backoff for up to 60 s, rejoin after unexpected drops.
 * Without a server the lobby keeps working offline (solo runs).
 */
import { Client, type Room } from "colyseus.js";
import { CLOSE_REPLACED, LOBBY_RULES, MSG, ROOM_NAMES, type JoinOptions, type MovePayload, type RunMovePayload, type RunStartPayload, RUN_MSG } from "@shared";
import { BOXITY_HOSTING_ID, DEV_SERVER_WS } from "../config/platform";
import { usePlatformStore } from "../store/platformStore";
import { getAuthToken, guestNameForServer, getSDK, onChatBubble, playerInRoom, playerJoined, updateRoom } from "../platform/boxity";
import { guestSaveKey } from "../platform/saveKey";
import { saveNow } from "../game/save/runSave";
import { useLobbyStore } from "../store/lobbyStore";
import { useGameStore } from "../store/gameStore";
import { player, setPendingSpawn } from "../game/player/FirstPersonController";
import { bubbles, localEmote, remotePlayers } from "./remotePlayers";
import { getLocalLook, onLocalLook, startLocalLook } from "./localLook";
import { onPlayEmote } from "../platform/boxity";
import { loadEmoteCatalog } from "../game/avatar/boxity/emotes";
import { syncState, resetSync } from "./stateSync";
import { bindRunRoom, runNet, unbindRunRoom } from "./runNet";
import { economy } from "../game/economy/economy";

const RETRY_GIVE_UP_MS = 60_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 8_000;
const CONSENTED_CLOSE = 4000;

let client: Client | null = null;
let room: Room | null = null;
let started = false;
let triedRoomId = false;

/** Endpoint of the current room (a reconnect must go back to the same server). */
let endpointUrl = "";

async function resolveClient(): Promise<Client> {
  const sdk = getSDK();
  if (BOXITY_HOSTING_ID && sdk) {
    const { endpoint } = await sdk.net.resolveEndpoint(BOXITY_HOSTING_ID);
    endpointUrl = endpoint;
    return new Client(endpoint);
  }
  endpointUrl = DEV_SERVER_WS;
  return new Client(DEV_SERVER_WS);
}

/** The server holds a dropped player's seat (and run) this long; keep trying until just before. */
const REJOIN_MS = (LOBBY_RULES.reconnectSeconds - 4) * 1000;
const REJOIN_KEY = "ej_rejoin_v1";

/** Remember how to get this seat back if the page reloads (this tab only). */
function rememberSeat(r: Room) {
  try {
    sessionStorage.setItem(REJOIN_KEY, JSON.stringify({ token: r.reconnectionToken, endpoint: endpointUrl, at: Date.now() }));
  } catch {
    /* storage blocked: a reload just starts fresh */
  }
}
function forgetSeat() {
  try {
    sessionStorage.removeItem(REJOIN_KEY);
  } catch {
    /* ignore */
  }
}
function savedSeat(): { token: string; endpoint: string; at: number } | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(REJOIN_KEY) ?? "null");
    return s && typeof s.token === "string" && Date.now() - s.at < REJOIN_MS ? s : null;
  } catch {
    return null;
  }
}
// Leaving the page: stamp the time so a quick reload (within the minute) can take the seat back.
window.addEventListener("pagehide", () => {
  if (room) rememberSeat(room);
});

/** Start once at boot; keeps the lobby connection alive for the whole session. */
export function startLobbyConnection() {
  if (started) return;
  started = true;
  void connect();
  window.setInterval(sendMove, 1000 / LOBBY_RULES.moveHz);
  startLocalLook();
  void loadEmoteCatalog();
  onLocalLook((l) => room?.send(MSG.look, { look: l.look }));
  onPlayEmote((id) => {
    if (useGameStore.getState().scene !== "lobby") return;
    localEmote.current = { id, start: performance.now() / 1000 };
    room?.send(MSG.emote, { id });
  });
  onChatBubble((userId, text, seconds, isLocal) => {
    bubbles.set(isLocal ? "me" : `legion_${userId}`, { text, until: performance.now() / 1000 + seconds });
  });
  // Signed in or out (or the guest name arrived): rejoin the SAME lobby room so the server
  // verifies the new identity (docs/SDK.md: never re-matchmake, friends stay together).
  let identity = identityKey();
  usePlatformStore.subscribe(() => {
    const next = identityKey();
    if (next === identity) return;
    identity = next;
    if (room && useGameStore.getState().scene === "lobby") void reapplyIdentity();
  });
}

/** Only signing in or out needs a rejoin (the guest name is read at join time). */
const identityKey = () => {
  const { user } = usePlatformStore.getState();
  return user ? `u:${user._id}` : "guest";
};

async function reapplyIdentity() {
  const r = room;
  if (!r || !client) return;
  const id = r.roomId;
  room = null;
  await r.leave(true).catch(() => {});
  const options: JoinOptions = { token: getAuthToken(), guestName: guestNameForServer(), saveKey: guestSaveKey() };
  const again = await client.joinById(id, options).catch(() => null);
  if (again) attach(again);
  else await connect();
}

async function connect() {
  useLobbyStore.setState({ status: "connecting" });
  // Reloaded within the minute: take the same seat back (and with it our place in the run).
  const seat = savedSeat();
  if (seat) {
    try {
      endpointUrl = seat.endpoint;
      client = new Client(seat.endpoint);
      attach(await client.reconnect(seat.token));
      return;
    } catch {
      forgetSeat();
    }
  }
  const deadline = Date.now() + RETRY_GIVE_UP_MS;
  let delay = RETRY_BASE_MS;
  for (;;) {
    try {
      client = await resolveClient();
      const options: JoinOptions = { token: getAuthToken(), guestName: guestNameForServer(), saveKey: guestSaveKey() };
      let r: Room | null = null;
      const roomId = new URLSearchParams(location.search).get("roomId");
      if (roomId && !triedRoomId) {
        triedRoomId = true;
        r = await client.joinById(roomId, options).catch(() => null); // gone or full -> matchmaking
      }
      attach(r ?? (await client.joinOrCreate(ROOM_NAMES.lobby, options)));
      return;
    } catch (err) {
      if (Date.now() + delay > deadline) {
        console.warn("[net] lobby server unreachable; playing offline", err);
        useLobbyStore.setState({ status: "offline", roomId: "", me: "", players: [], pads: [] });
        updateRoom("");
        return;
      }
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * 2, RETRY_MAX_MS);
    }
  }
}

function attach(r: Room) {
  room = r;
  resetSync();
  bindRunRoom(r);
  rememberSeat(r);
  // Back after a drop while still in the jungle: ask for everything we missed.
  const gs = useGameStore.getState();
  if (gs.scene === "run" && gs.run && !gs.run.solo) r.send(RUN_MSG.hello);
  useLobbyStore.setState({ status: "online", roomId: r.roomId, me: r.sessionId });
  updateRoom(r.roomId);

  let first = true;
  r.onStateChange((state) => {
    syncState(state, r.sessionId, (name) => (first ? playerInRoom(name) : playerJoined(name)));
    first = false;
  });
  r.onMessage(MSG.teleport, (p: MovePayload) => {
    Object.assign(player, { x: p.x, z: p.z, yaw: p.yaw, facing: p.yaw, vx: 0, vz: 0 });
    setPendingSpawn(p);
  });
  r.onMessage(MSG.emote, (m: { sid: string; id: string }) => {
    const rp = remotePlayers.get(m.sid);
    if (rp) rp.emote = { id: m.id, start: performance.now() / 1000 };
  });
  r.send(MSG.look, { look: getLocalLook().look });
  r.onMessage(MSG.runStart, (p: RunStartPayload) => {
    lastTool = ""; // the server cleared it for the new run: send ours with the next move
    useGameStore.getState().enterRun({ ...p, solo: false });
  });
  r.onLeave((code) => {
    if (room === r) room = null;
    unbindRunRoom(r);
    updateRoom("");
    if (code === CONSENTED_CLOSE) {
      forgetSeat();
      return;
    }
    if (code === CLOSE_REPLACED) {
      // We joined from another tab or device: this one steps aside.
      forgetSeat();
      if (useGameStore.getState().scene === "run") useGameStore.getState().leaveRun();
      useLobbyStore.setState({ status: "offline", roomId: "", me: "", players: [], pads: [] });
      return;
    }
    void rejoin(r.reconnectionToken);
  });
}

/**
 * Network trouble: keep trying to take the same seat back for (almost) the
 * minute the server holds it, so we stay in our run. Too late: the run went on
 * without us; back to the lobby (our progress was saved) and join fresh.
 */
async function rejoin(token: string) {
  useLobbyStore.setState({ status: "connecting" });
  const deadline = Date.now() + REJOIN_MS;
  let delay = RETRY_BASE_MS;
  while (client && Date.now() < deadline) {
    try {
      attach(await client.reconnect(token));
      return;
    } catch {
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * 2, 4000);
    }
  }
  forgetSeat();
  if (useGameStore.getState().scene === "run") useGameStore.getState().leaveRun();
  await connect();
}

// Infinity (not NaN): the first comparison must count as "moved" so the first update goes out.
let lastX = Infinity;
let lastZ = Infinity;
let lastYaw = Infinity;
let lastY = Infinity;

/** My clock for remote interpolation: seconds, wrapped to stay precise as a float32. */
const senderTime = () => Math.round(((performance.now() / 1000) % 4096) * 1000) / 1000;

let lastSwing = 0;
let lastTool = "";

/** Position updates (moveHz) in the lobby and in online runs, only when something changed. */
function sendMove() {
  if (!room) return;
  const scene = useGameStore.getState().scene;
  if (scene === "run" && !runNet.online) return;
  // In the jungle the camera yaw is the body direction (first person).
  const yaw = scene === "run" ? player.yaw : player.facing;
  const moved = Math.abs(player.x - lastX) > 0.02 || Math.abs(player.z - lastZ) > 0.02 || Math.abs(yaw - lastYaw) > 0.03 || Math.abs(player.y - lastY) > 0.05;
  const extra = scene === "run" && (runNet.swingCount !== lastSwing || economy.tool !== lastTool || runNet.teleport);
  if (!moved && !extra) return;
  lastX = player.x;
  lastZ = player.z;
  lastYaw = yaw;
  lastY = player.y;
  if (scene === "run") {
    lastSwing = runNet.swingCount;
    lastTool = economy.tool;
    const msg: RunMovePayload = { x: player.x, z: player.z, y: Math.round(player.y * 100) / 100, st: senderTime(), yaw, tool: economy.tool, sw: runNet.swingCount & 255 };
    if (runNet.teleport) msg.tp = true;
    runNet.teleport = false;
    room.send(MSG.move, msg);
    return;
  }
  room.send(MSG.move, { x: player.x, z: player.z, yaw, y: Math.round(player.y * 100) / 100, st: senderTime() } as RunMovePayload);
}

/** Host of a pad: the map the crew will play. */
export function sendPadChapter(chapter: number) {
  room?.send(MSG.padChapter, { chapter });
}


/** PLAY button: online the server picks a pad; offline we just walk-teleport locally. */
export function quickJoin(offlineTarget?: { x: number; z: number }) {
  if (room) room.send(MSG.quickJoin);
  else if (offlineTarget) Object.assign(player, { x: offlineTarget.x, z: offlineTarget.z, vx: 0, vz: 0 });
}

/** Leave the jungle run and return to the lobby. */
export function leaveRun() {
  saveNow(); // last save first (same socket, so the server gets it before the leave)
  room?.send(MSG.leaveRun);
  useGameStore.getState().leaveRun();
}
