import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SURVIVAL } from "../../config/survival";
import { CAMP1 } from "../../config/camp1";
import { ZONES1 } from "../../config/zones1";
import type { CampLayout, ForageLayout } from "../../world/zones/baseLayout";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { progress } from "../progress/progress";
import { campfires, campfireGlow, isLit } from "../campfire/campfires";
import { economy } from "../economy/economy";
import { loot } from "../loot/loot";
import { runNet } from "../../net/runNet";
import { findAction, interact, resetInteract } from "../interact/interact";
import { sfx } from "../audio/sfx";
import { bumpSurvival, note, survival } from "./survival";
import { bindFoodStore } from "./foodStore";
import { bindShare } from "./share";

/** Inside the crash-site clearing or any outpost (not the rescue point)? */
function atBase(x: number, z: number) {
  if (Math.hypot(x, z) < CAMP1.clearingRadius) return true;
  for (let i = 0; i < ZONES1.length - 1; i++) {
    const b = ZONES1[i].base;
    if (Math.hypot(x - b.x, z - b.z) < b.r) return true;
  }
  return false;
}

const INTERACT_POLL_MS = 100;

/** Where to wake up: the nearest burning fire in a reachable camp, else the furthest reachable camp. */
function respawnSpot(): { x: number; z: number } {
  // Fire 0 = crash site (always reachable); fire i+1 = outpost i (reachable once gate i opened).
  const reachable = (i: number) => i === 0 || progress.open[i - 1];
  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  campfires.fires.forEach((f, i) => {
    if (!isLit(f) || !reachable(i)) return;
    const d = Math.hypot(f.x - player.x, f.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = { x: f.x + 2.4, z: f.z + 0.8 };
    }
  });
  if (best) return best;
  let last = -1;
  for (let i = 0; i < ZONES1.length - 1; i++) if (progress.open[i]) last = i;
  return last >= 0 ? { x: ZONES1[last].base.x, z: ZONES1[last].base.z } : { x: CAMP1.spawn.x, z: CAMP1.spawn.z };
}

/**
 * Survival tick: hunger and thirst drain (faster while working), health
 * regenerates when fed (twice as fast by a fire) and drains when starving.
 * At 0 health you pass out, drop your bag and raw meat, and wake at a camp.
 * Also runs cooking and keeps `interact.current` fresh (10x/s, outside the frame loop).
 */
export function SurvivalSystem({ camps, forage }: { camps: CampLayout[]; forage: ForageLayout }) {
  const sizzleAt = useRef(0);
  const wasHome = useRef(true);

  useEffect(() => {
    resetInteract(camps, forage);
    const unbind = bindFoodStore();
    const unbindShare = bindShare();
    const id = window.setInterval(() => {
      const now = performance.now() / 1000;
      const found = cutscene.active || survival.faintAt ? null : findAction(player.x, player.z, now);
      const key = found ? `${found.key}:${found.action.label}` : "";
      interact.current = found?.action ?? null;
      if (key !== interact.key) {
        interact.key = key;
        interact.version++;
      }
    }, INTERACT_POLL_MS);
    return () => {
      window.clearInterval(id);
      unbind();
      unbindShare();
    };
  }, [camps, forage]);

  useFrame((_, delta) => {
    if (cutscene.active || progress.finished) return;
    const dt = Math.min(delta, 0.1);
    const now = performance.now() / 1000;
    const s = survival;

    if (s.faintAt) {
      if (now - s.faintAt >= SURVIVAL.faintSeconds) {
        const spot = respawnSpot();
        Object.assign(player, { x: spot.x, z: spot.z, vx: 0, vz: 0 });
        runNet.teleport = true;
        s.health = SURVIVAL.respawn.health;
        s.hunger = Math.max(s.hunger, SURVIVAL.respawn.hunger);
        s.thirst = Math.max(s.thirst, SURVIVAL.respawn.thirst);
        s.faintAt = 0;
        note("You woke up at camp. Eat, drink and stay near the fire!");
      }
      return;
    }

    const before = Math.round(s.health) + Math.round(s.hunger) * 1000 + Math.round(s.thirst) * 1000000;
    s.hunger = Math.max(0, s.hunger - SURVIVAL.hungerPerSec * dt);
    s.thirst = Math.max(0, s.thirst - SURVIVAL.thirstPerSec * dt);
    const home = atBase(player.x, player.z);
    if (home !== wasHome.current) {
      wasHome.current = home;
      if (home && s.health < SURVIVAL.max - 1) note("Safe at base: your health is recovering.");
    }
    if (s.hunger <= 0 || s.thirst <= 0) {
      s.health = Math.max(0, s.health - SURVIVAL.starveDamage * dt);
    } else if (home) {
      s.health = Math.min(SURVIVAL.max, s.health + SURVIVAL.baseRegen * dt);
    } else if (s.hunger > SURVIVAL.regenAbove && s.thirst > SURVIVAL.regenAbove) {
      s.health = Math.min(SURVIVAL.max, s.health + SURVIVAL.regen * (campfireGlow.safe ? 2 : 1) * dt);
    }

    // Cooking: keeps going while you stay by a burning fire with raw meat.
    if (s.cooking >= 0) {
      const fire = campfires.fires.find((f) => isLit(f) && Math.hypot(f.x - player.x, f.z - player.z) < SURVIVAL.cookRadius);
      if (!fire || s.pouch.rawMeat <= 0) s.cooking = -1;
      else {
        s.cooking += dt;
        if (now >= sizzleAt.current) {
          sfx.sizzle();
          sizzleAt.current = now + 0.4;
        }
        if (s.cooking >= SURVIVAL.cookSeconds) {
          s.pouch.rawMeat--;
          s.pouch.cookedMeat++;
          s.cooking = s.pouch.rawMeat > 0 ? 0 : -1;
          sfx.equip();
          note("Cooked meat ready! (F to eat, or keep it in the Food Store)");
        }
        bumpSurvival();
      }
    }

    // Passing out.
    if (s.health <= 0) {
      s.faintAt = now;
      s.cooking = -1;
      economy.bag = 0;
      economy.bagValue = 0;
      economy.version++;
      s.pouch.rawMeat = 0;
      loot.carried = 0;
      loot.version++;
      sfx.hurt();
      bumpSurvival();
      return;
    }
    const after = Math.round(s.health) + Math.round(s.hunger) * 1000 + Math.round(s.thirst) * 1000000;
    if (after !== before) bumpSurvival();
  });

  return null;
}
