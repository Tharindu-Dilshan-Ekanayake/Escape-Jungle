import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CUTTING, LEAF_PARTICLES, PLANT_TYPES } from "../../config/grass";
import type { GrassField } from "../../grass/GrassField";
import { spawnLeaves } from "../../grass/LeafParticles";
import { input } from "../player/input";
import { player } from "../player/FirstPersonController";
import { cutState, runStats } from "./cutState";
import { cutscene } from "../../cutscene/cutsceneState";
import { sfx } from "../audio/sfx";
import { addToBag, isBagFull, sharpness, swingMultiplier, tool } from "../economy/economy";
import { onRunSync, queueCut, runHandlers, runNet } from "../../net/runNet";
import { survival, swingCost, workMultiplier } from "../survival/survival";
import { animals, hitAnimal, statsOf } from "../animals/animals";
import { chopTree, treeInSwing } from "../chop/chopTrees";
import { FIREWOOD } from "../../config/firewood";
import { RUN_RULES } from "@shared";
import { AS } from "../../config/animals";

/** Leaves spawned for grass cut by party members (per batch, near the player only). */
const REMOTE_LEAVES_RANGE = 30;

/** Apply cells another player cut (no bag reward). */
function applyRemoteCuts(fields: GrassField[], z: number, cells: number[]) {
  const f = fields[z];
  if (!f) return;
  const now = performance.now() / 1000;
  let leaves = 0;
  for (const i of cells) {
    if (i < 0 || i >= f.count || !f.cut(i, now)) continue;
    if (leaves < 6 && Math.hypot(f.cellX(i) - player.x, f.cellZ(i) - player.z) < REMOTE_LEAVES_RANGE) {
      spawnLeaves(f.cellX(i), 0.8, f.cellZ(i), 1, f.plantId);
      leaves++;
    }
  }
}

/**
 * Hold-to-cut (CLAUDE.md 5.1): while the cut input is held, swing every
 * swingInterval / swingSpeed; each swing damages alive cells in a forward arc
 * (radius = tool.range, angle = tool.arc). Cut blades go into the bag; a full
 * bag stops cutting until it is emptied at the grinder. No setState here.
 */
export function CutSystem({ fields }: { fields: GrassField[] }) {
  const hits = useMemo(() => new Int32Array(512), []);

  useEffect(() => {
    runHandlers.cleared = (z, cells) => applyRemoteCuts(fields, z, cells);
    const off = onRunSync((p) => {
      for (const { z, c } of p.cleared) applyRemoteCuts(fields, z, c);
    });
    return () => {
      runHandlers.cleared = null;
      off();
    };
  }, [fields]);

  useFrame((_, dt) => {
    if (cutscene.active || survival.faintAt) return;
    if (cutState.swingT >= 0) {
      cutState.swingT += dt;
      if (!cutState.hitDone && cutState.swingT >= CUTTING.hitDelay) {
        cutState.hitDone = true;
        hit(fields, hits, performance.now() / 1000);
      }
      if (cutState.swingT >= cutState.swingDuration) cutState.swingT = -1;
    }
    if (cutState.swingT < 0 && input.cut) {
      cutState.swingT = 0;
      cutState.hitDone = false;
      // Hungry or thirsty = slower swings.
      cutState.swingDuration = tool().swingInterval / (swingMultiplier() * workMultiplier());
      runNet.swingCount++;
      swingCost();
      if ("motor" in tool()) sfx.motor();
      else sfx.swing();
    }
  });

  return null;
}

function hit(fields: GrassField[], out: Int32Array, now: number) {
  // Animals in the arc take the hit first (works even with a full bag).
  const tl = tool();
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const cosA = Math.cos(((tl.arcDeg / 2) * Math.PI) / 180);
  let struck = false;
  for (const a of animals.list) {
    if (a.state === AS.Dead) continue;
    const dx = a.x - player.x;
    const dz = a.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d > tl.range + statsOf(a.kind).radius) continue;
    if (d > 0.6 && (dx * fx + dz * fz) / d < cosA) continue;
    hitAnimal(a, 1); // one hit each: HITS_TO_KILL hits down any animal
    struck = true;
  }
  // Firewood trees: a swing at the trunk chops it (works with a full bag too). Better blades chop faster.
  const tree = treeInSwing(player.x, player.z, fx, fz, Math.max(tl.range, FIREWOOD.reach), cosA);
  if (tree >= 0) {
    chopTree(tree, Math.min(RUN_RULES.maxChopDmg, 1 + Math.floor((tl.tier - 1) / 2)));
    struck = true;
  }
  if (isBagFull()) {
    if (struck) return;
    const nowS = performance.now() / 1000;
    if (nowS > cutState.bagFullUntil) sfx.denied(); // at most once per hint window
    cutState.bagFullUntil = nowS + CUTTING.hintSeconds;
    return;
  }
  const t = tool();
  const dirX = -Math.sin(player.yaw);
  const dirZ = -Math.cos(player.yaw);
  const cosHalf = Math.cos(((t.arcDeg / 2) * Math.PI) / 180);
  const damage = t.damage + sharpness();
  let leaves = 0;
  let blocked = false;
  let cutAny = false;
  let lastValue = 0;
  let cutCount = 0;

  for (const field of fields) {
  const n = field.queryArc(player.x, player.z, dirX, dirZ, t.range, cosHalf, CUTTING.closeRadius, out);
  for (let k = 0; k < n; k++) {
    const i = out[k];
    const plant = PLANT_TYPES[field.type[i]];
    if (!plant) continue;
    if (plant.minToolTier > t.tier) {
      blocked = true;
      continue;
    }
    const hp = field.hp[i] - damage;
    if (hp > 0) {
      field.hp[i] = hp;
      continue;
    }
    if (isBagFull()) break; // bag filled up mid-swing: leave the rest standing
    if (!field.cut(i, now)) continue;
    queueCut(fields.indexOf(field), i);
    addToBag(plant.blades, plant.cashValue);
    runStats.blades += plant.blades;
    runStats.cellsCut++;
    cutAny = true;
    cutCount++;
    lastValue = plant.cashValue;
    if (leaves < LEAF_PARTICLES.maxPerSwing) {
      spawnLeaves(field.cellX(i), 0.6 + Math.random() * 0.8, field.cellZ(i), LEAF_PARTICLES.perCell, plant.id);
      leaves += LEAF_PARTICLES.perCell;
    }
  }
  }
  if (cutAny) sfx.cut(cutCount);
  // Sharpness: +1 bonus blade per level on every swing that cuts something.
  if (cutAny && sharpness() > 0) addToBag(sharpness(), lastValue);
  if (blocked) cutState.needToolUntil = performance.now() / 1000 + CUTTING.hintSeconds;
}
