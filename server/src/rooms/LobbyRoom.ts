import type { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom.js";
import { Player, WorldState, type Pad } from "./schema.js";
import { PadSystem } from "./PadSystem.js";
import { RunSystem } from "./RunSystem.js";
import {
  LOBBY_LAYOUT,
  LOBBY_RULES,
  MSG,
  ROOM_LIMITS,
  RUN_MSG,
  RUN_RULES,
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
  private lastMove = new Map<string, number>();
  private runCounter = 0;
  private runs!: RunSystem;
  private lastTeleport = new Map<string, number>();

  onCreate() {
    this.setState(new WorldState());
    // State patches every 50 ms: other players move smoothly (positions are tiny floats).
    this.setPatchRate(PATCH_MS);
    this.pads = new PadSystem(this.state, (pad) => this.startRun(pad));
    this.setSimulationInterval((dt) => this.pads.tick(dt / 1000), TICK_MS);

    this.runs = new RunSystem((sid, type, msg) => this.clients.getById(sid)?.send(type, msg));
    this.onMessage(MSG.move, (client, msg: RunMovePayload) => this.handleMove(client, msg));
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
    this.onMessage(MSG.padConfig, (client, msg: { maxPlayers: number }) =>
      this.pads.setPartySize(client.sessionId, msg?.maxPlayers),
    );
    this.onMessage(MSG.padStart, (client) => this.pads.hostStart(client.sessionId));
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
    if (!consented && p) {
      p.connected = false;
      try {
        await this.allowReconnection(client, LOBBY_RULES.reconnectSeconds);
        p.connected = true;
        return;
      } catch {
        /* timed out: remove below */
      }
    }
    this.pads.remove(client.sessionId);
    if (p && p.zone !== "lobby") this.runs.leave(p.zone, client.sessionId);
    this.state.players.delete(client.sessionId);
    this.lastTeleport.delete(client.sessionId);
    this.lastMove.delete(client.sessionId);
  }

  private handleMove(client: Client, msg: RunMovePayload) {
    const p = this.state.players.get(client.sessionId);
    if (!p || !msg) return;
    const inRun = p.zone !== "lobby";
    const x = Number(msg.x);
    const z = Number(msg.z);
    const yaw = Number(msg.yaw);
    if (![x, z, yaw].every(Number.isFinite)) return;

    const now = Date.now();
    const last = this.lastMove.get(client.sessionId) ?? 0;
    if (now - last < 1000 / (LOBBY_RULES.moveHz * 2)) return; // rate limit
    const dt = Math.min(1, (now - (last || now - TICK_MS)) / 1000);
    this.lastMove.set(client.sessionId, now);

    // Speed check: clamp implausible jumps toward the claimed position.
    const b = inRun ? RUN_RULES.bounds : LOBBY_LAYOUT.bounds;
    let nx = Math.max(b.minX, Math.min(b.maxX, x));
    let nz = Math.max(b.minZ, Math.min(b.maxZ, z));
    const dist = Math.hypot(nx - p.x, nz - p.z);
    const max = (inRun ? RUN_RULES.maxSpeed : LOBBY_RULES.maxSpeed) * dt + 0.5;
    // Respawn teleports in a run skip the clamp (rate limited).
    const tpOk = inRun && msg.tp === true && now - (this.lastTeleport.get(client.sessionId) ?? 0) > RUN_RULES.teleportCooldownMs;
    if (tpOk) this.lastTeleport.set(client.sessionId, now);
    if (inRun) {
      if (typeof msg.tool === "string" && msg.tool.length < 32) p.tool = msg.tool;
      if (Number.isInteger(msg.sw)) p.swing = (msg.sw as number) & 255;
    }
    if (dist > max && !tpOk) {
      nx = p.x + ((nx - p.x) / dist) * max;
      nz = p.z + ((nz - p.z) / dist) * max;
    }
    p.x = nx;
    p.z = nz;
    p.yaw = yaw;
    const y = Number(msg.y);
    p.y = Number.isFinite(y) ? Math.max(0, Math.min(6, y)) : 0;
    const st = Number(msg.st);
    if (Number.isFinite(st)) p.st = st;
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
    this.lastMove.set(client.sessionId, Date.now());
    client.send(MSG.teleport, { x: p.x, z: p.z, yaw: 0 });
  }

  private startRun(pad: Pad) {
    const runId = `${this.roomId}-${++this.runCounter}`;
    const members = [...pad.members];
    const payload: RunStartPayload = {
      runId,
      chapter: pad.chapter,
      members: members.map((id) => this.state.players.get(id)?.name ?? "?"),
    };
    this.runs.create(runId, members);
    for (const id of members) {
      const p = this.state.players.get(id);
      if (p) {
        p.zone = runId;
        p.tool = "";
      }
      this.clients.getById(id)?.send(MSG.runStart, payload);
    }
    console.log(`[lobby ${this.roomId}] run ${runId} started with ${members.length} player(s)`);
  }

  private backToLobby(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.zone === "lobby") return;
    const s = LOBBY_LAYOUT.spawn;
    this.runs.leave(p.zone, client.sessionId);
    p.zone = "lobby";
    p.x = s.x + (Math.random() - 0.5) * 2 * s.scatter;
    p.z = s.z;
    p.yaw = s.yaw;
    this.lastMove.set(client.sessionId, Date.now());
    client.send(MSG.teleport, { x: p.x, z: p.z, yaw: p.yaw });
  }
}
