import { Euler, Quaternion, type Bone } from "three";
import { getBloxityEnv } from "../../../platform/env";

/**
 * Boxity emotes (docs/SDK.md > EMOTES) on the standard player.glb rig:
 * tracks map bone -> [[time, xDeg, yDeg, zDeg], ...] = DEGREE DELTAS over the
 * bind pose, euler XYZ right-multiplied onto the bind quaternion, smoothstep
 * between keys, clamped outside the key range, looping on time % len.
 */
export interface EmoteClip {
  len: number;
  loop: boolean;
  tracks: Record<string, number[][]>;
}

const catalog = new Map<string, EmoteClip>();
let loading: Promise<void> | null = null;

/** Fetch {apiUrl}/v1/avatar/emotes once at startup. Never throws. */
export function loadEmoteCatalog(): Promise<void> {
  loading ??= fetch(`${getBloxityEnv().apiUrl}/v1/avatar/emotes`)
    .then((r) => (r.ok ? r.json() : { emotes: [] }))
    .then((data: { emotes?: { id: string; clip?: EmoteClip }[] }) => {
      for (const e of data.emotes ?? []) if (e.clip?.tracks) catalog.set(e.id, e.clip);
    })
    .catch(() => {
      /* offline: emotes simply don't play */
    });
  return loading;
}

export function getEmote(id: string): EmoteClip | undefined {
  return catalog.get(id);
}

const DEG = Math.PI / 180;
const BLEND_IN = 0.1;
const euler = new Euler(0, 0, 0, "XYZ");
const delta = new Quaternion();
const identity = new Quaternion();
const out = [0, 0, 0];

/** Sample one bone track at time t (seconds) into `out` = [xDeg, yDeg, zDeg]. */
function sample(keys: number[][], t: number) {
  const first = keys[0];
  const last = keys[keys.length - 1];
  let a = first;
  let b = first;
  let s = 0;
  if (t >= last[0]) {
    a = b = last;
  } else if (t > first[0]) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    a = keys[i];
    b = keys[i + 1];
    const s0 = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    s = s0 * s0 * (3 - 2 * s0); // smoothstep
  }
  out[0] = a[1] + (b[1] - a[1]) * s;
  out[1] = a[2] + (b[2] - a[2]) * s;
  out[2] = a[3] + (b[3] - a[3]) * s;
}

/**
 * Apply an emote at `elapsed` seconds onto bones already reset to bind pose.
 * Returns false once a non-looping emote has finished.
 */
export function applyEmote(clip: EmoteClip, elapsed: number, bones: Map<string, Bone>, bind: Map<Bone, Quaternion>): boolean {
  if (!clip.loop && elapsed > clip.len) return false;
  const t = clip.loop ? elapsed % clip.len : Math.min(elapsed, clip.len);
  const weight = Math.min(1, elapsed / BLEND_IN);
  for (const name in clip.tracks) {
    const bone = bones.get(name);
    const keys = clip.tracks[name];
    if (!bone || !keys?.length) continue; // ignore unknown bones
    sample(keys, t);
    euler.set(out[0] * DEG, out[1] * DEG, out[2] * DEG, "XYZ");
    delta.setFromEuler(euler);
    if (weight < 1) delta.slerpQuaternions(identity, delta, weight);
    bone.quaternion.copy(bind.get(bone)!).multiply(delta);
  }
  return true;
}
