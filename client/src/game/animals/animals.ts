import { ANIMALS, AS, BOAR, JAGUAR, MONKEY } from "../../config/animals";
import { FOODS } from "../../config/survival";
import { isRunHost, runNet, runHandlers, sendHit, sendMeat, sendPrize } from "../../net/runNet";
import { addFood, note } from "../survival/survival";
import { sfx } from "../audio/sfx";

/**
 * Animal state shared by the host simulation, the renderer and the combat
 * code. The host (party member that simulates animals; solo: you) owns the
 * truth and broadcasts snapshots; everyone else interpolates.
 */
export const Kind = { Boar: 0, Jaguar: 1, Monkey: 2 } as const;
export type Kind = (typeof Kind)[keyof typeof Kind];

export interface Animal {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  yaw: number;
  state: AS;
  hp: number;
  /** Host: wander target / timers / who it hunts / who hit it last. */
  tx: number;
  tz: number;
  timer: number;
  target: string;
  lastHitter: string;
  attackAt: number;
  bites: number;
  /** performance.now()/1000 of the last hit (flash) and of death. */
  hitAt: number;
  deadAt: number;
  /** Animation. */
  speed: number;
  phase: number;
  /** Remote: latest snapshot values to smooth toward. */
  nx: number;
  nz: number;
  nyaw: number;
}

export const animals = { list: [] as Animal[], nextId: 1, version: 0 };

// Dev only: automated checks read animals (stripped from builds).
if (import.meta.env.DEV) Object.assign(window, { __animals: animals });

export const statsOf = (k: Kind) => (k === Kind.Boar ? BOAR : k === Kind.Jaguar ? JAGUAR : MONKEY);

export function resetAnimals() {
  animals.list = [];
  animals.nextId = 1;
  animals.version++;
}

export function spawnAnimal(kind: Kind, x: number, z: number, state: AS): Animal {
  const a: Animal = {
    id: animals.nextId++,
    kind,
    x,
    z,
    yaw: Math.random() * Math.PI * 2,
    state,
    hp: statsOf(kind).hp,
    tx: x,
    tz: z,
    timer: 0,
    target: "",
    lastHitter: "",
    attackAt: 0,
    bites: 0,
    hitAt: 0,
    deadAt: 0,
    speed: 0,
    phase: Math.random() * 6,
    nx: x,
    nz: z,
    nyaw: 0,
  };
  animals.list.push(a);
  animals.version++;
  return a;
}

/** Host: apply damage from player `sid`; reward the killer with raw meat. */
export function applyHit(a: Animal, dmg: number, sid: string) {
  if (a.state === AS.Dead) return;
  const now = performance.now() / 1000;
  a.hp -= dmg;
  a.hitAt = now;
  a.lastHitter = sid;
  if (a.hp > 0) {
    // Boars: hurt ones flee, healthy ones turn and charge. Jaguars retreat when badly hurt.
    if (a.kind === Kind.Monkey) {
      a.state = AS.Flee;
      a.timer = 3;
      sfx.monkey();
    } else if (a.kind === Kind.Boar) {
      a.state = a.hp < BOAR.hp * 0.5 ? AS.Flee : AS.Charge;
      a.target = sid;
      a.timer = 3;
    } else a.state = AS.Retreat; // a hurt jaguar runs off
    return;
  }
  a.state = AS.Dead;
  a.deadAt = now;
  a.hp = 0;
  if (a.kind === Kind.Monkey) {
    // Caught! The compass goes to whoever bonked it last.
    sfx.monkey();
    if (!runNet.online || sid === runNet.me) runHandlers.prize?.();
    else sendPrize(sid);
  } else giveMeat(sid, statsOf(a.kind).meat);
  animals.version++;
}

/** Meat for whoever landed the killing blow. */
export function giveMeat(sid: string, n: number) {
  if (!runNet.online || sid === runNet.me) {
    const got = addFood("rawMeat", n);
    if (got) note(`+${got} ${FOODS.rawMeat.icon} raw meat: cook it at a campfire`);
    sfx.pickupMeat();
  } else sendMeat(sid, n);
}

/** Any client: my machete hit animal `a`. */
export function hitAnimal(a: Animal, dmg: number) {
  a.hitAt = performance.now() / 1000; // local flash right away
  sfx.thud();
  if (isRunHost()) applyHit(a, dmg, runNet.me);
  else sendHit(a.id, dmg);
}

const FLOATS = 7;

/** Host snapshot: [id, kind, x, z, yaw, state, hp] per animal. */
export function packAnimals(out: number[]): number[] {
  out.length = 0;
  for (const a of animals.list) {
    out.push(a.id, a.kind, Math.round(a.x * 100) / 100, Math.round(a.z * 100) / 100, Math.round(a.yaw * 100) / 100, a.state, Math.max(0, Math.round(a.hp * 10) / 10));
  }
  return out;
}

/** Remote: apply a host snapshot (create / update / remove). */
export function unpackAnimals(data: number[]) {
  const now = performance.now() / 1000;
  const seen = new Set<number>();
  for (let o = 0; o + FLOATS <= data.length; o += FLOATS) {
    const id = data[o];
    seen.add(id);
    let a = animals.list.find((q) => q.id === id);
    if (!a) {
      a = spawnAnimal(data[o + 1] as Kind, data[o + 2], data[o + 3], data[o + 5] as AS);
      a.id = id;
    }
    a.nx = data[o + 2];
    a.nz = data[o + 3];
    a.nyaw = data[o + 4];
    const state = data[o + 5] as AS;
    if (state === AS.Dead && a.state !== AS.Dead) a.deadAt = now;
    const hp = data[o + 6];
    if (hp < a.hp) a.hitAt = now;
    a.state = state;
    a.hp = hp;
  }
  const before = animals.list.length;
  animals.list = animals.list.filter((a) => seen.has(a.id));
  if (animals.list.length !== before) animals.version++;
}

export const corpseGone = (a: Animal, now: number) => a.state === AS.Dead && now - a.deadAt > ANIMALS.corpseSeconds;
