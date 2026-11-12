import { LOBBY_LAYOUT, LOBBY_RULES, RUN_RULES, type RunMovePayload } from "../shared/index.js";
import type { Player } from "./schema.js";

/** Expected gap between position updates (ms), for the first one. */
const TICK_MS = 100;

/**
 * Position updates from clients: rate limited, kept inside the walkable bounds
 * and speed-checked (implausible jumps are pulled back toward the last
 * position), with an occasional respawn teleport allowed in the jungle.
 */
export class MoveFilter {
  private lastMove = new Map<string, number>();
  private lastTeleport = new Map<string, number>();

  /** The server moved this player itself (pad, back from a run): measure speed from now. */
  touch(sid: string) {
    this.lastMove.set(sid, Date.now());
  }

  forget(sid: string) {
    this.lastMove.delete(sid);
    this.lastTeleport.delete(sid);
  }

  apply(p: Player, sid: string, msg: RunMovePayload) {
    if (!msg) return;
    const inRun = p.zone !== "lobby";
    const x = Number(msg.x);
    const z = Number(msg.z);
    const yaw = Number(msg.yaw);
    if (![x, z, yaw].every(Number.isFinite)) return;

    const now = Date.now();
    const last = this.lastMove.get(sid) ?? 0;
    if (now - last < 1000 / (LOBBY_RULES.moveHz * 2)) return; // rate limit
    const dt = Math.min(1, (now - (last || now - TICK_MS)) / 1000);
    this.lastMove.set(sid, now);

    // Speed check: clamp implausible jumps toward the claimed position.
    const b = inRun ? RUN_RULES.bounds : LOBBY_LAYOUT.bounds;
    let nx = Math.max(b.minX, Math.min(b.maxX, x));
    let nz = Math.max(b.minZ, Math.min(b.maxZ, z));
    const dist = Math.hypot(nx - p.x, nz - p.z);
    const max = (inRun ? RUN_RULES.maxSpeed : LOBBY_RULES.maxSpeed) * dt + 0.5;
    // Respawn teleports in a run skip the clamp (rate limited).
    const tpOk = inRun && msg.tp === true && now - (this.lastTeleport.get(sid) ?? 0) > RUN_RULES.teleportCooldownMs;
    if (tpOk) this.lastTeleport.set(sid, now);
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
  }}
