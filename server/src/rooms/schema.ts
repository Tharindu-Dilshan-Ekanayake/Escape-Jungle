import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

/** One connected player. Positions are lobby or jungle coordinates (see `zone`). */
export class Player extends Schema {
  @type("string") name = "";
  /** "legion_<id>" (verified) or "guest_<sessionId>". Used to match Boxity chat. */
  @type("string") uid = "";
  @type("float32") x = 0;
  @type("float32") z = 0;
  /** Height above the ground (jumps). */
  @type("float32") y = 0;
  /** Sender clock (seconds, wraps at 4096) of the latest move: receivers space movement by it. */
  @type("float32") st = 0;
  @type("float32") yaw = 0;
  /** "lobby" or the runId of the party run they are in. */
  @type("string") zone = "lobby";
  /** JSON of equipped Boxity avatar ids (see shared/avatar.ts). */
  @type("string") look = "{}";
  /** Tool held in a run (avatar prop) and a swing counter (remote swing animation). */
  @type("string") tool = "";
  @type("uint8") swing = 0;
  /** Reconnecting players are kept (frozen) for a few seconds. */
  @type("boolean") connected = true;
}

/** One party pad. */
export class Pad extends Schema {
  @type("uint8") index = 0;
  /** sessionId of the host ("" when empty). */
  @type("string") host = "";
  @type("uint8") maxPlayers = 4;
  @type("uint8") chapter = 1;
  @type(["string"]) members = new ArraySchema<string>();
  /** Whole seconds left before the run starts, -1 when not counting down. */
  @type("int8") countdown = -1;
}

export class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Pad]) pads = new ArraySchema<Pad>();
}
