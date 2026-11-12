import { LOBBY_LAYOUT, LOBBY_RULES, ROOM_LIMITS, padAt } from "../shared/index.js";
import { Pad, type WorldState } from "./schema.js";

interface PadTimer {
  /** Seconds left (float); mirrored as whole seconds into Pad.countdown. */
  left: number;
  /** True when the host pressed START (survives members leaving). */
  byHost: boolean;
}

/**
 * Authoritative pad occupancy: players standing on a pad join its party
 * (first one hosts). A full pad, or the host's START, runs a countdown;
 * at zero the party leaves for the jungle (onStart).
 */
export class PadSystem {
  private timers = new Map<number, PadTimer>();

  constructor(
    private state: WorldState,
    private onStart: (pad: Pad) => void,
  ) {
    LOBBY_LAYOUT.pads.forEach((_, index) => {
      const pad = new Pad();
      pad.index = index;
      pad.maxPlayers = LOBBY_RULES.defaultPartySize;
      state.pads.push(pad);
    });
  }

  padOf(sessionId: string): Pad | undefined {
    return this.state.pads.find((p) => p.members.includes(sessionId));
  }

  /** Re-evaluate every lobby player's pad from their position. */
  tick(dt: number) {
    this.state.players.forEach((pl, id) => {
      const current = this.padOf(id);
      const target = pl.zone === "lobby" && pl.connected ? padAt(pl.x, pl.z) : -1;
      if (current && current.index === target) return;
      if (current) this.leave(current, id);
      if (target >= 0) this.join(this.state.pads[target], id);
    });

    for (const pad of this.state.pads) {
      const timer = this.timers.get(pad.index);
      const full = pad.members.length >= pad.maxPlayers && pad.members.length > 0;
      if (!timer) {
        if (full) this.startTimer(pad, LOBBY_RULES.fullCountdown, false);
        continue;
      }
      if (pad.members.length === 0 || (!timer.byHost && !full)) {
        this.cancel(pad);
        continue;
      }
      timer.left -= dt;
      const whole = Math.max(0, Math.ceil(timer.left));
      if (pad.countdown !== whole) pad.countdown = whole;
      if (timer.left <= 0) {
        this.timers.delete(pad.index);
        this.onStart(pad);
        this.reset(pad);
      }
    }
  }

  setPartySize(sessionId: string, size: number) {
    const pad = this.padOf(sessionId);
    if (!pad || pad.host !== sessionId) return;
    const wanted = Math.round(Number(size));
    if (!Number.isFinite(wanted)) return;
    pad.maxPlayers = Math.max(pad.members.length, Math.min(ROOM_LIMITS.partyMax, Math.max(1, wanted)));
  }

  hostStart(sessionId: string) {
    const pad = this.padOf(sessionId);
    if (!pad || pad.host !== sessionId || this.timers.get(pad.index)?.byHost) return;
    this.startTimer(pad, LOBBY_RULES.hostCountdown, true);
  }

  /** Nearest pad (to x, z) that can take one more player, or undefined. */
  findOpenPad(x: number, z: number): Pad | undefined {
    let best: Pad | undefined;
    let bestD = Infinity;
    for (const pad of this.state.pads) {
      if (pad.members.length >= pad.maxPlayers) continue;
      const p = LOBBY_LAYOUT.pads[pad.index];
      // Prefer pads that already have a party waiting.
      const d = Math.hypot(p.x - x, p.z - z) - (pad.members.length > 0 ? 100 : 0);
      if (d < bestD) {
        bestD = d;
        best = pad;
      }
    }
    return best;
  }

  remove(sessionId: string) {
    const pad = this.padOf(sessionId);
    if (pad) this.leave(pad, sessionId);
  }

  private join(pad: Pad, id: string) {
    if (pad.members.length >= pad.maxPlayers) return;
    pad.members.push(id);
    if (!pad.host) pad.host = id;
  }

  private leave(pad: Pad, id: string) {
    const i = pad.members.indexOf(id);
    if (i >= 0) pad.members.splice(i, 1);
    if (pad.host === id) pad.host = pad.members[0] ?? "";
    if (pad.members.length === 0) this.reset(pad);
  }

  private startTimer(pad: Pad, seconds: number, byHost: boolean) {
    this.timers.set(pad.index, { left: seconds, byHost });
    pad.countdown = seconds;
  }

  private cancel(pad: Pad) {
    this.timers.delete(pad.index);
    pad.countdown = -1;
  }

  private reset(pad: Pad) {
    this.timers.delete(pad.index);
    pad.members.clear();
    pad.host = "";
    pad.countdown = -1;
    pad.maxPlayers = LOBBY_RULES.defaultPartySize;
  }
}
