import { useEffect, useState } from "react";
import { TUTORIAL } from "../../config/tutorial";
import { stopTutorial, tutorial, tutorialHighlight } from "../../game/tutorial/tutorial";
import { formatCash } from "../../game/economy/economy";
import { useHud } from "../layout/hudLayout";

/** Re-render when the guide changes (polled; the guide state is mutable). */
export function useTutorialVersion() {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set(tutorial.version), 200);
    return () => window.clearInterval(id);
  }, []);
  return tutorial.version;
}

/** The highlight the guide wants right now ("" = none). */
export function useTutorialHighlight() {
  useTutorialVersion();
  return tutorialHighlight();
}

/** Gold pulsing ring + a bouncing pointer, for the button the guide points at. */
export const TUT_GLOW = "tut-glow";

/**
 * The guide card in the banner spot: "STEP 2 / 5", what to do, a hint, live
 * progress, the reward, and a skip link. A "+$1" pops when a step pays out.
 */
export function TutorialCard() {
  useTutorialVersion();
  const L = useHud((s) => s.banner);
  const touch = useHud((s) => s.touch);
  const step = TUTORIAL.steps[tutorial.step];
  const now = performance.now() / 1000;
  const popping = now - tutorial.reward.at < 2.2 && tutorial.reward.amount > 0;
  if (!tutorial.active || !step) return null;
  return (
    <div style={{ top: L.top, maxWidth: L.maxWidth }} className="fixed left-1/2 z-30 w-max -translate-x-1/2 font-lobby">
      <div className="flex items-center gap-3 rounded-2xl border-[3px] border-[#ffd23f] bg-[#1d140c]/80 px-3 py-2 text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <div className="rounded-xl bg-[#ffd23f] px-2 py-1 text-center leading-none text-[#3a2412]">
          <div className="text-[10px] font-bold">STEP</div>
          <div className="text-lg font-bold">
            {tutorial.step + 1}/{TUTORIAL.steps.length}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-outline text-lg font-bold leading-tight sm:text-xl">{step.title}</div>
          <div className="text-xs text-white/85 sm:text-sm">
            {touch ? (step.touchHint ?? step.hint) : step.hint}
            {tutorial.progress && <span className="ml-2 font-bold text-[#9be22d]">{tutorial.progress}</span>}
          </div>
        </div>
        {step.reward > 0 && <div className="rounded-full bg-[#4cc12e] px-2 py-0.5 text-sm font-bold">+{formatCash(step.reward)}</div>}
        <button type="button" onClick={() => stopTutorial(false)} className="pointer-events-auto ml-1 text-[11px] text-white/60 underline">
          skip guide
        </button>
      </div>
      <div className="mt-1 flex justify-center gap-1.5">
        {TUTORIAL.steps.map((s, i) => (
          <span key={s.id} className={`h-2 w-6 rounded-full ${i < tutorial.step ? "bg-[#4cc12e]" : i === tutorial.step ? "bg-[#ffd23f]" : "bg-white/30"}`} />
        ))}
      </div>
      {popping && <div key={tutorial.reward.at} className="sale-pop mt-1 text-center font-typewriter text-3xl text-[#5ee05e] text-outline">+{formatCash(tutorial.reward.amount)}</div>}
    </div>
  );
}
