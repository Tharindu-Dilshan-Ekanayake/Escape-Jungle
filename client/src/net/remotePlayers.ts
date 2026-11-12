import { Color } from "three";
import { AVATAR } from "../config/lobby";

/**
 * Hot-path data for other players (positions, smoothing, walk phase).
 * Written by network callbacks, read by the avatar renderer each frame.
 * Never React/Zustand state.
 */
export interface RemotePlayer {
  id: string;
  uid: string;
  name: string;
  /** Connected and in the same place as me (lobby, or my jungle run). */
  here: boolean;
  /** "lobby" or a runId. */
  zone: string;
  connected: boolean;
  /** Tool held in a run ("" = none) and the swing counter. */
  tool: string;
  swing: number;
  /** performance.now()/1000 when the latest swing started (-1 = none yet). */
  swingAt: number;
  /** Rendered (smoothed) values. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Latest values from the server. */
  tx: number;
  ty: number;
  tz: number;
  tyaw: number;
  /** Snapshot ring buffer: [time, x, y, z, yaw] x SNAPS. */
  snaps: Float64Array;
  snapHead: number;
  snapCount: number;
  /** Sender-clock mapping (see stateSync.snapshotTime). */
  stOffset: number;
  stLast: number;
  speed: number;
  phase: number;
  colors: AvatarColors;
  /** JSON of equipped Boxity ids (server-validated). */
  look: string;
  /** Active emote (performance.now()/1000 start), stops when they move. */
  emote: { id: string; start: number } | null;
}

export interface AvatarColors {
  skin: Color;
  shirt: Color;
  pants: Color;
}

export const remotePlayers = new Map<string, RemotePlayer>();
// Dev only: automated checks read remote players (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __remotePlayers: remotePlayers });

/** Where the local player is: "lobby" or the current runId. Remote players elsewhere are hidden. */
export const avatarScope = { zone: "lobby" };

/** Switch scene scope (lobby <-> run) and re-evaluate who is visible right away. */
export function setAvatarScope(zone: string) {
  avatarScope.zone = zone;
  for (const r of remotePlayers.values()) {
    const here = r.connected && r.zone === zone;
    if (here && !r.here) snapRemote(r);
    r.here = here;
  }
}

/** Local player emote (set from the Boxity emote picker). */
export const localEmote: { current: { id: string; start: number } | null } = { current: null };
// Dev only: lets automated checks trigger an emote (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __localEmote: localEmote });

/** Snapshot buffer size and how far behind real time remote players are drawn. */
const SNAPS = 6;
// A bit more buffer than one update interval (66 ms) + jitter, so a late packet never stalls them.
const INTERP_DELAY = 0.15;
/** Hold the last position this long after the newest snapshot, then stop (no runaway extrapolation). */
const MAX_EXTRAPOLATE = 0.4;
/** A gap longer than this between updates means they had stopped. */
const RESUME_GAP = 0.25;
/** Senders update ~15x per second. */
const SEND_INTERVAL = 1 / 15;
let resuming = false;

/** Record a server position for a remote player (called from the state sync). */
export function pushSnapshot(r: RemotePlayer, x: number, y: number, z: number, yaw: number, now: number, force = false) {
  const n = r.snapCount;
  const last = n > 0 ? ((r.snapHead + n - 1) % SNAPS) * 5 : -1;
  // Same position again (idle patch): nothing new to blend.
  if (!force && last >= 0 && r.snaps[last + 1] === x && r.snaps[last + 2] === y && r.snaps[last + 3] === z && r.snaps[last + 4] === yaw) return;
  // Teleported (respawn, back from a run): restart the buffer so they don't slide across the map.
  if (last >= 0 && Math.hypot(x - r.snaps[last + 1], z - r.snaps[last + 3]) > 15) {
    r.snapCount = 0;
    r.snapHead = 0;
    r.x = x;
    r.y = y;
    r.z = z;
    return pushSnapshot(r, x, y, z, yaw, now);
  }
  // Starting to move after standing still: re-stamp the resting spot just before this update,
  // so the walk blends from "now" instead of from seconds ago (no freeze at the start).
  if (last >= 0 && now - r.snaps[last] > RESUME_GAP && !resuming) {
    resuming = true;
    pushSnapshot(r, r.snaps[last + 1], r.snaps[last + 2], r.snaps[last + 3], r.snaps[last + 4], now - SEND_INTERVAL, true);
    resuming = false;
    return pushSnapshot(r, x, y, z, yaw, now);
  }
  const slot = n < SNAPS ? (r.snapHead + n) % SNAPS : r.snapHead;
  if (n < SNAPS) r.snapCount++;
  else r.snapHead = (r.snapHead + 1) % SNAPS;
  const o = slot * 5;
  r.snaps[o] = now;
  r.snaps[o + 1] = x;
  r.snaps[o + 2] = y;
  r.snaps[o + 3] = z;
  r.snaps[o + 4] = yaw;
}

/** Jump straight to the latest position (appearing, teleports). */
export function snapRemote(r: RemotePlayer) {
  r.x = r.tx;
  r.z = r.tz;
  r.y = r.ty;
  r.yaw = r.tyaw;
  r.snapCount = 0;
  r.snapHead = 0;
}

/**
 * Per frame: draw the remote player INTERP_DELAY behind real time, blending
 * between the two snapshots around that moment (smooth even with jittery
 * packets), take the walk speed from the snapshots (no idle/walk flicker), and
 * turn the body toward where they walk (no moonwalking while strafing).
 */
export function stepRemote(r: RemotePlayer, dt: number, smoothing: number, walkFreq: number) {
  const now = performance.now() / 1000;
  const t = now - INTERP_DELAY;
  const n = r.snapCount;
  let tx = r.tx;
  let ty = r.ty;
  let tz = r.tz;
  let vx = 0;
  let vz = 0;
  let tyaw = r.tyaw;
  if (n >= 2) {
    let i = 0;
    while (i < n - 2 && r.snaps[((r.snapHead + i + 1) % SNAPS) * 5] <= t) i++;
    const a = ((r.snapHead + i) % SNAPS) * 5;
    const b = ((r.snapHead + i + 1) % SNAPS) * 5;
    const span = Math.max(1e-3, r.snaps[b] - r.snaps[a]);
    const u = Math.min(1 + MAX_EXTRAPOLATE / span, Math.max(0, (t - r.snaps[a]) / span));
    const stale = t - r.snaps[b] > MAX_EXTRAPOLATE; // they stopped sending: they stopped moving
    const k = stale ? 1 : u;
    tx = r.snaps[a + 1] + (r.snaps[b + 1] - r.snaps[a + 1]) * k;
    ty = r.snaps[a + 2] + (r.snaps[b + 2] - r.snaps[a + 2]) * Math.min(1, k);
    tz = r.snaps[a + 3] + (r.snaps[b + 3] - r.snaps[a + 3]) * k;
    // Turn blended between updates too (shortest way round).
    const dyaw = Math.atan2(Math.sin(r.snaps[b + 4] - r.snaps[a + 4]), Math.cos(r.snaps[b + 4] - r.snaps[a + 4]));
    tyaw = r.snaps[a + 4] + dyaw * Math.min(1, k);
    if (!stale && span < 0.6) {
      vx = (r.snaps[b + 1] - r.snaps[a + 1]) / span;
      vz = (r.snaps[b + 3] - r.snaps[a + 3]) / span;
    }
  }
  // Small extra smoothing hides the remaining corners between snapshots.
  const k = 1 - Math.exp(-smoothing * 2 * dt);
  r.x += (tx - r.x) * k;
  r.z += (tz - r.z) * k;
  r.y += (ty - r.y) * k;
  const speed = Math.hypot(vx, vz);
  r.speed += (speed - r.speed) * Math.min(1, dt * 6);
  // Lobby: they send their body direction, so just follow it smoothly.
  // Jungle: they send the camera direction; the body faces the walk direction
  // while clearly moving (no moonwalking) and eases back to the look direction.
  const moving = r.zone !== "lobby" && r.speed > 1.5 && speed > 1;
  const want = moving ? Math.atan2(-vx, -vz) : tyaw;
  let dy = want - r.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  r.yaw += dy * Math.min(1, dt * (moving ? 9 : r.zone === "lobby" ? 14 : 5));
  r.phase += dt * r.speed * walkFreq;
}

/** Latest chat bubble per uid ("me" for the local player). */
export const bubbles = new Map<string, { text: string; until: number }>();

/** Stable avatar colours from a player id (same on every client). */
export function colorsFor(uid: string): AvatarColors {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) h = Math.imul(h ^ uid.charCodeAt(i), 16777619);
  const pick = <T>(list: readonly T[], salt: number) => list[Math.abs((h >> salt) ^ salt) % list.length];
  return {
    skin: new Color(pick(AVATAR.skins, 3)),
    shirt: new Color(pick(AVATAR.shirts, 7)),
    pants: new Color(pick(AVATAR.pants, 13)),
  };
}
