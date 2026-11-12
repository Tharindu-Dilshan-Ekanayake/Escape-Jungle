import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { LOOK, PLAYER } from "../../config/player";
import { economy, walkSpeedFor } from "../economy/economy";
import { cutscene } from "../../cutscene/cutsceneState";
import { survival, workMultiplier } from "../survival/survival";
import { sfx } from "../audio/sfx";
import { setFootsteps } from "../audio/loops";
import { THIRD_PERSON } from "../../config/lobby";
import { DEVICE } from "../../store/device";
import { onRespawnRequest } from "../../platform/boxity";
import { input, installInput } from "./input";
import { floorAt, resolveCollisions, type Collider, type Region } from "./collision";
import { escape } from "../escape/escape";

interface Props {
  colliders: readonly Collider[];
  spawn: { x: number; z: number; yaw: number };
  region: Region;
  /** Extra blocking after static colliders (alive plants): gets the pre-step position. */
  extraCollide?: (p: { x: number; z: number }, radius: number, prevX: number, prevZ: number) => void;
  /** "first" in the jungle; "third" (orbit camera behind the avatar) in the lobby. */
  view?: "first" | "third";
}

/**
 * Hot-path player state: plain mutable object, read by other systems via import.
 * yaw/pitch = camera; facing = the avatar's body direction (third person).
 */
export const player = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, facing: 0, grounded: true };
// Dev only: lets automated checks read the player (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __player: typeof player }).__player = player;

/** A server teleport that arrived before the next stage mounted; used as its spawn. */
let pendingSpawn: { x: number; z: number; yaw: number } | null = null;
export function setPendingSpawn(s: { x: number; z: number; yaw: number }) {
  pendingSpawn = s;
}

const lookTarget = new Vector3();
/** Smoothed third-person camera distance and follow height. */
const camSmooth = { dist: -1, y: 0 };
/** Look deltas not yet applied (smoothed in over a few frames). */
const lookBuf = { x: 0, y: 0 };
/** Which way the body is currently turning (-1, 0, 1). */
let turnSign = 0;

/** Current third-person camera distance (wheel zoom). */
let camDistance = THIRD_PERSON.distance;

/** Dev only: `?spawn=x,z,yawDeg` to start somewhere else (screenshot checks). */
function devSpawnOverride() {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(location.search).get("spawn")?.split(",").map(Number);
  if (!v || v.length !== 3 || v.some((n) => !Number.isFinite(n))) return null;
  return { x: v[0], z: v[1], yaw: (v[2] * Math.PI) / 180 };
}



/** WASD + mouse look (pointer lock) + jump, with flat-ground XZ collision. */
export function FirstPersonController({ colliders, spawn, region, extraCollide, view = "first" }: Props) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const start = devSpawnOverride() ?? (view === "third" ? pendingSpawn : null) ?? spawn;
    pendingSpawn = null;
    const reset = () => {
      Object.assign(player, {
        x: start.x, y: 0, z: start.z, vx: 0, vy: 0, vz: 0,
        yaw: start.yaw, pitch: view === "third" ? -0.25 : 0, facing: start.yaw, grounded: true,
      });
    };
    reset();
    camera.rotation.order = "YXZ";
    // Pointer lock only in the jungle (first person); the lobby keeps a free mouse.
    const desktop = !DEVICE.prefersTouchControls;
    const cleanupInput = installInput(gl.domElement, { pointerLock: desktop && view === "first", dragLook: desktop && view === "third" });
    camDistance = THIRD_PERSON.distance;
    const offRespawn = onRespawnRequest(reset); // Boxity menu "Reset Character"
    return () => {
      cleanupInput();
      offRespawn();
      setFootsteps(false, 0);
    };
  }, [camera, gl, spawn, view]);

  useFrame((_, delta) => {
    const p = player;
    // Frozen during the intro cutscene (it drives the camera) and while passed out.
    if (cutscene.active || survival.faintAt || escape.active) {
      setFootsteps(false, 0);
      p.vx = p.vz = 0;
      input.lookX = input.lookY = 0;
      lookBuf.x = lookBuf.y = 0;
      return;
    }
    const third = view === "third";

    // Look: raw deltas go into a small buffer that drains smoothly, so uneven
    // mouse/touch event timing never shows up as stutter while turning.
    lookBuf.x += input.lookX;
    lookBuf.y += input.lookY;
    input.lookX = 0;
    input.lookY = 0;
    const lk = 1 - Math.exp(-delta / (third ? LOOK.smoothThird : LOOK.smoothFirst));
    const lx = lookBuf.x * lk;
    const ly = lookBuf.y * lk;
    lookBuf.x -= lx;
    lookBuf.y -= ly;
    p.yaw -= lx;
    const minPitch = third ? THIRD_PERSON.minPitch : -PLAYER.pitchLimit;
    const maxPitch = third ? THIRD_PERSON.maxPitch : PLAYER.pitchLimit;
    p.pitch = Math.max(minPitch, Math.min(maxPitch, p.pitch - ly));

    // Move intent (keyboard + joystick), clamped to length 1
    let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joyX;
    let iz = (input.forward ? 1 : 0) - (input.back ? 1 : 0) + input.joyY;
    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }
    const sin = Math.sin(p.yaw);
    const cos = Math.cos(p.yaw);
    // Legs upgrade applies in the jungle; the lobby always uses the base speed.
    // Hunger / thirst slow you down in the jungle.
    const speed = third ? walkSpeedFor(0) : walkSpeedFor(economy.levels.legs) * workMultiplier();
    // yaw 0 looks down -Z; right vector = (cos, -sin), forward = (-sin, -cos)
    const tx = (ix * cos - iz * sin) * speed;
    const tz = (-ix * sin - iz * cos) * speed;

    // Fixed-size sub-steps so slow frames don't slow the player down.
    const steps = Math.min(PLAYER.maxSteps, Math.max(1, Math.ceil(delta / PLAYER.maxDt)));
    const dt = Math.min(delta, PLAYER.maxDt * PLAYER.maxSteps) / steps;
    for (let s = 0; s < steps; s++) {
      const k = 1 - Math.exp(-PLAYER.accel * (p.grounded ? 1 : PLAYER.airControl) * dt);
      p.vx += (tx - p.vx) * k;
      p.vz += (tz - p.vz) * k;

      if (input.jump && p.grounded) {
        p.vy = PLAYER.jumpVelocity;
        p.grounded = false;
        sfx.jump();
      }
      p.vy -= PLAYER.gravity * dt;
      p.y += p.vy * dt;
      // Floor = the ground, or the top of a low obstacle you jumped onto.
      const floor = floorAt(p.x, p.z, colliders);
      if (p.y <= floor) {
        if (!p.grounded && p.vy < -PLAYER.landSoundSpeed) sfx.land();
        p.y = floor;
        p.vy = 0;
        p.grounded = true;
      } else if (p.y > floor + 0.05) {
        p.grounded = false; // walked off the edge: fall
      }

      const prevX = p.x;
      const prevZ = p.z;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      resolveCollisions(p, colliders, PLAYER.radius, region, PLAYER.collisionPasses);
      extraCollide?.(p, PLAYER.radius, prevX, prevZ);
    }

    // Footsteps while walking on the ground, pitched by speed.
    const hs = Math.hypot(p.vx, p.vz);
    setFootsteps(p.grounded && hs > PLAYER.footstepMinSpeed, Math.min(1, hs / walkSpeedFor(0)));

    if (third) {
      // Body turns toward the move direction; camera orbits behind the head.
      if (Math.hypot(tx, tz) > 0.1) {
        const want = Math.atan2(-tx, -tz);
        let d = want - p.facing;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        // Turning right round: keep going the same way instead of flip-flopping at 180°.
        if (Math.abs(d) > 2.6 && turnSign !== 0 && Math.sign(d) !== turnSign) d -= turnSign * -2 * Math.PI;
        turnSign = Math.abs(d) > 0.05 ? Math.sign(d) : 0;
        // Frame-rate independent ease, capped so a spin never snaps in one frame.
        const step = d * (1 - Math.exp(-THIRD_PERSON.turnRate * delta));
        const maxStep = THIRD_PERSON.maxTurnSpeed * delta;
        p.facing += Math.max(-maxStep, Math.min(maxStep, step));
        p.facing = Math.atan2(Math.sin(p.facing), Math.cos(p.facing));
      }
      if (input.zoom) {
        camDistance = Math.min(THIRD_PERSON.maxDistance, Math.max(THIRD_PERSON.minDistance, camDistance + input.zoom * THIRD_PERSON.zoomStep));
        input.zoom = 0;
      }
      // Smooth camera: eased zoom and a softened vertical follow (jumps, steps).
      const ease = 1 - Math.exp(-10 * delta);
      if (camSmooth.dist < 0) {
        camSmooth.dist = camDistance;
        camSmooth.y = p.y;
      }
      camSmooth.dist += (camDistance - camSmooth.dist) * ease;
      camSmooth.y += (p.y - camSmooth.y) * (1 - Math.exp(-12 * delta));
      const cp = Math.cos(p.pitch);
      const dist = camSmooth.dist;
      lookTarget.set(p.x, camSmooth.y + THIRD_PERSON.targetHeight, p.z);
      camera.position.set(
        lookTarget.x + Math.sin(p.yaw) * cp * dist,
        Math.max(0.4, lookTarget.y - Math.sin(p.pitch) * dist),
        lookTarget.z + Math.cos(p.yaw) * cp * dist,
      );
      camera.lookAt(lookTarget);
    } else {
      p.facing = p.yaw;
      camera.position.set(p.x, p.y + PLAYER.eyeHeight, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0);
    }
    // Later useFrame users (labels, culling) must see this frame's camera, not last frame's.
    camera.updateMatrixWorld();
  });

  return null;
}
