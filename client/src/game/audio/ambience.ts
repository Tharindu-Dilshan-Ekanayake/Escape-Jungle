import { getAudio, onAudioReady } from "../audio";
import { AMBIENCE as A } from "../../config/audio";
import { getNoise } from "./sfx";

export type AmbienceKind = "jungle" | "lobby";

/** Night mix (0 = day, 1 = night) applied to the running jungle ambience. */
const night = { level: 0, sent: -1, crickets: null as GainNode | null, drone: null as GainNode | null, ctx: null as AudioContext | null };

/** Fade the night layers in/out (cheap to call every frame: only acts on real changes). */
export function setAmbienceNight(k: number) {
  night.level = k;
  if (!night.ctx || !night.crickets || !night.drone || Math.abs(k - night.sent) < 0.02) return;
  night.sent = k;
  const t = night.ctx.currentTime;
  night.crickets.gain.setTargetAtTime(k, t, 0.5);
  night.drone.gain.setTargetAtTime(k * k, t, 0.8);
}

/** A looping filtered-noise layer on the music bus. */
function noiseLayer(ctx: AudioContext, out: AudioNode, type: BiquadFilterType, freq: number, q: number, volume: number) {
  const noise = getNoise();
  if (!noise) return null;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(f).connect(g).connect(out);
  src.start(0, Math.random() * 1.5);
  return { src, gain: g, filter: f };
}

/** One bird call: 2-5 quick FM chirps. */
function birdCall(ctx: AudioContext, out: AudioNode, volume: number) {
  const base = 1800 + Math.random() * 2200;
  const notes = 2 + Math.floor(Math.random() * 4);
  let t = ctx.currentTime;
  for (let i = 0; i < notes; i++) {
    const dur = 0.06 + Math.random() * 0.09;
    const osc = ctx.createOscillator();
    const f0 = base * (0.85 + Math.random() * 0.4);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * (Math.random() > 0.5 ? 1.35 : 0.7), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + 0.03 + Math.random() * 0.08;
  }
}

/** Distant two-note hoot (jungle animal). */
function hoot(ctx: AudioContext, out: AudioNode, volume: number) {
  for (let i = 0; i < 2; i++) {
    const t = ctx.currentTime + i * 0.45;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(420 - i * 40, t);
    osc.frequency.exponentialRampToValueAtTime(360 - i * 40, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.42);
  }
}

/**
 * Synthesized ambience bed on the music bus: wind + insects + birds (+ distant
 * hoots in the jungle, fountain water in the lobby). Starts when audio is
 * unlocked; returns stop() which fades out and disconnects everything.
 */
export function startAmbience(kind: AmbienceKind): () => void {
  let stopped = false;
  let teardown = () => {};
  const offReady = onAudioReady(() => {
    // Noise buffer is created in the same unlock tick; defer one task to be safe.
    window.setTimeout(() => {
      const a = getAudio();
      if (!a || stopped) return;
      const bus = a.ctx.createGain();
      bus.gain.setValueAtTime(0.0001, a.ctx.currentTime);
      bus.gain.exponentialRampToValueAtTime(1, a.ctx.currentTime + A.fadeS);
      bus.connect(a.music);
      const layers = [
        noiseLayer(a.ctx, bus, "lowpass", 420, 0.5, A.wind),
        kind === "jungle" ? noiseLayer(a.ctx, bus, "bandpass", 4800, 9, A.insects) : null,
        kind === "lobby" ? noiseLayer(a.ctx, bus, "bandpass", 900, 0.7, A.water) : null,
      ].filter((l): l is NonNullable<typeof l> => l !== null);
      // Wind gusts + insect pulsing via slow/fast LFOs on the layer gains.
      const lfos: OscillatorNode[] = [];
      layers.forEach((l, i) => {
        const lfo = a.ctx.createOscillator();
        lfo.frequency.value = i === 1 && kind === "jungle" ? 22 : 0.08 + i * 0.05;
        const depth = a.ctx.createGain();
        depth.gain.value = l.gain.gain.value * 0.6;
        lfo.connect(depth).connect(l.gain.gain);
        lfo.start();
        lfos.push(lfo);
      });
      // Night: crickets + a low drone, each behind its own fader driven by setAmbienceNight.
      if (kind === "jungle") {
        night.ctx = a.ctx;
        night.crickets = a.ctx.createGain();
        night.drone = a.ctx.createGain();
        night.crickets.gain.value = 0;
        night.drone.gain.value = 0;
        night.crickets.connect(bus);
        night.drone.connect(bus);
        night.sent = -1;
        const cr = noiseLayer(a.ctx, night.crickets, "bandpass", 3600, 14, A.crickets);
        const dr = noiseLayer(a.ctx, night.drone, "lowpass", 110, 0.7, A.drone);
        if (cr) {
          const lfo = a.ctx.createOscillator();
          lfo.frequency.value = 28;
          const depth = a.ctx.createGain();
          depth.gain.value = A.crickets * 0.8;
          lfo.connect(depth).connect(cr.gain.gain);
          lfo.start();
          lfos.push(lfo);
          layers.push(cr);
        }
        if (dr) layers.push(dr);
        setAmbienceNight(night.level);
      }
      let timer = 0;
      const scheduleBird = () => {
        const [lo, hi] = A.birdGap;
        timer = window.setTimeout(() => {
          if (stopped) return;
          if (night.level < 0.5 || kind !== "jungle") birdCall(a.ctx, bus, A.bird * (1 - night.level));
          const hootP = night.level > 0.5 ? A.owlChance : A.hootChance;
          if (kind === "jungle" && Math.random() < hootP) hoot(a.ctx, bus, A.hoot);
          scheduleBird();
        }, (lo + Math.random() * (hi - lo)) * 1000);
      };
      scheduleBird();
      teardown = () => {
        window.clearTimeout(timer);
        const t = a.ctx.currentTime;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setTargetAtTime(0.0001, t, 0.3);
        window.setTimeout(() => {
          layers.forEach((l) => l.src.stop());
          lfos.forEach((o) => o.stop());
          bus.disconnect();
          if (kind === "jungle") {
            night.ctx = null;
            night.crickets = null;
            night.drone = null;
          }
        }, 1200);
      };
    }, 0);
  });
  return () => {
    stopped = true;
    offReady();
    teardown();
  };
}
