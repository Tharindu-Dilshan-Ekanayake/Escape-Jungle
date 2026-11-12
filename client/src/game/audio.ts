/**
 * Audio core. One AudioContext, created/resumed only on the first user gesture
 * (performance contract: audio unlocked on first tap). Two buses under master:
 * sfx (effects) and music (ambience beds), following Boxity's master_volume /
 * music_volume. Everything is muted during Boxity ad breaks.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let volume = 0.8;
let musicVolume = 0.8;
let muted = false;
const readyListeners = new Set<() => void>();

function applyGain() {
  if (!ctx || !master || !music) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : volume, t, 0.05);
  music.gain.setTargetAtTime(musicVolume, t, 0.05);
}

function unlock() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.connect(master);
    music = ctx.createGain();
    music.connect(master);
    master.gain.value = muted ? 0 : volume;
    music.gain.value = musicVolume;
    readyListeners.forEach((cb) => cb());
  }
  if (ctx.state === "suspended") void ctx.resume();
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
  window.removeEventListener("touchend", unlock);
}

export function installAudioUnlock() {
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchend", unlock);
}

/** Run `cb` once audio is unlocked (immediately if it already is). Returns unsubscribe. */
export function onAudioReady(cb: () => void) {
  if (ctx) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}

/** 0..100, as Boxity sends it. */
export function setMasterVolume(v: number) {
  volume = Math.max(0, Math.min(1, v / 100));
  applyGain();
}

/** 0..100: ambience beds. */
export function setMusicVolume(v: number) {
  musicVolume = Math.max(0, Math.min(1, v / 100));
  applyGain();
}

export function setMuted(m: boolean) {
  muted = m;
  applyGain();
}

/** The audio graph, or null until the first user gesture. */
export function getAudio() {
  return ctx && master && sfx && music ? { ctx, master, sfx, music } : null;
}
