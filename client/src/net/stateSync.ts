import { useLobbyStore, type PadView, type PlayerView } from "../store/lobbyStore";
import { avatarScope, colorsFor, pushSnapshot, remotePlayers, snapRemote } from "./remotePlayers";

/** Shape of the decoded server state we read (see server/src/rooms/schema.ts). */
interface NetPlayer {
  name: string;
  uid: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  zone: string;
  connected: boolean;
  look: string;
  tool: string;
  swing: number;
  best: number;
  st: number;
  /** Own countdown on a solo pad (-1 none). */
  wait: number;
}
interface NetPad {
  index: number;
  host: string;
  maxPlayers: number;
  chapter: number;
  members: Iterable<string>;
  countdown: number;
}
interface NetState {
  players: { forEach(cb: (p: NetPlayer, id: string) => void): void };
  pads: Iterable<NetPad>;
}

/**
 * Map a sender timestamp onto my clock: offset = arrival - sent, tracking the
 * fastest packet (lowest latency) and drifting up slowly. Movement is then
 * spaced by when it happened, not by when bursty packets arrived.
 */
function snapshotTime(r: { stOffset: number; stLast: number }, st: number): number {
  const now = performance.now() / 1000;
  if (!st) return now;
  const cand = now - st;
  if (!Number.isFinite(r.stOffset) || st < r.stLast - 1 || Math.abs(cand - r.stOffset) > 1) r.stOffset = cand; // first, wrap or big jump
  else r.stOffset = Math.min(cand, r.stOffset + 0.002);
  r.stLast = st;
  return Math.min(now, st + r.stOffset);
}

let lastPlayersKey = "";
let lastPadsKey = "";
const known = new Set<string>();

export function resetSync() {
  lastPlayersKey = "";
  lastPadsKey = "";
  known.clear();
  remotePlayers.clear();
}

/**
 * Called after every state patch (10/s). Positions go to the mutable remote
 * map; the UI store is only touched when names/zones/pads actually changed.
 */
export function syncState(state: NetState, me: string, onNewPlayer: (name: string) => void) {
  const players: PlayerView[] = [];
  const seen = new Set<string>();
  state.players.forEach((p, id) => {
    seen.add(id);
    players.push({ id, name: p.name, uid: p.uid, zone: p.zone, connected: p.connected, best: p.best ?? 0, wait: p.wait ?? -1 });
    if (!known.has(id)) {
      known.add(id);
      if (id !== me) onNewPlayer(p.name);
    }
    if (id === me) return;
    let r = remotePlayers.get(id);
    if (!r) {
      r = { id, uid: p.uid, name: p.name, here: false, zone: p.zone, connected: p.connected, tool: p.tool, swing: p.swing, swingAt: -1, x: p.x, y: p.y, z: p.z, yaw: p.yaw, tx: p.x, ty: p.y, tz: p.z, tyaw: p.yaw, snaps: new Float64Array(30), snapHead: 0, snapCount: 0, stOffset: NaN, stLast: 0, speed: 0, phase: 0, colors: colorsFor(p.uid), look: p.look, emote: null };
      remotePlayers.set(id, r);
    }
    r.tx = p.x;
    r.ty = p.y;
    r.tz = p.z;
    r.tyaw = p.yaw;
    pushSnapshot(r, p.x, p.y, p.z, p.yaw, snapshotTime(r, p.st));
    r.name = p.name;
    r.look = p.look;
    r.zone = p.zone;
    r.connected = p.connected;
    r.tool = p.tool;
    if (p.swing !== r.swing) {
      r.swing = p.swing;
      r.swingAt = performance.now() / 1000;
    }
    const wasHere = r.here;
    r.here = p.zone === avatarScope.zone && p.connected;
    if (r.here && !wasHere) {
      snapRemote(r);
      // Snap instead of sliding across the plaza when someone (re)appears.
      r.x = p.x;
      r.z = p.z;
    }
  });
  for (const id of [...known]) {
    if (!seen.has(id)) {
      known.delete(id);
      remotePlayers.delete(id);
    }
  }

  const pads: PadView[] = [];
  for (const pad of state.pads) {
    pads.push({
      index: pad.index,
      host: pad.host,
      maxPlayers: pad.maxPlayers,
      chapter: pad.chapter,
      members: Array.from(pad.members),
      countdown: pad.countdown,
    });
  }

  const playersKey = JSON.stringify(players);
  const padsKey = JSON.stringify(pads);
  if (playersKey !== lastPlayersKey || padsKey !== lastPadsKey) {
    lastPlayersKey = playersKey;
    lastPadsKey = padsKey;
    useLobbyStore.setState({ players, pads });
  }
}
