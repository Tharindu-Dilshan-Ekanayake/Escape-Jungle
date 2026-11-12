import { getAudio, onAudioReady } from "../audio";
import { SFX } from "../../config/audio";

/**
 * Sound effects: real recordings (Kenney CC0, /public/sounds, ~21 KB) plus
 * short synthesized sounds (Web Audio). Every function is a no-op until the
 * first user gesture unlocks audio, and is safe to call from useFrame (it only
 * creates Web Audio nodes; no React or three.js objects).
 */
export type SampleName = "coin" | "jump" | "land" | "walking" | "break" | "equip";
const SAMPLE_NAMES: SampleName[] = ["coin", "jump", "land", "walking", "break", "equip"];
const buffers = new Map<SampleName, AudioBuffer>();
let noise: AudioBuffer | null = null;
let voices = 0;

onAudioReady(() => {
  const a = getAudio();
  if (!a) return;
  // 2 s of white noise, reused by every synthesized sound and ambience bed.
  noise = a.ctx.createBuffer(1, a.ctx.sampleRate * 2, a.ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const name of SAMPLE_NAMES) {
    fetch(`/sounds/${name}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((buf) => a.ctx.decodeAudioData(buf))
      .then((ab) => buffers.set(name, ab))
      .catch(() => {
        /* missing sample: that sound just stays silent */
      });
  }
});

export function getNoise() {
  return noise;
}

function voice(node: AudioScheduledSourceNode) {
  voices++;
  node.onended = () => {
    voices--;
  };
}

/** Play a recorded sample. rateJitter randomises pitch +- that fraction. */
export function playSample(name: SampleName, volume = 1, rate = 1, rateJitter = 0, delay = 0) {
  const a = getAudio();
  const buf = buffers.get(name);
  if (!a || !buf || voices >= SFX.maxVoices) return;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * rateJitter);
  const g = a.ctx.createGain();
  g.gain.value = volume;
  src.connect(g).connect(a.sfx);
  voice(src);
  src.start(a.ctx.currentTime + delay);
}

interface NoiseOpts {
  dur: number;
  type: BiquadFilterType;
  from: number;
  to: number;
  q?: number;
  volume: number;
  attack?: number;
  delay?: number;
}

/** Filtered noise burst with a frequency sweep (whoosh, rustle, crash). */
export function noiseBurst(o: NoiseOpts) {
  const a = getAudio();
  if (!a || !noise || voices >= SFX.maxVoices) return;
  const t = a.ctx.currentTime + (o.delay ?? 0);
  const src = a.ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = a.ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
  const g = a.ctx.createGain();
  const atk = o.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.volume, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g).connect(a.sfx);
  voice(src);
  src.start(t, Math.random() * 1.5);
  src.stop(t + o.dur + 0.05);
}

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  dur: number;
  volume: number;
  attack?: number;
  delay?: number;
}

/** Simple enveloped oscillator (UI, chimes, rumble). */
export function tone(o: ToneOpts) {
  const a = getAudio();
  if (!a || voices >= SFX.maxVoices) return;
  const t = a.ctx.currentTime + (o.delay ?? 0);
  const osc = a.ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.volume, t + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g).connect(a.sfx);
  voice(osc);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

// --- Game sounds -------------------------------------------------------------

export const sfx = {
  /** Blade whoosh at swing start. */
  swing: () => noiseBurst({ dur: 0.2, type: "bandpass", from: 500, to: 2600, q: 1.3, volume: SFX.swing, attack: 0.04 }),
  /** Grass cutter engine: a revving saw-tooth buzz and a high whine from the disc. */
  motor: () => {
    tone({ freq: 92, to: 150, type: "sawtooth", dur: 0.32, volume: SFX.motor, attack: 0.03 });
    noiseBurst({ dur: 0.28, type: "bandpass", from: 1900, to: 2700, q: 4, volume: SFX.motor * 0.7, attack: 0.03 });
  },
  /** Grass cut: crunchy recorded break + leafy rustle, louder for more cells. */
  cut: (cells: number) => {
    const k = Math.min(1, 0.45 + cells / 20);
    playSample("break", SFX.cut * k, 1.45, 0.12);
    noiseBurst({ dur: 0.16, type: "highpass", from: 1800, to: 4200, volume: SFX.rustle * k, attack: 0.005 });
    noiseBurst({ dur: 0.1, type: "bandpass", from: 3000, to: 1500, q: 2, volume: SFX.rustle * 0.6 * k, delay: 0.05 });
  },
  /** Bag full: dull denied buzz. */
  denied: () => tone({ freq: 160, to: 120, type: "sawtooth", dur: 0.2, volume: SFX.denied }),
  /** Grinder: motor rumble + several coin clinks (recorded). */
  sell: () => {
    tone({ freq: 70, to: 95, type: "sawtooth", dur: 0.7, volume: SFX.grinder, attack: 0.05 });
    noiseBurst({ dur: 0.7, type: "lowpass", from: 900, to: 300, volume: SFX.grinder, attack: 0.05 });
    for (let i = 0; i < 4; i++) playSample("coin", SFX.coin, 1, 0.12, 0.25 + i * 0.09);
  },
  equip: () => playSample("equip", SFX.equip),
  /** Upgrade bought: rising chime. */
  upgrade: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, volume: SFX.chime, delay: i * 0.07 })),
  /** Gate sinking open: low wooden rumble + creak. */
  gate: () => {
    noiseBurst({ dur: 1.4, type: "lowpass", from: 700, to: 160, volume: SFX.gate, attack: 0.05 });
    tone({ freq: 95, to: 55, type: "sawtooth", dur: 1.3, volume: SFX.gate * 0.5, attack: 0.05 });
    playSample("break", SFX.gate, 0.55);
  },
  /** Firewood picked up: woody knock. */
  woodPick: () => {
    playSample("land", SFX.wood, 1.5, 0.1);
    tone({ freq: 220, to: 160, type: "triangle", dur: 0.12, volume: SFX.wood * 0.25 });
  },
  /** Log dropped on the fire pit. */
  woodDrop: () => playSample("land", SFX.wood * 0.8, 1.2, 0.15),
  /** Treasure uncovered: soft sparkle. */
  reveal: () => [1568, 2093, 2637].forEach((f, i) => tone({ freq: f, dur: 0.18, volume: SFX.sparkle, delay: i * 0.05 })),
  /** Treasure collected: coin + bright arpeggio (longer for rare finds). */
  treasure: (rare: boolean) => {
    playSample("coin", SFX.coin, 1.1);
    const notes = rare ? [523, 659, 784, 1047, 1319, 1568] : [659, 784, 1047, 1319];
    notes.forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.25, volume: SFX.chime * 1.3, delay: 0.05 + i * 0.07 }));
  },
  /** Fire catches: whoosh + low thump. */
  ignite: () => {
    noiseBurst({ dur: 1.1, type: "bandpass", from: 300, to: 2400, q: 0.8, volume: SFX.fire, attack: 0.15 });
    tone({ freq: 90, to: 60, type: "sine", dur: 0.6, volume: SFX.fire * 0.8 });
  },
  /** One fire crackle pop (volume 0..1 by distance). */
  crackle: (v: number) => {
    if (v <= 0.02) return;
    noiseBurst({ dur: 0.03 + Math.random() * 0.05, type: "highpass", from: 2000 + Math.random() * 3000, to: 1200, volume: SFX.crackle * v, attack: 0.002 });
  },
  /** Distant creature growl (volume 0..1). */
  growl: (v: number) => {
    const dur = 1.2 + Math.random() * 0.8;
    tone({ freq: 70 + Math.random() * 25, to: 48, type: "sawtooth", dur, volume: SFX.growl * v, attack: 0.25 });
    noiseBurst({ dur, type: "lowpass", from: 380, to: 140, volume: SFX.growl * v * 0.9, attack: 0.3 });
  },
  /** Heartbeat (two low thumps). */
  heartbeat: (v: number) => {
    tone({ freq: 62, to: 40, type: "sine", dur: 0.16, volume: SFX.heartbeat * v });
    tone({ freq: 55, to: 38, type: "sine", dur: 0.18, volume: SFX.heartbeat * v * 0.75, delay: 0.2 });
  },
  /** Crunchy bites. */
  eat: () => {
    for (let i = 0; i < 3; i++) noiseBurst({ dur: 0.07, type: "bandpass", from: 1400, to: 700, q: 2, volume: SFX.eat, delay: i * 0.13 });
  },
  /** Gulp: falling filtered blips. */
  drink: () => {
    for (let i = 0; i < 2; i++) tone({ freq: 520 - i * 90, to: 260, type: "sine", dur: 0.12, volume: SFX.drink, delay: i * 0.16 });
    noiseBurst({ dur: 0.25, type: "lowpass", from: 900, to: 300, volume: SFX.drink * 0.4 });
  },
  /** Player hurt: low thump + grunt. */
  hurt: () => {
    tone({ freq: 140, to: 70, type: "sawtooth", dur: 0.22, volume: SFX.hurt });
    noiseBurst({ dur: 0.18, type: "lowpass", from: 700, to: 200, volume: SFX.hurt });
  },
  /** Machete hits an animal. */
  thud: () => {
    playSample("break", SFX.thud, 0.8, 0.1);
    tone({ freq: 110, to: 60, type: "sine", dur: 0.14, volume: SFX.thud * 0.7 });
  },
  /** Boar grunt (volume 0..1 by distance). */
  grunt: (v: number) => {
    for (let i = 0; i < 2; i++) {
      tone({ freq: 150 + Math.random() * 30, to: 90, type: "sawtooth", dur: 0.16, volume: SFX.grunt * v, delay: i * 0.2 });
      noiseBurst({ dur: 0.15, type: "bandpass", from: 500, to: 250, q: 1.5, volume: SFX.grunt * v * 0.8, delay: i * 0.2 });
    }
  },
  /** Jaguar roar / snarl (volume 0..1). */
  roar: (v: number) => {
    tone({ freq: 210, to: 85, type: "sawtooth", dur: 0.9, volume: SFX.roar * v, attack: 0.08 });
    noiseBurst({ dur: 0.9, type: "bandpass", from: 1200, to: 300, q: 1.2, volume: SFX.roar * v, attack: 0.08 });
  },
  /** Meat picked up. */
  pickupMeat: () => playSample("equip", SFX.equip * 0.6, 0.8),
  /** Sizzle while cooking (call repeatedly). */
  sizzle: () => noiseBurst({ dur: 0.35, type: "highpass", from: 3000, to: 5000, volume: SFX.sizzle, attack: 0.05 }),
  /** Frog singer: a croak pitched up the scale (i = how many found before). */
  croak: (i: number) => {
    const f = [262, 294, 330, 392, 440, 523][i % 6];
    tone({ freq: f * 0.5, to: f * 0.42, type: "square", dur: 0.12, volume: SFX.croak });
    tone({ freq: f, type: "triangle", dur: 0.35, volume: SFX.croak, delay: 0.14 });
  },
  /** The frog choir's little song. */
  melody: () =>
    [523, 659, 784, 659, 784, 1047, 988, 1047].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.22, volume: SFX.croak, delay: 0.4 + i * 0.18 })),
  /** Adventure complete: trumpet-ish fanfare + coins. */
  fanfare: () => {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: "sawtooth", dur: i === 7 ? 0.6 : 0.14, volume: SFX.fanfare, delay: [0, 0.12, 0.24, 0.36, 0.6, 0.78, 0.9, 1.05][i] }),
    );
    for (let i = 0; i < 5; i++) playSample("coin", SFX.coin * 0.8, 1.1, 0.1, 1.1 + i * 0.08);
  },
  /** Cheeky monkey giggle: quick rising/falling hoots. */
  monkey: () => {
    for (let i = 0; i < 4; i++) tone({ freq: 700 + (i % 2) * 300, to: 500 + (i % 2) * 400, type: "square", dur: 0.08, volume: SFX.monkey, delay: i * 0.09 });
  },
  /** Mushroom bounce: cartoon boing. */
  boing: () => {
    tone({ freq: 180, to: 620, type: "sine", dur: 0.28, volume: SFX.boing });
    tone({ freq: 360, to: 900, type: "triangle", dur: 0.2, volume: SFX.boing * 0.5, delay: 0.04 });
  },
  click: () => tone({ freq: 1250, to: 900, type: "triangle", dur: 0.05, volume: SFX.click }),
  jump: () => playSample("jump", SFX.jump, 1, 0.05),
  land: () => playSample("land", SFX.land, 1, 0.1),
};
