import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D } from "three";
import { ADVENTURE_RULES as R } from "../../config/adventures";
import { ZONES1 } from "../../config/zones1";
import type { GrassField } from "../../grass/GrassField";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { note } from "../survival/survival";
import { sfx } from "../audio/sfx";
import { onRunSync, runHandlers } from "../../net/runNet";
import { npcGeometry } from "./npcModels";
import { butterflyGlowGeometry, frogGeometry, lanternFlameGeometry, lanternGeometry, markerGeometry, suitcaseGeometry } from "./questModels";
import { addProgress, adventures, applyShared, butterflyTimeLeft, ST, type Adventure } from "./adventures";

const dummy = new Object3D();
const MARKERS = 24;
const NPC_RANGE = 60;
const YELLOW = new Color("#ffd23f");
const GREEN = new Color("#5ee05e");
const WHITE = new Color("#ffffff");
const BLUE = new Color("#7fd3ff");
const by = (id: string) => adventures.list.find((a) => a.def.id === id);

/** The monkey was caught by me: the compass counts for "Cheeky Monkey". */
export function monkeyCaught() {
  const a = by("monkey");
  if (a && a.state === ST.Active) {
    note("🧭 Got the golden compass! Take it back to Professor Fern");
    addProgress(a);
  } else note("🐒 The monkey runs off giggling...");
}

/**
 * Adventure world objects: the six quest givers (idle + turn toward you),
 * suitcases, frogs, lanterns, golden butterflies and floating markers.
 * ~8 draw calls when everything is near; far characters are hidden.
 */
export function AdventureSystem({ fields }: { fields: GrassField[] }) {
  const r = useMemo(() => {
    const solid = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const glow = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
    const npcs = adventures.list.map((a) => {
      const g = npcGeometry(a.def.npc.look);
      const group = new Group();
      group.add(new Mesh(g.solid, solid));
      if (g.glow) group.add(new Mesh(g.glow, glow));
      group.position.set(a.npc.x, 0, a.npc.z);
      group.rotation.y = a.npc.yaw;
      return { group, geos: [g.solid, g.glow], yaw: a.npc.yaw };
    });
    const inst = (geo: ReturnType<typeof suitcaseGeometry>, mat: MeshLambertMaterial | MeshBasicMaterial, n: number) => {
      const m = new InstancedMesh(geo, mat, n);
      m.frustumCulled = false;
      m.count = 0;
      return m;
    };
    const suitcases = inst(suitcaseGeometry(), solid, 6);
    const frogs = inst(frogGeometry(), solid, 6);
    const lanterns = inst(lanternGeometry(), solid, 6);
    const flames = inst(lanternFlameGeometry(), glow, 6);
    const butterflies = inst(butterflyGlowGeometry(), glow, 8);
    const markers = inst(markerGeometry(), glow, MARKERS);
    for (let i = 0; i < MARKERS; i++) markers.setColorAt(i, WHITE);
    return { solid, glow, npcs, suitcases, frogs, lanterns, flames, butterflies, markers };
  }, []);

  useEffect(() => {
    runHandlers.prize = () => monkeyCaught();
    runHandlers.adv = (m) => applyShared(m, m.by ?? null, false);
    const offSync = onRunSync((p) => p.adv?.forEach((st) => applyShared(st, null, true)));
    return () => {
      runHandlers.prize = null;
      runHandlers.adv = null;
      offSync();
      r.solid.dispose();
      r.glow.dispose();
      for (const n of r.npcs) n.geos.forEach((g) => g?.dispose());
      for (const m of [r.suitcases, r.frogs, r.lanterns, r.flames, r.butterflies, r.markers]) m.geometry.dispose();
    };
  }, [r]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const now = performance.now() / 1000;
    const active = !cutscene.active;
    let mk = 0;
    const marker = (x: number, y: number, z: number, c: Color, s = 1) => {
      if (mk >= MARKERS) return;
      dummy.position.set(x, y + Math.sin(t * 2.5 + x) * 0.15, z);
      dummy.rotation.set(0, t * 2, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      r.markers.setMatrixAt(mk, dummy.matrix);
      r.markers.setColorAt(mk, c);
      mk++;
    };

    // Quest givers.
    adventures.list.forEach((a, i) => {
      const n = r.npcs[i];
      const d = Math.hypot(a.npc.x - player.x, a.npc.z - player.z);
      // Nobody is standing around before the plane has even crashed (intro).
      n.group.visible = active && d < NPC_RANGE;
      if (!n.group.visible) return;
      const want = d < 9 ? Math.atan2(player.x - a.npc.x, player.z - a.npc.z) : n.yaw;
      const cur = n.group.rotation.y;
      n.group.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * 0.08;
      n.group.position.y = Math.abs(Math.sin(t * 2 + i)) * 0.04;
      n.group.scale.y = 1 + Math.sin(t * 2.2 + i) * 0.015;
      const top = a.def.npc.look === "monkeyKing" || a.def.npc.look === "gorillaChief" ? 3.1 : a.def.npc.look === "frog" ? 2.4 : 2.75;
      if (a.state === ST.New) marker(a.npc.x, top, a.npc.z, YELLOW, 1.2);
      else if (a.state === ST.Ready) marker(a.npc.x, top, a.npc.z, GREEN, 1.2);
    });

    const items = (a: Adventure | undefined, mesh: InstancedMesh, keepGot: boolean, after?: (k: number, got: boolean) => void) => {
      let n = 0;
      if (!a || a.state === ST.New) {
        mesh.count = 0;
        return;
      }
      a.items.forEach((it, k) => {
        if (it.got && !keepGot) return;
        if (Math.hypot(it.x - player.x, it.z - player.z) > NPC_RANGE) return;
        dummy.position.set(it.x, 0, it.z);
        dummy.rotation.set(0, k * 1.9, 0);
        dummy.scale.setScalar(1);
        after?.(k, it.got);
        dummy.updateMatrix();
        mesh.setMatrixAt(n++, dummy.matrix);
        if (!it.got && a.state === ST.Active) marker(it.x, R.markerHeight, it.z, a.def.id === "lanterns" ? BLUE : WHITE, 0.8);
      });
      mesh.count = n;
    };

    // Suitcases + frogs: collected by walking up to them (after cutting the grass).
    const luggage = by("luggage");
    const frogs = by("frogs");
    for (const a of [luggage, frogs]) {
      if (!a || a.state !== ST.Active || !active) continue;
      a.items.forEach((it) => {
        if (it.got || Math.hypot(it.x - player.x, it.z - player.z) > R.pickupRadius) return;
        if (it.cell >= 0 && fields[it.zone]?.isAlive(it.cell)) return;
        it.got = true;
        if (a.def.id === "frogs") sfx.croak(a.progress);
        else sfx.woodPick();
        if (a.progress + 1 < a.def.count) note(`${a.def.icon} ${a.progress + 1} / ${a.def.count}`);
        if (a.def.id === "frogs" && a.progress + 1 >= a.def.count) sfx.melody();
        addProgress(a);
      });
    }
    items(luggage, r.suitcases, false);
    items(frogs, r.frogs, true, (k, got) => {
      // Found frogs sing (bounce); lost ones sit and blink.
      dummy.position.y = got ? Math.abs(Math.sin(t * 6 + k)) * 0.25 : 0;
      dummy.scale.setScalar(got ? 1.15 : 1);
    });
    const lan = by("lanterns");
    items(lan, r.lanterns, true);
    let fl = 0;
    if (lan && lan.state !== ST.New)
      for (const it of lan.items) {
        if (!it.got) continue;
        dummy.position.set(it.x, 0, it.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1 + Math.sin(t * 8) * 0.04);
        dummy.updateMatrix();
        r.flames.setMatrixAt(fl++, dummy.matrix);
      }
    r.flames.count = fl;

    // Golden butterflies: loops over Flower Hollow; run into them before time runs out.
    const bf = by("butterflies");
    let bn = 0;
    if (bf && bf.state === ST.Active) {
      const left = butterflyTimeLeft(bf, now);
      const rect = ZONES1[bf.def.zone].rect;
      const cx = (rect.minX + rect.maxX) / 2;
      const cz = (rect.minZ + rect.maxZ) / 2;
      const rx = (rect.maxX - rect.minX) / 2 - 3;
      const rz = (rect.maxZ - rect.minZ) / 2 - 3;
      if (left <= 0) {
        if (bf.items.some((it) => !it.got) && bf.progress > -1) {
          bf.progress = -1; // flag: timed out until restarted
          note("⏰ Time's up! Talk to Bea to try again");
          adventures.version++;
        }
      } else
        bf.items.forEach((it, k) => {
          if (it.got) return;
          it.x = cx + Math.cos(t * 0.23 + k * 1.1) * rx * (0.5 + 0.4 * Math.sin(t * 0.11 + k));
          it.z = cz + Math.sin(t * 0.19 + k * 1.7) * rz * (0.5 + 0.4 * Math.cos(t * 0.13 + k));
          const y = 1.3 + Math.sin(t * 1.9 + k) * 0.4;
          if (active && Math.hypot(it.x - player.x, it.z - player.z) < R.butterflyCatchRadius) {
            it.got = true;
            sfx.reveal();
            addProgress(bf);
            return;
          }
          dummy.position.set(it.x, y, it.z);
          dummy.rotation.set(0, t * 0.8 + k, 0);
          dummy.scale.set(0.3 + 0.7 * Math.abs(Math.sin(t * 14 + k)), 1, 1);
          dummy.updateMatrix();
          r.butterflies.setMatrixAt(bn++, dummy.matrix);
          marker(it.x, y + 1.2, it.z, YELLOW, 0.6);
        });
    }
    r.butterflies.count = bn;

    r.markers.count = mk;
    for (const m of [r.suitcases, r.frogs, r.lanterns, r.flames, r.butterflies, r.markers]) m.instanceMatrix.needsUpdate = true;
    if (r.markers.instanceColor) r.markers.instanceColor.needsUpdate = true;
  });

  return (
    <>
      {r.npcs.map((n, i) => (
        <primitive key={i} object={n.group} />
      ))}
      <primitive object={r.suitcases} />
      <primitive object={r.frogs} />
      <primitive object={r.lanterns} />
      <primitive object={r.flames} />
      <primitive object={r.butterflies} />
      <primitive object={r.markers} />
    </>
  );
}
