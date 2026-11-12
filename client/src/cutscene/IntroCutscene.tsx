import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Color, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, RingGeometry, Vector3 } from "three";
import { mulberry32 } from "../world/geo/rng";
import { FINAL_WRECK, INTRO, SMOKE } from "../config/cutscene";
import { buildPlaneParts, PLANE_PIECES } from "./planeModel";
import { cutscene, cutsceneTime } from "./cutsceneState";
import { smokeEmitter } from "./SmokeParticles";
import { SHOULDER, canopyGeometry, jumperGeometry, jumperPose, type JumperState } from "./jumpers";

// Built once at import; sampled with preallocated vectors (no per-frame allocation).
const curve = new CatmullRomCurve3(INTRO.path.map((p) => new Vector3(...p)));
const P = new Vector3();
const T = new Vector3();
const UP = new Vector3(0, 1, 0);
const right = new Vector3();
const look = new Vector3();
const tmp = new Vector3();
const tmp2 = new Vector3();
const camTarget = new Vector3();
const ENGINE_LOCAL: [number, number, number] = [2.6, 0.5, 1.4];
const CRASH = new Vector3(...INTRO.path[INTRO.path.length - 1]);
const INTRO_FAR = 600;
/** Canopy carpet under the flight (intro only): area, how many crowns, kept clear of the real camp. */
const CANOPY = { count: 760, x: [-110, 110] as [number, number], z: [-230, 220] as [number, number], campClear: 45 };
const CANOPY_COLORS = ["#1f6b3a", "#2e8b4a", "#3f9a3a", "#4fb32e", "#1d6f55", "#5fa82a", "#2a7a40"].map((c) => new Color(c));
const probe = new Object3D();
probe.rotation.order = "YXZ";

/** Plane progress along the path at time t (eases in: it speeds up as it dives). */
const pathU = (t: number) => Math.min(1, Math.pow(Math.max(0, t) / INTRO.crashAt, INTRO.pathEase));

/** Put `o` where the plane is at time t (nose along the path, sputtering wobble once the engine fails). */
function poseOnPath(o: Object3D, t: number) {
  const u = pathU(t);
  curve.getPointAt(u, P);
  curve.getTangentAt(u, T);
  o.position.copy(P);
  o.lookAt(look.copy(P).add(T));
  if (t > INTRO.engineFailAt) o.rotateZ(Math.sin(t * 9) * 0.14 + (t - INTRO.engineFailAt) * 0.02);
  o.updateMatrixWorld();
}

/**
 * Intro director: flies the plane, drives the camera through six shots,
 * throws four parachute jumpers out of the door (they land at camp), and sends
 * the burning plane on to crash on the horizon. Afterwards the plane lies in
 * pieces at the Plane Wreck (stage 7). Reads the mutable `cutscene` state only.
 */
export function IntroCutscene({ smoke }: { smoke: number }) {
  const camera = useThree((s) => s.camera);
  const r = useMemo(() => {
    const parts = buildPlaneParts();
    // A little inner glow so the white plane stays crisp in the teal jungle light.
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false, emissive: "#2b2b2b" });
    const glowMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const root = new Group();
    const rig = new Object3D();
    rig.rotation.order = "YXZ";
    const pieces = PLANE_PIECES.map((name) => {
      const part = parts[name];
      const obj = new Group();
      obj.rotation.order = "YXZ";
      obj.add(new Mesh(part.solid, mat));
      if (part.glow) obj.add(new Mesh(part.glow, glowMat));
      root.add(obj);
      return { name, obj, pivot: new Vector3(...part.pivot) };
    });
    // Jumpers: body + canopy each (cutscene only).
    const jumpers = INTRO.jumpers.map((j) => {
      const body = new Mesh(jumperGeometry(j.who), mat);
      const canopy = new Mesh(canopyGeometry(j.who), mat);
      body.rotation.order = canopy.rotation.order = "YXZ";
      body.visible = canopy.visible = false;
      root.add(body, canopy);
      const state: JumperState = { pos: new Vector3(), yaw: 0, pitch: 0, roll: 0, canopy: 0, collapse: 0, out: false };
      return { j, body, canopy, state, exit: new Vector3(), vel: new Vector3(), ready: false };
    });
    // Fireball on the horizon when the plane goes down.
    const flashMat = new MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0, fog: false, toneMapped: false, depthWrite: false });
    const flash = new Mesh(new IcosahedronGeometry(1, 1), flashMat);
    flash.position.copy(CRASH).y += 14;
    flash.visible = false;
    root.add(flash);
    // Jungle canopy seen from the plane: a carpet of tree crowns along the flight path (intro only).
    const canopyMat = new MeshLambertMaterial({ flatShading: true, fog: false });
    const canopy = new InstancedMesh(new IcosahedronGeometry(1, 0), canopyMat, CANOPY.count);
    const rnd = mulberry32(5150);
    let n = 0;
    for (let t = 0; t < CANOPY.count * 3 && n < CANOPY.count; t++) {
      const x = CANOPY.x[0] + rnd() * (CANOPY.x[1] - CANOPY.x[0]);
      const z = CANOPY.z[0] + rnd() * (CANOPY.z[1] - CANOPY.z[0]);
      if (Math.hypot(x, z) < CANOPY.campClear) continue; // the real Landing Site is there
      const s = 6.5 + rnd() * 5;
      probe.position.set(x, 9 + rnd() * 9, z);
      probe.rotation.set(0, rnd() * 3, 0);
      probe.scale.set(s, s * (0.55 + rnd() * 0.25), s);
      probe.updateMatrix();
      canopy.setMatrixAt(n, probe.matrix);
      canopy.setColorAt(n, CANOPY_COLORS[Math.floor(rnd() * CANOPY_COLORS.length)]);
      n++;
    }
    canopy.count = n;
    canopy.frustumCulled = false;
    root.add(canopy);
    // Dark jungle floor under the canopy (instead of the flat fog-coloured ground), outside the camp area.
    const floorMat = new MeshBasicMaterial({ color: "#173d24", fog: false });
    const floor = new Mesh(new RingGeometry(CANOPY.campClear, 420, 48, 1).rotateX(-Math.PI / 2), floorMat);
    floor.position.y = 2;
    root.add(floor);
    return { root, rig, pieces, jumpers, mat, glowMat, parts, flash, flashMat, canopy, canopyMat, floor, floorMat };
  }, []);
  const state = useRef({ wreck: false, lastT: 0, far: 0 });

  useEffect(
    () => () => {
      for (const n of PLANE_PIECES) {
        r.parts[n].solid.dispose();
        r.parts[n].glow?.dispose();
      }
      for (const jp of r.jumpers) {
        jp.body.geometry.dispose();
        jp.canopy.geometry.dispose();
      }
      r.flash.geometry.dispose();
      r.canopy.geometry.dispose();
      r.canopyMat.dispose();
      r.floor.geometry.dispose();
      r.floorMat.dispose();
      r.flashMat.dispose();
      r.mat.dispose();
      r.glowMat.dispose();
      smokeEmitter.rate = 0;
    },
    [r],
  );

  /** The whole plane follows the rig. */
  const follow = () => {
    for (const p of r.pieces) {
      r.rig.localToWorld(p.obj.position.copy(p.pivot));
      p.obj.quaternion.copy(r.rig.quaternion);
      p.obj.visible = true;
    }
  };

  /** After the intro: the plane lies broken at the Plane Wreck, smoking. */
  const placeWreck = () => {
    for (const p of r.pieces) {
      const w = FINAL_WRECK.pieces[p.name];
      p.obj.position.set(...w.pos);
      p.obj.rotation.set(w.rot[0], w.rot[1], w.rot[2], "YXZ");
      p.obj.visible = true;
    }
    for (const jp of r.jumpers) jp.body.visible = jp.canopy.visible = false;
    r.flash.visible = false;
    const n = FINAL_WRECK.pieces.nose.pos;
    smokeEmitter.x = n[0];
    smokeEmitter.y = n[1] + 1;
    smokeEmitter.z = n[2];
    smokeEmitter.rate = SMOKE.rate * 0.45 * smoke;
  };

  useFrame(() => {
    const s = state.current;
    const cam = camera as typeof camera & { far: number; updateProjectionMatrix: () => void };
    // The canopy carpet is for the high shots; near the camp the real jungle takes over.
    const high = cutscene.active && cutsceneTime() < INTRO.shots.follow;
    r.canopy.visible = high;
    r.floor.visible = high;
    if (!cutscene.active) {
      if (!s.wreck) {
        placeWreck();
        s.wreck = true;
        // Back to the normal draw distance.
        if (s.far) {
          cam.far = s.far;
          cam.updateProjectionMatrix();
          s.far = 0;
        }
      }
      return;
    }
    // See the plane all the way to the horizon during the intro (terrain past the fog isn't drawn anyway).
    if (!s.far) {
      s.far = cam.far;
      cam.far = INTRO_FAR;
      cam.updateProjectionMatrix();
    }
    const t = cutsceneTime();
    if (s.wreck || t < s.lastT) {
      s.wreck = false;
      for (const jp of r.jumpers) jp.ready = false;
    }
    s.lastT = t;

    // --- Plane ---
    const flying = t < INTRO.crashAt;
    if (flying) {
      poseOnPath(r.rig, t);
      follow();
      if (t > INTRO.engineFailAt) {
        r.rig.localToWorld(tmp.set(...ENGINE_LOCAL));
        smokeEmitter.x = tmp.x;
        smokeEmitter.y = tmp.y;
        smokeEmitter.z = tmp.z;
        smokeEmitter.rate = SMOKE.rate * smoke;
      } else smokeEmitter.rate = 0;
    } else {
      for (const p of r.pieces) p.obj.visible = false;
      smokeEmitter.rate = 0;
    }
    // Fireball on the horizon.
    const fk = (t - INTRO.crashAt) / 1.4;
    r.flash.visible = fk > 0 && fk < 1;
    if (r.flash.visible) {
      r.flash.scale.setScalar(6 + fk * 50);
      r.flashMat.opacity = (1 - fk) * 0.9;
    }

    // --- Jumpers ---
    for (const jp of r.jumpers) {
      if (!jp.ready && t >= jp.j.exit) {
        // Where the door was when they jumped, and their push-off velocity.
        poseOnPath(probe, jp.j.exit);
        probe.localToWorld(jp.exit.set(...INTRO.door));
        poseOnPath(probe, jp.j.exit + 0.05);
        probe.localToWorld(tmp2.set(...INTRO.door));
        jp.vel.copy(tmp2).sub(jp.exit).divideScalar(0.05).multiplyScalar(0.5);
        probe.localToWorld(tmp.set(-1, 0, 0)).sub(probe.position).normalize();
        jp.vel.addScaledVector(tmp, 3).y += 1;
        jp.state.pos.copy(jp.exit);
        jp.state.yaw = Math.atan2(jp.vel.x, jp.vel.z);
        jp.ready = true;
      }
      if (!jp.ready) {
        jp.body.visible = jp.canopy.visible = false;
        continue;
      }
      const st = jp.state;
      jumperPose(jp.j, t, jp.exit, jp.vel, st, tmp);
      jp.body.visible = true;
      jp.body.position.copy(st.pos);
      jp.body.rotation.set(st.pitch, st.yaw, st.roll, "YXZ");
      const c = st.canopy * (1 - st.collapse);
      jp.canopy.visible = st.canopy > 0.02 && st.collapse < 1;
      if (jp.canopy.visible) {
        jp.canopy.position.set(st.pos.x, st.pos.y + SHOULDER * (1 - st.collapse * 0.9), st.pos.z);
        jp.canopy.rotation.set(st.pitch * 0.5 + st.collapse * 1.3, st.yaw, st.roll * 0.6, "YXZ");
        jp.canopy.scale.set(Math.max(0.05, st.canopy), Math.max(0.05, c), Math.max(0.05, st.canopy));
      }
    }

    // --- Camera ---
    const sh = INTRO.shots;
    const you = r.jumpers[0].state.pos;
    if (t < sh.door) {
      poseOnPath(probe, t);
      curve.getTangentAt(pathU(t), T);
      right.crossVectors(T, UP).normalize();
      const o = t < sh.close ? INTRO.sideOffset : INTRO.closeOffset;
      camera.position.copy(probe.position).addScaledVector(right, o[0]).addScaledVector(UP, o[1]).addScaledVector(T, o[2]);
      camera.lookAt(probe.position);
    } else if (t < sh.follow) {
      // Fixed to the plane, watching the door as everyone jumps.
      r.rig.localToWorld(camera.position.set(...INTRO.doorCam));
      r.rig.localToWorld(camTarget.set(INTRO.door[0], INTRO.door[1] - 1.5, INTRO.door[2] - 2));
      camera.lookAt(camTarget);
    } else if (t < sh.watch) {
      const a = (t - sh.follow) * 0.28;
      const [ox, oy, oz] = INTRO.followOffset;
      camera.position.set(you.x + ox * Math.cos(a) - oz * Math.sin(a), you.y + oy, you.z + ox * Math.sin(a) + oz * Math.cos(a));
      camera.lookAt(camTarget.set(you.x, you.y + 2.2, you.z));
    } else if (t < sh.glide) {
      // Behind your shoulder, turning to watch the plane go down.
      const target = flying ? r.rig.position : CRASH;
      tmp.copy(target).sub(you).setY(0).normalize();
      // A little to the side so the other parachutes don't block the view.
      camera.position.set(you.x - tmp.x * 3.2 - tmp.z * 2.4, you.y + 2.6, you.z - tmp.z * 3.2 + tmp.x * 2.4);
      const k = Math.min(1, (t - sh.watch) / 0.9);
      const e = k * k * (3 - 2 * k);
      camTarget.set(you.x, you.y + 2, you.z).lerp(target, e * 0.999);
      camera.lookAt(camTarget);
    } else if (t < sh.ground) {
      // Gliding down: above and behind you, looking down at the clearing.
      const [lx, lz] = INTRO.jumpers[0].to;
      tmp.set(lx - you.x, 0, lz - you.z);
      const len = Math.max(0.001, tmp.length());
      tmp.divideScalar(len);
      camera.position.set(you.x - tmp.x * 6, you.y + 4.5, you.z - tmp.z * 6);
      camera.lookAt(camTarget.set(lx, 0, lz).lerp(you, 0.45));
    } else {
      const [lx, lz] = INTRO.jumpers[0].to;
      const [gx, gy, gz] = INTRO.groundOffset;
      camera.position.set(lx + gx, gy, lz + gz);
      camera.lookAt(camTarget.set(you.x, you.y + 1.3, you.z));
    }
    // A small jolt when the plane hits the ground far away.
    const k = Math.max(0, 1 - (t - INTRO.crashAt) / INTRO.shake.duration);
    if (t > INTRO.crashAt && k > 0) {
      const a = INTRO.shake.amount * k;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    camera.updateMatrixWorld();
  });

  return <primitive object={r.root} />;
}
