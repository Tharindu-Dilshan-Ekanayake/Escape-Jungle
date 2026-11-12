import { LOBBY_LAYOUT, LOBBY_RULES, chapterPlayable, chapterUnlocked, padAt } from "../shared/index.js";
import { Pad, type WorldState } from "./schema.js";

/**
 * Authoritative pad occupancy. Every pad has a fixed crew size (1, 2, 3 or 4,
 * painted on it). Players standing on a pad join its crew (first one hosts and
 * picks the map); a full pad counts down on its own and at zero the crew leaves
 * for the jungle (onStart). Someone stepping off cancels the countdown.
 */
export class PadSystem {
  /** Seconds left per counting pad (mirrored as whole seconds into Pad.countdown). */
  private timers = new Map<number, number>();

  constructor(
    private state: WorldState,
    private onStart: (pad: Pad) => void,
    /** Highest chapter a player escaped (0 = none yet): decides which maps they may pick. */
    private bestOf: (sessionId: string) => number,
  ) {
    LOBBY_LAYOUT.pads.forEach((spot, index) => {
      const pad = new Pad();
      pad.index = index;
      pad.maxPlayers = spot.size;
      state.pads.push(pad);
    });
  }

  padOf(sessionId: string): Pad | undefined {
    return this.state.pads.find((p) => p.members.includes(sessionId));
  }

  /** Re-evaluate every lobby player's pad from their position, then run the countdowns. */
  tick(dt: number) {
    this.state.players.forEach((pl, id) => {
      const current = this.padOf(id);
      const target = pl.zone === "lobby" && pl.connected ? padAt(pl.x, pl.z) : -1;
      if (current && current.index === target) return;
      if (current) this.leave(current, id);
      if (target >= 0) this.join(this.state.pads[target], id);
    });

    for (const pad of this.state.pads) {
      const full = pad.members.length > 0 && pad.members.length >= pad.maxPlayers;
      let left = this.timers.get(pad.index);
      if (left === undefined) {
        if (full) this.startTimer(pad);
        continue;
      }
      if (!full) {
        this.cancel(pad);
        continue;
      }
      left -= dt;
      this.timers.set(pad.index, left);
      const whole = Math.max(0, Math.ceil(left));
      if (pad.countdown !== whole) pad.countdown = whole;
      if (left <= 0) {
        this.timers.delete(pad.index);
        this.onStart(pad);
        this.reset(pad);
      }
    }
  }

  /** The host picks the map: it must be built and unlocked for everyone on the pad. */
  setChapter(sessionId: string, chapter: unknown) {
    const pad = this.padOf(sessionId);
    const n = Number(chapter);
    if (!pad || pad.host !== sessionId || !Number.isInteger(n) || !chapterPlayable(n)) return;
    if (!pad.members.every((id) => chapterUnlocked(n, this.bestOf(id)))) return;
    pad.chapter = n;
  }

  /** Nearest pad (to x, z) that can take one more player: crews waiting first, then a free solo pad. */
  findOpenPad(x: number, z: number): Pad | undefined {
    let best: Pad | undefined;
    let bestD = Infinity;
    for (const pad of this.state.pads) {
      if (pad.members.length >= pad.maxPlayers || this.timers.has(pad.index)) continue;
      const p = LOBBY_LAYOUT.pads[pad.index];
      const d = Math.hypot(p.x - x, p.z - z) - (pad.members.length > 0 ? 200 : pad.maxPlayers === 1 ? 100 : 0);
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
    // A newcomer who hasn't unlocked the picked map: back to one everyone has.
    if (!chapterUnlocked(pad.chapter, this.bestOf(id))) pad.chapter = 1;
  }

  private leave(pad: Pad, id: string) {
    const i = pad.members.indexOf(id);
    if (i >= 0) pad.members.splice(i, 1);
    if (pad.host === id) pad.host = pad.members[0] ?? "";
    if (pad.members.length === 0) this.reset(pad);
  }

  private startTimer(pad: Pad) {
    this.timers.set(pad.index, LOBBY_RULES.fullCountdown);
    pad.countdown = LOBBY_RULES.fullCountdown;
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
    pad.chapter = 1;
  }
}
