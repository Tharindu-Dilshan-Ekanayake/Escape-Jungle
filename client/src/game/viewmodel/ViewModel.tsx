import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Group, HemisphereLight, Mesh, MeshLambertMaterial, PerspectiveCamera, PointLight, Scene, Vector3 } from "three";
import { avatarBase, loadArmGeometry, materialFor, skinTextureUrl } from "../avatar/boxity/avatarAssets";
import { onLocalLook } from "../../net/localLook";
import { buildToolRig } from "./toolModels";
import { adaptiveFov } from "../fov";
import { SwingTrail } from "./SwingTrail";
import { economy, type ToolKey } from "../economy/economy";
import { VIEWMODEL as VM } from "../../config/viewmodel";
import { LIGHTING } from "../../config/render";
import { LIGHT_KEYS, VIEWMODEL_MIN_LIGHT } from "../../config/night";
import { cutState } from "../cutting/cutState";
import { player } from "../player/FirstPersonController";
import { cutscene } from "../../cutscene/cutsceneState";
import { dayNight } from "../time/dayNight";
import { campfireGlow } from "../campfire/campfires";
import { useQualityStore } from "../../store/qualityStore";
import { escape } from "../escape/escape";

const smooth = (t: number) => t * t * (3 - 2 * t);
const pose = { x: 0, y: 0, rx: 0, ry: 0, rz: 0 };
const tmpInner = new Vector3();
const tmpTip = new Vector3();

// Dev only: tweak the pose live from the console / automated checks.
if (import.meta.env.DEV) Object.assign(window, { __vmConfig: VM });

/** Interpolate the swing keyframes at u into `pose` (no allocations). */
function samplePose(u: number) {
  const k = VM.keys;
  let i = 0;
  while (i < k.length - 2 && u > k[i + 1].u) i++;
  const a = k[i];
  const b = k[i + 1];
  const t = smooth(Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u))));
  pose.x = a.x + (b.x - a.x) * t;
  pose.y = a.y + (b.y - a.y) * t;
  pose.rx = a.rx + (b.rx - a.rx) * t;
  pose.ry = a.ry + (b.ry - a.ry) * t;
  pose.rz = a.rz + (b.rz - a.rz) * t;
}

/**
 * Hand + tool viewmodel in its own scene + camera, drawn after the world with
 * the depth buffer cleared, so it never clips into grass. This component owns
 * the render loop (useFrame priority 1): world render, then viewmodel render.
 * Lighting follows the day/night cycle (never fully dark) plus campfire warmth.
 */
export function ViewModel() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const trailOn = useQualityStore((s) => s.preset.particleCap > 0);

  const vm = useMemo(() => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(VM.fov, 1, 0.01, 10);
    const hemi = new HemisphereLight(LIGHTING.hemiSky, LIGHTING.hemiGround, LIGHTING.hemiIntensity);
    const sun = new DirectionalLight(LIGHTING.sun, LIGHTING.sunIntensity);
    sun.position.set(0.5, 1, 0.6);
    // Warm fill from below-right when standing near a lit campfire (intensity 0 otherwise).
    const fire = new PointLight("#ff9a3c", 0, 3, 1);
    fire.position.set(0.6, -0.8, -0.3);
    scene.add(hemi, sun, fire);
    const rig = buildToolRig();
    const pivot = new Group();
    for (const key of Object.keys(rig.tools) as ToolKey[]) pivot.add(rig.tools[key]);
    pivot.add(rig.hand);
    scene.add(pivot);
    const trail = new SwingTrail();
    scene.add(trail.mesh);
    return { scene, camera, hemi, sun, fire, pivot, rig, trail, bob: 0, equipT: 1, tool: "" as string, time: 0 };
  }, []);

  // The player's own Boxity arm (their skin + shirt texture) instead of the drawn hand.
  useEffect(() => {
    let alive = true;
    let arm: Mesh | null = null;
    let offLook = () => {};
    loadArmGeometry()
      .then((geo) => {
        if (!alive) return;
        const a = VM.arm;
        arm = new Mesh(geo, new MeshLambertMaterial({ color: a.fallbackColor }));
        // Hand end wraps the grip; the arm runs down and back toward the camera.
        const d = new Vector3(...a.dir).normalize();
        arm.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d);
        arm.rotateY(a.twist);
        arm.scale.set(a.thickness, a.length, a.thickness);
        arm.position.copy(d).multiplyScalar(-a.overhang).add(new Vector3(...a.offset));
        vm.pivot.add(arm);
        vm.rig.hand.visible = false;
        offLook = onLocalLook((l) => {
          const fallback = avatarBase() + "/skins/0.png";
          void materialFor(l.skinUrl ?? skinTextureUrl(l.look), false)
            .catch(() => materialFor(fallback, false))
            .then((m) => {
              if (alive && arm) arm.material = m;
            });
        });
      })
      .catch(() => {
        /* avatar CDN unreachable: keep the drawn hand */
      });
    return () => {
      alive = false;
      offLook();
      if (arm) {
        vm.pivot.remove(arm);
        vm.rig.hand.visible = true;
      }
    };
  }, [vm]);

  useEffect(() => {
    vm.camera.aspect = size.width / Math.max(1, size.height);
    // Portrait: wider FOV so the hand + machete don't fill the whole screen.
    vm.camera.fov = adaptiveFov(VM.fov, vm.camera.aspect);
    vm.camera.updateProjectionMatrix();
  }, [vm, size]);

  useEffect(
    () => () => {
      vm.rig.dispose();
      vm.trail.dispose();
      gl.autoClear = true;
    },
    [vm, gl],
  );

  useFrame((state, dt) => {
    vm.time += dt;
    // Show the owned tool; re-equip animation when it changes.
    if (vm.tool !== economy.tool) {
      if (vm.tool) vm.equipT = 0;
      vm.tool = economy.tool;
      for (const key in vm.rig.tools) vm.rig.tools[key as ToolKey].visible = key === economy.tool;
    }
    vm.equipT = Math.min(1, vm.equipT + dt / VM.equipTime);
    const hold = VM.hold[vm.tool] ?? VM.hold.machete;

    // Match the world lighting, but keep the hands readable at night.
    const L = dayNight.light;
    const dayHemi = LIGHT_KEYS.day.hemi;
    const daySun = LIGHT_KEYS.day.sunI;
    vm.hemi.color.copy(L.hemiSky);
    vm.hemi.groundColor.copy(L.hemiGround);
    vm.hemi.intensity = Math.max(L.hemi, dayHemi * VIEWMODEL_MIN_LIGHT);
    vm.sun.color.copy(L.sun);
    vm.sun.intensity = Math.max(L.sunI, daySun * VIEWMODEL_MIN_LIGHT);
    vm.fire.intensity = campfireGlow.amount * VM.fireFill;

    // Animate: swing keys + walk bob + idle breathing + equip raise.
    const swinging = cutState.swingT >= 0;
    const u = swinging ? cutState.swingT / cutState.swingDuration : 0;
    samplePose(Math.min(1, u));
    // The machine: disc spins up while cutting, engine shake.
    const disc = vm.rig.spinners[vm.tool as ToolKey];
    const shake = disc ? Math.sin(vm.time * 95) * VM.spinner.shake * (swinging ? 1.6 : 0.6) : 0;
    if (disc) disc.rotation.y += dt * (swinging ? VM.spinner.cutting : VM.spinner.idle);
    const speed = Math.hypot(player.vx, player.vz);
    vm.bob += dt * speed * VM.bob.freq;
    const walk = Math.min(1, speed / 4);
    const idle = (1 - walk) * Math.sin(vm.time * VM.idle.freq);
    const e = 1 - smooth(vm.equipT);
    const r = VM.rest;
    const k = hold.swing;
    vm.pivot.position.set(
      r.x + hold.x + pose.x * k + Math.sin(vm.bob) * VM.bob.amountX * walk + shake,
      r.y + hold.y + pose.y * k + Math.abs(Math.cos(vm.bob)) * VM.bob.amountY * walk + idle * VM.idle.amount - e * VM.equipDrop + shake,
      r.z + hold.z,
    );
    vm.pivot.rotation.set(r.rx + hold.rx + pose.rx * k + e * 0.8, r.ry + pose.ry * k, r.rz + pose.rz * k + idle * VM.idle.amount * 2);

    const trail = vm.rig.trails[vm.tool as ToolKey];
    if (trailOn && trail) {
      vm.pivot.updateMatrixWorld();
      tmpInner.copy(trail[0]).applyMatrix4(vm.pivot.matrixWorld);
      tmpTip.copy(trail[1]).applyMatrix4(vm.pivot.matrixWorld);
      vm.trail.update(tmpInner, tmpTip, swinging && u > VM.trail.from && u < VM.trail.to);
    } else vm.trail.reset();

    // Render: world, then viewmodel on a cleared depth buffer.
    gl.autoClear = true;
    gl.render(state.scene, state.camera);
    if (cutscene.active || escape.active) return; // no hands in the cinematics
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(vm.scene, vm.camera);
  }, 1);

  return null;
}
