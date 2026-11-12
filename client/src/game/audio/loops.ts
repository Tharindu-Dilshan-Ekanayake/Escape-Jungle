import { getAudio, onAudioReady } from "../audio";
import { CINEMA_AUDIO as C, SFX } from "../../config/audio";
import { noiseBurst, playSample, tone } from "./sfx";

/**
 * Footstep loop (recorded walking.mp3): started/stopped and re-pitched from
 * the controller as the player moves. Safe to call every frame.
 */
let step: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let stepBuffer: AudioBuffer | null = null;

let stepLoading = false;

/** Fetch + decode the footstep loop ONCE (it used to start a new download every frame until ready = a hitch when you first walked). */
function loadSteps() {
  const a = getAudio();
  if (!a || stepBuffer || stepLoading) return;
  stepLoading = true;
  void fetch("/sounds/walking.mp3")
    .then((r) => r.arrayBuffer())
    .then((b) => a.ctx.decodeAudioData(b))
    .then((ab) => (stepBuffer = ab))
    .catch(() => {
      stepLoading = false;
    });
}
// Preload as soon as audio is unlocked, so the first step never waits.
onAudioReady(loadSteps);

export function setFootsteps(moving: boolean, speedRatio: number) {
  const a = getAudio();
  if (!a) return;
  if (!moving) {
    if (step) {
      step.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
      const s = step.src;
      window.setTimeout(() => s.stop(), 200);
      step = null;
    }
    return;
  }
  if (!step) {
    if (!stepBuffer) {
      loadSteps();
      return;
    }
    const src = a.ctx.createBufferSource();
    src.buffer = stepBuffer;
    src.loop = true;
    const gain = a.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(SFX.footsteps, a.ctx.currentTime, 0.05);
    src.connect(gain).connect(a.sfx);
    src.start();
    step = { src, gain };
  }
  step.src.playbackRate.value = 0.75 + speedRatio * (SFX.footstepRate - 0.75);
}

/**
 * Plane engine for the intro: two detuned saws through a lowpass with a
 * propeller "wub". sputter() makes it cough and die; stop() cuts it.
 */
export function startEngine() {
  const a = getAudio();
  if (!a) return { sputter: () => {}, stop: () => {} };
  const out = a.ctx.createGain();
  out.gain.value = C.engine;
  out.connect(a.sfx);
  const lp = a.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  lp.connect(out);
  const oscs = [62, 64.5].map((f) => {
    const o = a.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.connect(lp);
    o.start();
    return o;
  });
  const wub = a.ctx.createOscillator();
  wub.frequency.value = 17;
  const wubDepth = a.ctx.createGain();
  wubDepth.gain.value = C.engine * 0.5;
  wub.connect(wubDepth).connect(out.gain);
  wub.start();
  const stop = () => {
    const t = a.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0, t, 0.08);
    window.setTimeout(() => {
      oscs.forEach((o) => o.stop());
      wub.stop();
      out.disconnect();
    }, 600);
  };
  const sputter = () => {
    const t = a.ctx.currentTime;
    for (let i = 0; i < 14; i++) {
      out.gain.setValueAtTime(i % 2 ? C.engine * 0.15 : C.engine * (1 - i / 16), t + i * 0.18);
    }
    oscs.forEach((o) => o.frequency.exponentialRampToValueAtTime(o.frequency.value * 0.6, t + 3));
    noiseBurst({ dur: 0.25, type: "lowpass", from: 1200, to: 300, volume: 0.25 });
  };
  return { sputter, stop };
}

/** Falling whistle during the dive. */
export function diveWhistle(seconds: number) {
  tone({ freq: 1100, to: 380, dur: seconds, volume: C.whistle, attack: 0.4 });
}

/** Far-away crash: a muffled boom and a long low rumble. */
export function distantBoom() {
  noiseBurst({ dur: 3.2, type: "lowpass", from: 900, to: 60, volume: C.crash * 0.55, attack: 0.04 });
  tone({ freq: 48, to: 24, dur: 3, volume: C.rumble * 0.8, attack: 0.08 });
  playSample("break", 0.55, 0.25, 0, 0.2);
}

/** Crash: wide noise blast + low rumble + a deep recorded crunch. */
export function crashBoom() {
  noiseBurst({ dur: 2.4, type: "lowpass", from: 4000, to: 120, volume: C.crash, attack: 0.005 });
  tone({ freq: 55, to: 28, dur: 2, volume: C.rumble, attack: 0.01 });
  playSample("break", 1, 0.45);
  playSample("break", 0.8, 0.6, 0, 0.12);
}
