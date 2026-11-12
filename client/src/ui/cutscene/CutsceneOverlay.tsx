import { useEffect, useRef } from "react";
import { INTRO } from "../../config/cutscene";
import { endCutscene, useCutsceneStore } from "../../cutscene/cutsceneState";

const TICK_MS = 40;

/** Opacity of a fade/flash window at time t. */
function windowAlpha(t: number, at: number, inS: number, holdS: number, outS: number) {
  if (t < at) return 0;
  if (t < at + inS) return (t - at) / inS;
  if (t < at + inS + holdS) return 1;
  return Math.max(0, 1 - (t - at - inS - holdS) / outS);
}

/**
 * Letterbox overlay for the intro: black bars, "YOU ..." dialogue typed out,
 * impact flash, fade to black and back, and a Skip button (ENTER). Driven by
 * its own timer from the cutscene start time (no per-frame React renders).
 */
export function CutsceneOverlay() {
  const playing = useCutsceneStore((s) => s.playing);
  const start = useCutsceneStore((s) => s.start);
  const text = useRef<HTMLSpanElement>(null);
  const who = useRef<HTMLSpanElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const fade = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === INTRO.skipKey) {
        e.preventDefault();
        endCutscene();
      }
    };
    window.addEventListener("keydown", onKey);
    let lastShown = "";
    let lastWho = "";
    const id = window.setInterval(() => {
      const t = performance.now() / 1000 - start;
      let line = "";
      let lineAt = 0;
      let speaker = "YOU";
      for (const l of INTRO.lines) {
        if (t >= l.at) {
          line = l.text;
          lineAt = l.at;
          speaker = l.who;
        }
      }
      if (who.current && speaker !== lastWho) {
        who.current.textContent = speaker === "RUSTY" ? "CAPT. RUSTY" : speaker;
        who.current.style.color = speaker === "RUSTY" ? "#7fc8ff" : "#ffd23f";
        lastWho = speaker;
      }
      const shown = line.slice(0, Math.max(0, Math.floor((t - lineAt) * INTRO.cps)));
      if (text.current && shown !== lastShown) {
        text.current.textContent = shown;
        lastShown = shown;
      }
      const f = INTRO.flash;
      if (flash.current) flash.current.style.opacity = String(windowAlpha(t, f.at, f.inS, 0, f.outS) * f.max);
      const fo = INTRO.fadeOut;
      const fi = INTRO.fadeIn;
      let black = t >= fo.at ? Math.min(1, (t - fo.at) / fo.durationS) : 0;
      if (t >= fi.at) black = Math.max(0, 1 - (t - fi.at) / fi.durationS);
      if (fade.current) fade.current.style.opacity = String(black);
      if (bars.current) bars.current.style.setProperty("--bar", `${Math.min(1, t / 0.6) * 11}vh`);
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [playing, start]);

  if (!playing) return null;

  return (
    <div ref={bars} className="fixed inset-0 z-50 select-none" style={{ ["--bar" as string]: "0vh" }}>
      <div ref={flash} className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 0 }} />
      <div ref={fade} className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 0 }} />
      <div className="absolute inset-x-0 top-0 bg-black" style={{ height: "var(--bar)" }} />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black px-4" style={{ height: "var(--bar)" }}>
        <p className="max-w-[80vw] text-center font-typewriter text-xl text-white sm:text-3xl">
          <span ref={who} className="mr-3 text-[#ffd23f]">YOU</span>
          <span ref={text} />
        </p>
      </div>
      <button
        type="button"
        onClick={endCutscene}
        className="absolute bottom-[calc(var(--bar)+12px)] right-5 flex items-center gap-2 rounded-2xl border-4 border-white/80 bg-white/90 px-5 py-2 font-typewriter text-2xl text-black shadow-lg hover:bg-white"
      >
        <span className="rounded bg-black px-1.5 py-0.5 text-xs text-white">ENTER</span>
        Skip ▶
      </button>
    </div>
  );
}
