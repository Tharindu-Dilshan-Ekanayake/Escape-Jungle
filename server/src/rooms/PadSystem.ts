import { LOBBY_LAYOUT, LOBBY_RULES, chapterPlayable, chapterUnlocked, padAt } from "../shared/index.js";
import { Pad, type WorldState } from "./schema.js";

/**
 * Authoritative pad occupancy. Every pad has a fixed crew size (1, 2, 3 or 4,
 * painted on it) and plays its area's map. Players standing on a pad join its
 * crew if they unlocked that map; a full crew pad counts down on its own and at
 * zero the crew leaves for the jungle (onStart). Someone stepping off cancels
 * the countdown.
 *
 * A SOLO pad (size 1) is never "taken": every player standing on it has their
 * own countdown (Player.wait) and, at zero, leaves alone in their own run, so
 * several players can use the same solo pad at the same time.
 */
export class PadSystem {
  /** Seconds left per counting crew pad (mirrored as whole seconds into Pad.countdown). */
  private timers = new Map<number, number>();
  /** Seconds left per player standing on a solo pad. */
  private solo = new Map<string, number>();

  constructor(
    private state: WorldState,
    /** A crew (or one solo player) leaves for the jungle. */
    private onStart: (chapter: number, members: string[]) => void,
    /** Highest chapter a player escaped (0 = none yet): decides which maps they may pick. */
    private bestOf: (sessionId: string) => number,
  ) {
    LOBBY_LAYOUT.pads.forEach((spot, index) => {
      const pad = new Pad();
      pad.index = index;
      pad.maxPlayers = spot.size;
      pad.chapter = spot.chapter;
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
      if (pad.maxPlayers === 1) {
        this.tickSolo(pad, dt);
        continue;
      }
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
        const crew = [...pad.members];
        this.timers.delete(pad.index);
        this.reset(pad);
        this.onStart(pad.chapter, crew);
      }
    }
  }

  /** Solo pad: each player on it counts down alone and leaves alone. */
  private tickSolo(pad: Pad, dt: number) {
    for (const id of [...pad.members]) {
      const left = (this.solo.get(id) ?? LOBBY_RULES.fullCountdown) - dt;
      if (left <= 0) {
        this.leave(pad, id);
        this.onStart(pad.chapter, [id]);
        continue;
      }
      this.solo.set(id, left);
      const player = this.state.players.get(id);
      const whole = Math.ceil(left);
      if (player && player.wait !== whole) player.wait = whole;
    }
  }

  /** Nearest pad (to x, z) that can take one more player: crews waiting first, then a free solo pad. */
  findOpenPad(x: number, z: number): Pad | undefined {
    let best: Pad | undefined;
    let bestD = Infinity;
    for (const pad of this.state.pads) {
      // PLAY / quick join: the first map's pads (every player has that one). A solo pad is never full.
      if (pad.chapter !== 1) continue;
      if (pad.maxPlayers > 1 && (pad.members.length >= pad.maxPlayers || this.timers.has(pad.index))) continue;
      const p = LOBBY_LAYOUT.pads[pad.index];
      const d = Math.hypot(p.x - x, p.z - z) - (pad.maxPlayers > 1 && pad.members.length > 0 ? 200 : pad.maxPlayers === 1 ? 100 : 0);
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
    const solo = pad.maxPlayers === 1;
    if (!solo && pad.members.length >= pad.maxPlayers) return;
    // A map you haven't unlocked (or one not built yet): you can stand there, but not join.
    if (!chapterPlayable(pad.chapter) || !chapterUnlocked(pad.chapter, this.bestOf(id))) return;
    pad.members.push(id);
    if (!pad.host) pad.host = id;
    if (solo) {
      this.solo.set(id, LOBBY_RULES.fullCountdown);
      const player = this.state.players.get(id);
      if (player) player.wait = LOBBY_RULES.fullCountdown;
    }
  }

  private leave(pad: Pad, id: string) {
    const i = pad.members.indexOf(id);
    if (i >= 0) pad.members.splice(i, 1);
    if (this.solo.delete(id) || pad.maxPlayers === 1) {
      const player = this.state.players.get(id);
      if (player && player.wait !== -1) player.wait = -1;
    }
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
  }
}
