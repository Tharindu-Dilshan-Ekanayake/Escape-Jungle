import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Mesh, MeshLambertMaterial, Vector3 } from "three";
import { ZONES1 } from "../../config/zones1";
import { PartBuilder } from "../../world/geo/PartBuilder";
import { mulberry32 } from "../../world/geo/rng";
import { helicopterBody, helicopterRotor } from "../../world/props/helicopter";
import { noiseBurst, sfx } from "../audio/sfx";
import { SFX } from "../../config/audio";
import { markFinished, progress } from "../progress/progress";
import { sendRunFinished } from "../save/runSave";
import { ESCAPE, escape, escapeTime, resetEscape, startEscape } from "./escape";
import { runHandlers } from "../../net/runNet";

/** The loaded chapter's last base (read when the stage mounts). */
const pad = () => ZONES1[ZONES1.length - 1].base;
const look = new Vector3();
/** Only drawn when this close (it sits at the very end of the map). */
const DRAW_RANGE = 90;

const ease = (x: number) => x * x * (3 - 2 * x);

/**
 * The rescue helicopter on its pad: rotor idling, and after you board it
 * spins up, lifts off, turns and flies away while the camera watches from the
 * ground; then the results card (progress.finished) takes you to the lobby.
 * 2 draw calls, only near the pad.
 */
export function EscapeSystem() {
  const PAD = useMemo(pad, []);
  const camera = useThree((s) => s.camera);
  const r = useMemo(() => {
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const bb = new PartBuilder(Infinity, mulberry32(31));
    helicopterBody(bb);
    const rb = new PartBuilder(Infinity, mulberry32(32));
    helicopterRotor(rb);
    const body = new Mesh(bb.build().solid[0].geometry, mat);
    const rotor = new Mesh(rb.build().solid[0].geometry, mat);
    rotor.position.set(0, 3.12, -0.1);
    const heli = new Group();
    heli.add(body, rotor);
    heli.position.set(PAD.x, 0, PAD.z);
    return { mat, body, rotor, heli };
  }, []);

  useEffect(() => {
    resetEscape();
    // Crew boarding (server): who is aboard, then everyone takes off together.
    runHandlers.boarding = (m) => {
      escape.aboard = m;
    };
    runHandlers.depart = () => startEscape();
    return () => {
      resetEscape();
      runHandlers.boarding = null;
      runHandlers.depart = null;
      r.body.geometry.dispose();
      r.rotor.geometry.dispose();
      r.mat.dispose();
    };
  }, [r]);

  // Whop-whop while the rotor is fast.
  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (escape.active) noiseBurst({ dur: 0.09, type: "lowpass", from: 600, to: 120, volume: SFX.swing * 1.3, attack: 0.005 });
    };
    id = window.setInterval(tick, 130);
    return () => window.clearInterval(id);
  }, []);

  useFrame((_, dt) => {
    const h = r.heli;
    h.visible = escape.active || Math.hypot(camera.position.x - PAD.x, camera.position.z - PAD.z) < DRAW_RANGE;
    if (!h.visible) return;
    if (!escape.active) {
      // Idle on the pad, rotor turning slowly.
      h.position.set(PAD.x, 0, PAD.z);
      h.rotation.set(0, 0, 0);
      r.rotor.rotation.y += dt * 1.5;
      return;
    }
    const t = escapeTime();
    const spin = Math.min(1, t / ESCAPE.spinUpS);
    r.rotor.rotation.y += dt * (1.5 + spin * 26);
    const f = Math.max(0, t - ESCAPE.spinUpS) / ESCAPE.flyS;
    const k = ease(Math.min(1, f));
    // Lift straight up, tilt the nose down, turn and fly off over the jungle.
    h.position.set(PAD.x + Math.sin(k * 1.2) * k * 40, Math.min(1, f * 2.2) * 6 + k * 34, PAD.z - k * 70);
    h.rotation.set(-Math.min(0.28, f * 0.6), k * 0.9, Math.sin(t * 2) * 0.03);
    // Watch from the ground near the pad.
    const [ox, oy, oz] = ESCAPE.camOffset;
    camera.position.set(PAD.x + ox, oy, PAD.z + oz);
    camera.lookAt(look.copy(h.position).setY(h.position.y + 1.5));
    camera.updateMatrixWorld();
    if (t > ESCAPE.spinUpS + ESCAPE.flyS && !progress.finished) {
      markFinished();
      sendRunFinished(); // the save is done with: the next expedition starts fresh
      sfx.upgrade();
    }
  });

  return <primitive object={r.heli} />;
}
