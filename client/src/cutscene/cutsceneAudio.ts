import { INTRO } from "../config/cutscene";
import { distantBoom, startEngine } from "../game/audio/loops";
import { noiseBurst, tone } from "../game/audio/sfx";
import { SFX } from "../config/audio";

/**
 * Intro soundtrack on the cutscene timeline: engine drone -> sputter -> a
 * whoosh as each jumper leaves the door and a "fwump" as their canopy opens
 * -> the plane's engine fades away -> a distant boom on the horizon.
 * Returns stop() (Skip, natural end, unmount) which cancels pending cues.
 */
export function startIntroAudio(): () => void {
  const engine = startEngine();
  const timers: number[] = [];
  const at = (sec: number, fn: () => void) => timers.push(window.setTimeout(fn, sec * 1000));
  at(INTRO.engineFailAt, engine.sputter);
  for (const j of INTRO.jumpers) {
    at(j.exit, () => noiseBurst({ dur: 0.9, type: "bandpass", from: 400, to: 1800, q: 0.8, volume: SFX.swing * 1.4, attack: 0.05 }));
    at(j.exit + INTRO.freefallS, () => {
      noiseBurst({ dur: 0.25, type: "lowpass", from: 1400, to: 200, volume: SFX.swing * 1.6, attack: 0.005 });
      tone({ freq: 140, to: 70, type: "sine", dur: 0.18, volume: SFX.swing * 0.8 });
    });
  }
  // The engine drone leaves with the plane.
  at(INTRO.shots.follow + 0.5, () => engine.stop());
  at(INTRO.crashAt + 0.35, distantBoom);
  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    engine.stop();
  };
}
