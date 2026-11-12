import type { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom.js";
import { Player, WorldState, type Pad } from "./schema.js";
import { PadSystem } from "./PadSystem.js";
import { MoveFilter } from "./MoveFilter.js";
import { RunSystem } from "./RunSystem.js";
import { RunSaves } from "../save/RunSaves.js";
import { restoreWorld, worldOf } from "../save/worldCodec.js";
import { saveStore } from "../save/store.js";
import {
  CLOSE_REPLACED,
  LOBBY_LAYOUT,
  LOBBY_RULES,
  MSG,
  ROOM_LIMITS,
  RUN_MSG,
  RUN_RULES,
  SAVE_RULES,
  sanitizePlayerSave,
  type PlayerSave,
  type RunMovePayload,
  type RunStartPayload,
  type VerifiedIdentity,
  isEmoteId,
  sanitizeLook,
} from "../shared/index.js";

const TICK_MS = 100;
const PATCH_MS = 50;

/**
 * The one room (up to 20 players): lobby hub with party pads. Parties of 1-4
 * start jungle runs inside this same room (players are never moved to
 * another room - docs/SDK.md). Phase 9 adds the shared grass state per run.
 */
export class LobbyRoom extends BaseRoom<WorldState> {
  maxClients = ROOM_LIMITS.lobbyMaxClients;
  private pads!: PadSystem;
  private moves = new MoveFilter();
  private runCounter = 0;
  private runs!: RunSystem;
  /** Verified identity per session (whose saves they use). */
  private ids = new Map<string, VerifiedIdentity>();
  private saves!: RunSaves;
  /** Seats held for dropped players (rejected when the same player joins again as a new session). */
  private held = new Map<string, ReturnType<LobbyRoom["allowReconnection"]>>();
  /** Old sessions closed because the same player joined again: removed at once, no seat held. */
  private replaced = new Set<string>();
  /** Each player's latest own progress in their run (to put them back after a drop or reload). */
  private lastSave = new Map<string, PlayerSave>();

  onCreate() {
    this.setState(new WorldState());
    // State patches every 50 ms: other players move smoothly (positions are tiny floats).
    this.setPatchRate(PATCH_MS);
    this.pads = new PadSystem(this.state, (pad) => void this.startRun(pad), (sid) => this.state.players.get(sid)?.best ?? 0);
    this.setSimulationInterval((dt) => this.pads.tick(dt / 1000), TICK_MS);

    this.runs = new RunSystem(
      (sid, type, msg) => this.clients.getById(sid)?.send(type, msg),
      (sid) => this.state.players.get(sid)?.name ?? "?",
    );
    this.saves = new RunSaves((id) => {
      const run = this.runs.get(id);
      return run ? worldOf(run) : null;
    });
    this.clock.setInterval(() => this.saves.tick(), SAVE_RULES.flushMs);
    this.onMessage(MSG.move, (client, msg: RunMovePayload) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.moves.apply(p, client.sessionId, msg);
    });
    const runOf = (client: Client) => {
      const z = this.state.players.get(client.sessionId)?.zone;
      return z && z !== "lobby" ? z : null;
    };
    const onRun = <T,>(type: string, fn: (run: string, client: Client, msg: T) => void) =>
      this.onMessage(type, (client, msg: T) => {
        const run = runOf(client);
        if (run) fn(run, client, msg);
      });
    onRun(RUN_MSG.hello, (run, c) => this.runs.hello(run, c));
    onRun(RUN_MSG.cut, (run, c, m: { z?: unknown; c?: unknown }) => this.runs.cut(run, c, m));
    onRun(RUN_MSG.pickup, (run, c, m: { i?: unknown }) => this.runs.pickup(run, c, m));
    onRun(RUN_MSG.fuel, (run, c, m: { f?: unknown }) => this.runs.fuel(run, c, m));
    onRun(RUN_MSG.chop, (run, c, m: { t?: unknown; dmg?: unknown }) => this.runs.chop(run, c, m));
    onRun(RUN_MSG.takeLog, (run, c, m: { t?: unknown }) => this.runs.takeLog(run, c, m));
    onRun(RUN_MSG.store, (run, c, m: { op?: unknown; item?: unknown }) => this.runs.store(run, c, m));
    onRun(RUN_MSG.animals, (run, c, m: unknown) => this.runs.animals(run, c, m));
    onRun(RUN_MSG.hit, (run, c, m: { id?: unknown; dmg?: unknown }) => this.runs.hit(run, c, m));
    onRun(RUN_MSG.bite, (run, c, m: { sid?: unknown; dmg?: unknown }) => this.runs.toPlayer(run, c, RUN_MSG.bite, m));
    onRun(RUN_MSG.meat, (run, c, m: { sid?: unknown; n?: unknown }) => this.runs.toPlayer(run, c, RUN_MSG.meat, m));
    onRun(RUN_MSG.prize, (run, c, m: { sid?: unknown }) => this.runs.toPlayer(run, c, RUN_MSG.prize, m));
    onRun(RUN_MSG.give, (run, c, m: { to?: unknown }) => this.runs.give(run, c, m, this.state.players.get(c.sessionId)?.name ?? "Friend"));
    onRun(RUN_MSG.adv, (run, c, m: { i?: unknown }) => this.runs.adv(run, c, m, this.state.players.get(c.sessionId)?.name ?? "A friend"));
    onRun(RUN_MSG.save, (run, c, m: { p?: unknown }) => {
      const id = this.ids.get(c.sessionId)?.saveId;
      const p = sanitizePlayerSave(m?.p);
      if (p) this.lastSave.set(c.sessionId, p);
      if (id && p) this.saves.report(run, id, p);
    });
    onRun(RUN_MSG.finished, (run) => this.escaped(run));
    onRun(RUN_MSG.board, (run, c) => this.runs.board(run, c));
    this.onMessage(MSG.padChapter, (client, msg: { chapter?: unknown }) => this.pads.setChapter(client.sessionId, msg?.chapter));
    this.onMessage(MSG.quickJoin, (client) => this.quickJoin(client));
    this.onMessage(MSG.leaveRun, (client) => this.backToLobby(client));
    this.onMessage(MSG.look, (client, msg: { look?: unknown }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.look = JSON.stringify(sanitizeLook(msg?.look));
    });
    this.onMessage(MSG.emote, (client, msg: { id?: unknown }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.zone !== "lobby" || !isEmoteId(msg?.id)) return;
      this.broadcast(MSG.emote, { sid: client.sessionId, id: msg.id }, { except: client });
    });
  }

  onJoin(client: Client, _options: unknown, auth: VerifiedIdentity) {
    const p = new Player();
    p.name = auth.username;
    p.uid = auth.accountId;
    p.best = Math.max(0, Math.min(255, auth.best ?? 0));
    this.dropGhosts(client.sessionId, auth);
    this.ids.set(client.sessionId, auth);
    const s = LOBBY_LAYOUT.spawn;
    p.x = s.x + (Math.random() - 0.5) * 2 * s.scatter;
    p.z = s.z + (Math.random() - 0.5) * s.scatter;
    p.yaw = s.yaw;
    this.state.players.set(client.sessionId, p);
    client.send(MSG.teleport, { x: p.x, z: p.z, yaw: p.yaw });
    console.log(`[lobby ${this.roomId}] ${p.name} joined (${this.clients.length}/${this.maxClients})`);
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!consented && p && !this.replaced.delete(client.sessionId)) {
      p.connected = false;
      // Teammates keep their animals moving while we're gone.
      if (p.zone !== "lobby") this.runs.handOffHost(p.zone, client.sessionId, (s) => this.state.players.get(s)?.connected ?? false);
      const seat = this.allowReconnection(client, LOBBY_RULES.reconnectSeconds);
      this.held.set(client.sessionId, seat);
      try {
        await seat;
        this.held.delete(client.sessionId);
        p.connected = true;
        this.backIntoRun(client.sessionId);
        return;
      } catch {
        /* timed out, or they came back as a new session: remove below */
        this.held.delete(client.sessionId);
      }
    }
    this.pads.remove(client.sessionId);
    if (p && p.zone !== "lobby") this.leaveRunState(p.zone, client.sessionId);
    this.state.players.delete(client.sessionId);
    this.ids.delete(client.sessionId);
    this.lastSave.delete(client.sessionId);
    this.moves.forget(client.sessionId);
  }



  private quickJoin(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.zone !== "lobby" || this.pads.padOf(client.sessionId)) return;
    const pad = this.pads.findOpenPad(p.x, p.z);
    if (!pad) return;
    const spot = LOBBY_LAYOUT.pads[pad.index];
    const offset = (pad.members.length % 2 ? 1 : -1) * 0.6 * Math.ceil(pad.members.length / 2);
    p.x = spot.x + offset;
    p.z = spot.z;
    this.moves.touch(client.sessionId);
    client.send(MSG.teleport, { x: p.x, z: p.z, yaw: 0 });
  }

  /**
   * Start a party's run. Exactly the same crew (solo = just you) continues its
   * saved expedition; anyone different means a fresh start.
   */
  private async startRun(pad: Pad) {
    const runId = `${this.roomId}-${++this.runCounter}`;
    const chapter = pad.chapter;
    const wanted = [...pad.members];
    const saveIdOf = (sid: string) => this.ids.get(sid)?.saveId ?? null;
    const slot = RunSaves.slot(chapter, wanted.map(saveIdOf));
    let doc = null;
    if (slot) {
      await this.saves.takeOver(slot.key);
      const carried = wanted.length === 1 ? this.ids.get(wanted[0])?.carriedFrom : undefined;
      doc = await this.saves.load(slot, carried).catch((err) => {
        console.warn("[saves] load failed, starting fresh:", (err as Error).message);
        return null;
      });
    }
    // Someone may have left while the save loaded: then it is a different crew (fresh start).
    const members = wanted.filter((sid) => this.state.players.get(sid)?.zone === "lobby");
    if (!members.length) return;
    const same = members.length === wanted.length;
    const crew = same ? slot : RunSaves.slot(chapter, members.map(saveIdOf));
    if (!same) doc = null;

    this.runs.create(runId, members, chapter);
    const run = this.runs.get(runId);
    if (doc && run) restoreWorld(run, doc.world);
    if (crew) this.saves.attach(runId, crew, chapter, doc?.players);
    const names = members.map((id) => this.state.players.get(id)?.name ?? "?");
    for (const id of members) {
      const p = this.state.players.get(id);
      if (p) {
        p.zone = runId;
        p.tool = "";
      }
      const sid = saveIdOf(id);
      const resume: PlayerSave | null = doc && sid ? doc.players[sid] ?? null : null;
      const payload: RunStartPayload = { runId, chapter, members: names, resume };
      this.clients.getById(id)?.send(MSG.runStart, payload);
    }
    console.log(`[lobby ${this.roomId}] run ${runId} ${doc ? "continued" : "started"} with ${members.length} player(s)`);
  }

  /**
   * The crew escaped: that expedition's save is done with, and every member
   * unlocks the next map (kept with their saves; guests without a key: this visit only).
   */
  private escaped(runId: string) {
    this.saves.finish(runId);
    const run = this.runs.get(runId);
    if (!run) return;
    for (const sid of run.members) {
      const p = this.state.players.get(sid);
      if (!p || p.best >= run.chapter) continue;
      p.best = run.chapter;
      const saveId = this.ids.get(sid)?.saveId;
      if (saveId) {
        saveStore()
          .putProgress({ _id: saveId, best: run.chapter, updatedAt: Date.now() })
          .catch((err) => console.warn("[saves] progress write failed:", (err as Error).message));
      }
    }
  }

  /**
   * The same player joined again as a new session (other tab, failed seat
   * reuse) while their old one is still held: let the old one go now, so no
   * "ghost" copy of them waits around for a minute.
   */
  private dropGhosts(sid: string, auth: VerifiedIdentity) {
    if (!auth.saveId) return;
    for (const [other, id] of this.ids) {
      if (other === sid || id.saveId !== auth.saveId) continue;
      this.replaced.add(other);
      const held = this.held.get(other);
      if (held) held.reject();
      else this.clients.getById(other)?.leave(CLOSE_REPLACED);
    }
  }

  /**
   * Back within the minute (network drop or page reload): still in the run, so
   * send its info again with their own latest progress. A page that stayed in
   * the jungle ignores it and just resyncs; a reloaded page goes straight back in.
   */
  private backIntoRun(sid: string) {
    const p = this.state.players.get(sid);
    const run = p && p.zone !== "lobby" ? this.runs.get(p.zone) : undefined;
    if (!p || !run) return;
    const names = [...run.members].map((m) => this.state.players.get(m)?.name ?? "?");
    const payload: RunStartPayload = { runId: run.id, chapter: run.chapter, members: names, resume: this.lastSave.get(sid) ?? null };
    this.clients.getById(sid)?.send(MSG.runStart, payload);
    console.log(`[lobby ${this.roomId}] ${p.name} is back in run ${run.id}`);
  }

  /** A player leaves a run: save it first (while its jungle still exists), then forget it if empty. */
  private leaveRunState(runId: string, sid: string) {
    void this.saves.flush(runId);
    this.runs.leave(runId, sid);
    if (!this.runs.get(runId)) this.saves.drop(runId);
  }

  /** Room closing or server shutting down (Colyseus calls this on SIGTERM): write every save. */
  async onDispose() {
    await this.saves.flushAll();
  }

  private backToLobby(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.zone === "lobby") return;
    const s = LOBBY_LAYOUT.spawn;
    this.leaveRunState(p.zone, client.sessionId);
    p.zone = "lobby";
    p.x = s.x + (Math.random() - 0.5) * 2 * s.scatter;
    p.z = s.z;
    p.yaw = s.yaw;
    this.moves.touch(client.sessionId);
    client.send(MSG.teleport, { x: p.x, z: p.z, yaw: p.yaw });
  }
}
