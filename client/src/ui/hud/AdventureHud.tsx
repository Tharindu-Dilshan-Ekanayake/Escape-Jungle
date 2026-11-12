import { useEffect, useState } from "react";
import { ADVENTURES } from "../../config/adventures";
import { adventures, advanceDialogue, butterflyTimeLeft, doneCount, ST } from "../../game/adventure/adventures";
import { formatCash } from "../../game/economy/economy";
import { DEVICE } from "../../store/device";
import { pos, useHud } from "../layout/hudLayout";

function useAdventureVersion(ms = 150) {
  const [, set] = useState(0);
  useEffect(() => {
    let last = -1;
    const id = window.setInterval(() => {
      // The butterfly countdown needs a steady tick while it runs.
      const ticking = adventures.list.some((a) => a.def.timeLimit && a.state === ST.Active);
      const v = adventures.version + (ticking ? Math.floor(performance.now() / 500) : 0);
      if (v !== last) {
        last = v;
        set(v);
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/** Active adventures with progress (top-left on desktop, under the clock on touch). */
export function AdventureTracker() {
  useAdventureVersion();
  const now = performance.now() / 1000;
  const T = useHud((s) => s.tracker);
  const list = adventures.list.filter((a) => a.state === ST.Active || a.state === ST.Ready);
  if (!list.length) return null;
  return (
    <div className="pointer-events-none fixed z-30 space-y-1.5" style={{ ...pos(T), width: T.width }}>
      <div className="font-lobby text-outline text-sm font-bold text-[#ffd23f]">
        ADVENTURES {doneCount()}/{ADVENTURES.length}
      </div>
      {list.map((a) => {
        const ready = a.state === ST.Ready;
        const timed = a.def.timeLimit && !ready;
        const left = timed ? Math.ceil(butterflyTimeLeft(a, now)) : 0;
        return (
          <div key={a.def.id} className={`rounded-xl border-2 px-2.5 py-1.5 font-lobby text-white shadow ${ready ? "border-[#5ee05e] bg-[#1f5a2a]/80" : "border-white/40 bg-black/55"}`}>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <span className="text-lg">{a.def.icon}</span>
              {a.def.title}
            </div>
            <div className="text-xs text-white/85">
              {ready
                ? `✔ Go back to ${a.def.npc.name}`
                : a.progress < 0
                  ? `⏰ Time's up! Talk to ${a.def.npc.name}`
                  : `${Math.max(0, a.progress)} / ${a.def.count}${timed ? ` · ⏱ ${left}s` : ""}`}
            </div>
            {!ready && a.progress >= 0 && !T.compact && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#ffd23f]" style={{ width: `${(a.progress / a.def.count) * 100}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Speech box at the bottom: name, line, "E / tap to continue". */
export function DialogueBox() {
  useAdventureVersion(100);
  const D = useHud((s) => s.dialogue);
  const d = adventures.dialogue;
  if (!d) return null;
  const last = d.index >= d.lines.length - 1;
  return (
    <button
      type="button"
      onClick={advanceDialogue}
      style={{ bottom: D.bottom, width: D.width }}
      className="fixed left-1/2 z-40 -translate-x-1/2 rounded-2xl border-4 border-[#5a3a1c] bg-[#fff4d6] p-3 text-left font-lobby text-[#3a2a1a] shadow-2xl"
    >
      <div className="mb-1 inline-block rounded-lg bg-[#8a5a34] px-2 py-0.5 text-sm font-bold text-white">{d.name}</div>
      <div key={d.index} className="dialogue-line text-lg font-semibold leading-snug">
        {d.lines[d.index]}
      </div>
      <div className="mt-1 text-right text-xs font-bold text-[#8a5a34]">
        <span className="mr-1 rounded bg-[#3a2a1a] px-1.5 text-white">E</span>
        {last ? "OK!" : "Next"}
      </div>
    </button>
  );
}

const CONFETTI = ["#ffd23f", "#ff6fae", "#5ee05e", "#4fc3f7", "#ff9a3c", "#c77dff"];

/** "ADVENTURE COMPLETE!" banner with CSS confetti (cheap on every device). */
export function AdventureCelebration() {
  useAdventureVersion(100);
  const c = adventures.celebrate;
  const now = performance.now() / 1000;
  if (!c || now - c.at > 4) return null;
  const n = DEVICE.isLowEnd ? 24 : 48;
  return (
    <div key={c.at} className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="confetti absolute top-[-20px] h-3 w-2 rounded-sm"
          style={{
            left: `${(i * 97) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i % 12) * 0.08}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
          }}
        />
      ))}
      <div className="find-pop absolute left-1/2 top-[120px] -translate-x-1/2 text-center">
        <div className="text-6xl drop-shadow-lg">{c.icon}</div>
        <div className="font-lobby text-outline text-4xl font-bold text-[#ffd23f]">ADVENTURE COMPLETE!</div>
        <div className="font-lobby text-outline text-2xl font-bold text-white">{c.title}</div>
        <div className="font-typewriter text-outline text-4xl text-[#5ee05e]">+{formatCash(c.reward)}</div>
      </div>
    </div>
  );
}
