import { ANIMALS, AS, BOAR, JAGUAR, MONKEY } from "../../config/animals";
import { CAMP1 } from "../../config/camp1";
import { ZONES1 } from "../../config/zones1";
import { inZones } from "../../world/zones/buildZones";
import { clampToRegion, type Region } from "../player/collision";
import { isSafeAt } from "../campfire/campfires";
import { dayNight } from "../time/dayNight";
import { runNet, sendBite } from "../../net/runNet";
import { hurt } from "../survival/survival";
import { sfx } from "../audio/sfx";
import { animals, corpseGone, Kind, spawnAnimal, type Animal } from "./animals";

/** A player the animals can see (local or remote party member). */
export interface Prey {
  sid: string;
  x: number;
  z: number;
  /** Inside a lit campfire's safe radius. */
  safe: boolean;
}

const body = { x: 0, z: 0 };
const timers = { boar: 6, jaguar: 4, monkey: 2 };
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function resetAI() {
  timers.boar = 6;
  timers.jaguar = 4;
  timers.monkey = 2;
}

function nearest(a: { x: number; z: number }, prey: Prey[]): { p: Prey | null; d: number } {
  let p: Prey | null = null;
  let d = Infinity;
  for (const q of prey) {
    const dd = Math.hypot(q.x - a.x, q.z - a.z);
    if (dd < d) {
      d = dd;
      p = q;
    }
  }
  return { p, d };
}

/** Turn toward (x, z) and step at `speed`. Returns the remaining distance. */
function moveToward(a: Animal, x: number, z: number, speed: number, dt: number, away = false): number {
  let dx = x - a.x;
  let dz = z - a.z;
  const d = Math.hypot(dx, dz) || 1;
  if (away) {
    dx = -dx;
    dz = -dz;
  }
  const want = Math.atan2(dx, dz);
  const turn = Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw));
  a.yaw += turn * Math.min(1, dt * 6);
  const step = Math.min(speed * dt, away ? speed * dt : Math.max(0, d - 0.1));
  a.x += Math.sin(a.yaw) * step;
  a.z += Math.cos(a.yaw) * step;
  a.speed = step / Math.max(dt, 1e-4);
  return d;
}

function bite(a: Animal, target: Prey, dmg: number, now: number) {
  a.attackAt = now;
  a.bites++;
  if (!runNet.online || target.sid === runNet.me) hurt(dmg);
  else sendBite(target.sid, dmg);
  if (a.kind === Kind.Boar) sfx.grunt(1);
  else sfx.roar(1);
}

/** Random point in a zone/corridor far enough from every player (boars). */
function boarSpot(prey: Prey[]): { x: number; z: number } | null {
  const host = prey[0];
  if (!host) return null;
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(ANIMALS.boarSpawnDist[0], ANIMALS.boarSpawnDist[1]);
    const x = host.x + Math.cos(a) * d;
    const z = host.z + Math.sin(a) * d;
    if (!ZONES1.some((zn) => x > zn.rect.minX + 1 && x < zn.rect.maxX - 1 && z > zn.rect.minZ + 1 && z < zn.rect.maxZ - 1)) continue;
    if (nearest({ x, z }, prey).d < ANIMALS.minSpawnGap || isSafeAt(x, z)) continue;
    return { x, z };
  }
  return null;
}

/** Point at the jungle edge near an unprotected player (jaguars). */
function jaguarSpot(target: Prey): { x: number; z: number } | null {
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(ANIMALS.jaguarSpawnDist[0], ANIMALS.jaguarSpawnDist[1]);
    const x = target.x + Math.cos(a) * d;
    const z = target.z + Math.sin(a) * d;
    const camp = Math.hypot(x, z);
    if (inZones(x, z, 1.5) || camp < CAMP1.boundRadius + 1) continue;
    if (!inZones(x, z, 7) && camp > CAMP1.boundRadius + 7) continue;
    if (isSafeAt(x, z)) continue;
    return { x, z };
  }
  return null;
}

/** Host: spawn, think, move, attack. Called every frame by the AnimalSystem. */
export function hostTick(dt: number, now: number, prey: Prey[], region: Region) {
  const list = animals.list;
  const count = (k: Kind) => list.filter((a) => a.kind === k && a.state !== AS.Dead).length;

  // Spawning.
  timers.boar -= dt;
  if (timers.boar <= 0) {
    timers.boar = ANIMALS.boarSpawnEvery * rand(0.7, 1.3);
    if (count(Kind.Boar) < ANIMALS.boarMax) {
      const s = boarSpot(prey);
      if (s) spawnAnimal(Kind.Boar, s.x, s.z, AS.Wander);
    }
  }
  // The cheeky monkey lives in its zone whenever someone is nearby.
  timers.monkey -= dt;
  if (timers.monkey <= 0 && count(Kind.Monkey) < 1) {
    timers.monkey = MONKEY.respawn;
    const r = ZONES1[MONKEY.zone].rect;
    const near = prey.some((q) => Math.hypot(Math.max(r.minX - q.x, 0, q.x - r.maxX), Math.max(r.minZ - q.z, 0, q.z - r.maxZ)) < ANIMALS.monkeyRange);
    for (let t = 0; near && t < 20; t++) {
      const x = rand(r.minX + 3, r.maxX - 3);
      const z = rand(r.minZ + 3, r.maxZ - 3);
      if (nearest({ x, z }, prey).d < 10) continue;
      spawnAnimal(Kind.Monkey, x, z, AS.Wander);
      sfx.monkey();
      break;
    }
  }
  const night = dayNight.dark >= JAGUAR.minDark;
  timers.jaguar -= dt;
  if (night && timers.jaguar <= 0) {
    timers.jaguar = ANIMALS.jaguarSpawnEvery * rand(0.7, 1.3);
    const exposed = prey.filter((p) => !p.safe);
    if (exposed.length && count(Kind.Jaguar) < ANIMALS.jaguarMax) {
      const target = exposed[Math.floor(Math.random() * exposed.length)];
      const s = jaguarSpot(target);
      if (s) {
        const j = spawnAnimal(Kind.Jaguar, s.x, s.z, AS.Stalk);
        j.target = target.sid;
        sfx.roar(0.5);
      }
    }
  }

  for (const a of list) {
    if (a.state === AS.Dead) {
      a.speed = 0;
      continue;
    }
    const { p, d } = nearest(a, prey);
    a.timer -= dt;
    if (a.kind === Kind.Boar) thinkBoar(a, p, d, dt, now);
    else if (a.kind === Kind.Monkey) thinkMonkey(a, p, d, dt, now);
    else thinkJaguar(a, prey, night, dt, now);
    if (a.kind === Kind.Boar) {
      body.x = a.x;
      body.z = a.z;
      clampToRegion(body, BOAR.radius, region);
      a.x = body.x;
      a.z = body.z;
    }
  }

  // Remove corpses and animals nobody is near.
  const before = list.length;
  animals.list = list.filter((a) => {
    if (corpseGone(a, now)) return false;
    const { d } = nearest(a, prey);
    if (a.kind === Kind.Jaguar && a.state === AS.Retreat && d > 32) return false;
    return d < ANIMALS.despawnDist;
  });
  if (animals.list.length !== before) animals.version++;
}

function thinkBoar(a: Animal, p: Prey | null, d: number, dt: number, now: number) {
  if (a.state === AS.Wander) {
    if (a.timer <= 0 || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.6) {
      a.timer = rand(3, 7);
      for (let t = 0; t < 8; t++) {
        const x = a.x + rand(-8, 8);
        const z = a.z + rand(-8, 8);
        if (inZones(x, z, -1)) {
          a.tx = x;
          a.tz = z;
          break;
        }
      }
    }
    moveToward(a, a.tx, a.tz, BOAR.speed, dt);
    if (p && d < BOAR.alertRange && !p.safe) {
      a.target = p.sid;
      a.state = Math.random() < BOAR.chargeChance ? AS.Charge : AS.Flee;
      a.timer = a.state === AS.Charge ? 4 : 3;
      sfx.grunt(Math.max(0.3, 1 - d / 20));
    }
    return;
  }
  if (a.state === AS.Flee) {
    if (p) moveToward(a, p.x, p.z, BOAR.run, dt, true);
    if (a.timer <= 0) a.state = AS.Wander;
    return;
  }
  // Charge whoever is nearest.
  const t = p;
  if (!t || t.safe || a.timer <= 0) {
    a.state = AS.Flee;
    a.timer = 2.5;
    return;
  }
  const dist = moveToward(a, t.x, t.z, BOAR.charge, dt);
  if (dist < BOAR.attackRange && now - a.attackAt > BOAR.attackCooldown) {
    bite(a, t, BOAR.damage, now);
    a.state = AS.Flee;
    a.timer = 2.5;
  }
}

function thinkJaguar(a: Animal, prey: Prey[], night: boolean, dt: number, now: number) {
  const target = prey.find((q) => q.sid === a.target) ?? nearest(a, prey).p;
  if (!night || !target || target.safe || a.bites >= JAGUAR.maxBites) a.state = AS.Retreat;
  if (a.state === AS.Retreat) {
    const from = target ?? prey[0];
    if (from) moveToward(a, from.x, from.z, JAGUAR.run, dt, true);
    return;
  }
  if (!target) return;
  const d = Math.hypot(target.x - a.x, target.z - a.z);
  const speed = d < JAGUAR.pounceRange ? JAGUAR.run : JAGUAR.stalk;
  const px = a.x;
  const pz = a.z;
  moveToward(a, target.x, target.z, speed, dt);
  // Never step into a burning fire's light.
  if (isSafeAt(a.x, a.z)) {
    a.x = px;
    a.z = pz;
    a.state = AS.Retreat;
    return;
  }
  if (d < JAGUAR.attackRange && now - a.attackAt > JAGUAR.attackCooldown) {
    bite(a, target, JAGUAR.damage, now);
  }
}

function thinkMonkey(a: Animal, p: Prey | null, d: number, dt: number, now: number) {
  const r = ZONES1[MONKEY.zone].rect;
  if (p && d < MONKEY.fleeRange) {
    // Zig-zag away, giggling now and then.
    const zig = Math.sin(now * 3 + a.id) * 0.9;
    const ang = Math.atan2(a.x - p.x, a.z - p.z) + zig;
    moveToward(a, a.x + Math.sin(ang) * 5, a.z + Math.cos(ang) * 5, MONKEY.run, dt);
    if (Math.random() < dt * 0.4) sfx.monkey();
  } else {
    if (a.timer <= 0 || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.6) {
      a.timer = rand(2, 5);
      a.tx = rand(r.minX + 2, r.maxX - 2);
      a.tz = rand(r.minZ + 2, r.maxZ - 2);
    }
    moveToward(a, a.tx, a.tz, MONKEY.speed, dt);
  }
  // Stays in its gully.
  a.x = Math.max(r.minX + 1, Math.min(r.maxX - 1, a.x));
  a.z = Math.max(r.minZ + 1, Math.min(r.maxZ - 1, a.z));
}
