import { Quaternion, Vector3, type Bone, type Group, type Object3D } from "three";

/**
 * Procedural idle / walk-run / airborne poses for player.glb (it ships no
 * clips). Ported from the Bloxity SDK template's avatarRig.js.
 *
 * The rig's bone local axes are NOT character-aligned (a limb's local X points
 * along -Z, etc.), so for every bone we precompute which LOCAL axis matches the
 * character's X (forward/back swing) and Z (sideways sway), and rotate about those.
 */
export interface BoneAxes {
  x: Vector3;
  /** Character up (turning the head). */
  y: Vector3;
  z: Vector3;
}

const axesCache = new WeakMap<Group, Map<string, BoneAxes>>();

/** Per-bone swing/sway axes, computed once from the template at rest. */
export function boneAxes(template: Group): Map<string, BoneAxes> {
  let axes = axesCache.get(template);
  if (axes) return axes;
  axes = new Map();
  template.updateMatrixWorld(true);
  const rootInv = new Quaternion();
  template.getWorldQuaternion(rootInv).invert();
  const boneWorld = new Quaternion();
  template.traverse((o) => {
    if (!(o as Bone).isBone) return;
    o.getWorldQuaternion(boneWorld);
    const relInv = rootInv.clone().multiply(boneWorld).invert();
    axes!.set(o.name, {
      x: new Vector3(1, 0, 0).applyQuaternion(relInv).normalize(),
      y: new Vector3(0, 1, 0).applyQuaternion(relInv).normalize(),
      z: new Vector3(0, 0, 1).applyQuaternion(relInv).normalize(),
    });
  });
  axesCache.set(template, axes);
  return axes;
}

const q = new Quaternion();

/** Machete chop on the right arm, u = 0..1 over the swing (raise, then slash down). */
export function applySwing(bones: Map<string, Bone>, axes: Map<string, BoneAxes>, u: number) {
  const arm = bones.get("ArmR1");
  const fore = bones.get("ArmR2");
  const a1 = axes.get("ArmR1")?.x;
  const a2 = axes.get("ArmR2")?.x;
  const up = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
  const angle = u < 0.3 ? -2.5 * up : -2.5 + 3.1 * ((u - 0.3) / 0.7);
  if (arm && a1) arm.quaternion.multiply(q.setFromAxisAngle(a1, angle));
  if (fore && a2) fore.quaternion.multiply(q.setFromAxisAngle(a2, -0.5 * up));
}

/** Run-cycle tuning (world speeds in m/s; bob in metres). */
const ANIM = { maxSpeed: 6, idleBob: 0.01, runBob: 0.055 };

/** Step frequency (rad/s of the walk cycle) at a given speed ratio: callers integrate it into a phase. */
export const walkFrequency = (speed: number) => 5 + Math.min(speed / ANIM.maxSpeed, 1) * 5;

/**
 * Pose bones (already reset to bind pose) for the current motion. `model` is
 * the scaled rig root whose y gets the step bob. `phase` is the walk cycle,
 * integrated by the caller (so speeding up never makes the legs flicker), and
 * the relaxed standing pose blends into the walk instead of snapping.
 */
export function animateRig(
  bones: Map<string, Bone>,
  axes: Map<string, BoneAxes>,
  model: Object3D,
  time: number,
  speed: number,
  grounded: boolean,
  phase: number,
) {
  const rot = (name: string, which: "x" | "y" | "z", angle: number) => {
    if (!angle) return;
    const bone = bones.get(name);
    const axis = axes.get(name)?.[which];
    if (bone && axis) bone.quaternion.multiply(q.setFromAxisAngle(axis, angle));
  };
  const swing = (name: string, a: number) => rot(name, "x", a);
  const sway = (name: string, a: number) => rot(name, "z", a);
  const ratio = Math.min(speed / ANIM.maxSpeed, 1);
  model.position.y = 0;

  if (!grounded) {
    // Airborne: tuck the legs, throw the arms up.
    swing("LegL1", -0.55);
    swing("LegL2", 0.75);
    swing("LegR1", 0.3);
    swing("LegR2", 0.2);
    swing("ArmL1", -2.1);
    swing("ArmR1", -2.1);
    swing("Spine1", -0.1);
    return;
  }

  // How much of the walk is showing: the standing pose fades out over the first bit of speed.
  const x = Math.min(1, Math.max(0, (ratio - 0.02) / 0.3));
  const w = x * x * (3 - 2 * x);
  const k = 1 - w;

  if (k > 0.001) {
    // Standing relaxed: feet a little apart, arms hanging loose with soft
    // elbows, breathing, a slow weight shift from foot to foot (the resting
    // knee bends), and now and then a look around.
    const breath = Math.sin(time * 1.6);
    const shift = Math.sin(time * 0.45);
    const look = Math.sin(time * 0.31) * Math.max(0, Math.sin(time * 0.17));
    sway("LegL1", k * (-0.09 + shift * 0.035));
    sway("LegR1", k * (0.09 + shift * 0.035));
    swing("LegL2", k * Math.max(0, -shift) * 0.16);
    swing("LegR2", k * Math.max(0, shift) * 0.16);
    swing("LegL1", k * Math.max(0, -shift) * -0.07);
    swing("LegR1", k * Math.max(0, shift) * -0.07);
    sway("Spine1", k * -shift * 0.045);
    swing("Spine1", k * (0.035 + breath * 0.018));
    swing("Spine2", k * (-0.02 - breath * 0.012));
    sway("ArmL1", k * (-0.17 - breath * 0.025 - shift * 0.03));
    sway("ArmR1", k * (0.17 + breath * 0.025 - shift * 0.03));
    swing("ArmL1", k * (-0.1 + breath * 0.02));
    swing("ArmR1", k * (-0.08 + breath * 0.02));
    swing("ArmL2", k * 0.32);
    swing("ArmR2", k * 0.28);
    rot("Neck1", "z", k * shift * 0.04);
    rot("Neck1", "y", k * look * 0.5);
    model.position.y = k * (breath * ANIM.idleBob - Math.abs(shift) * 0.012);
  }
  if (w < 0.001) return;

  // Walk/run: legs oppose, knees fold on the backswing, arms counter-swing
  // (with a little relaxed elbow), lean into the run, bob twice per cycle.
  const cycle = Math.sin(phase);
  const legAmp = 0.85 * ratio;
  const armAmp = 0.7 * ratio;
  swing("LegL1", cycle * legAmp);
  swing("LegR1", -cycle * legAmp);
  swing("LegL2", Math.max(0, -cycle) * 1.1 * ratio);
  swing("LegR2", Math.max(0, cycle) * 1.1 * ratio);
  swing("ArmL1", -cycle * armAmp);
  swing("ArmR1", cycle * armAmp);
  swing("ArmL2", w * 0.2 + Math.max(0, cycle) * 0.5 * ratio);
  swing("ArmR2", w * 0.2 + Math.max(0, -cycle) * 0.5 * ratio);
  sway("ArmL1", -0.06 * w);
  sway("ArmR1", 0.06 * w);
  swing("Spine1", -0.14 * ratio);
  model.position.y += w * Math.abs(Math.cos(phase)) * ANIM.runBob * ratio;
}
