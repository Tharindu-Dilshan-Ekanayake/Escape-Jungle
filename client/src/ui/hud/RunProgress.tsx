import { useEffect, useRef, useState } from "react";
import { HUD } from "../../config/hud";
import { formatTime, progress, runSeconds } from "../../game/progress/progress";
import { economy, formatCash } from "../../game/economy/economy";
import { runStats } from "../../game/cutting/cutState";
import { leaveRun } from "../../net/lobbyConnection";
import { hideScreen, reportScreen } from "../../platform/boxity";
import { pos, useHud } from "../layout/hudLayout";
import { ESCAPE } from "../../game/escape/escape";

/** Run timer (bottom-right, above UPGRADES). Updates its text directly, ~10x/s. */
export function RunTimer() {
  const el = useRef<HTMLDivElement>(null);
  const T = useHud((s) => s.timer);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (el.current) el.current.textContent = formatTime(runSeconds());
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      ref={el}
      className="pointer-events-none fixed z-30 font-typewriter text-outline text-white"
      style={{ ...pos(T), fontSize: T.font }}
    >
      00:00.0
    </div>
  );
}

/** "YOU ESCAPED!" results card once the player reaches the helicopter. */
export function RunComplete() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (progress.finished !== done) setDone(progress.finished);
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, [done]);

  const [left, setLeft] = useState(ESCAPE.autoReturnS);
  useEffect(() => {
    if (!done) return;
    setLeft(ESCAPE.autoReturnS);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const back = window.setTimeout(leaveRun, ESCAPE.autoReturnS * 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(back);
    };
  }, [done]);

  useEffect(() => {
    if (!done) return;
    if (document.pointerLockElement) document.exitPointerLock();
    reportScreen("results");
    return () => hideScreen();
  }, [done]);

  if (!done) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-[min(92vw,460px)] rounded-3xl border-4 border-[#5a3a1c] bg-[#8a5a34] p-2 shadow-2xl">
        <div className="rounded-2xl bg-[#fff4d6] p-6 text-center font-lobby text-[#3a2a1a]">
          <div className="text-5xl">🚁</div>
          <h2 className="mt-2 text-4xl font-bold text-[#2f8a1f]">YOU ESCAPED!</h2>
          <p className="mt-1 text-lg">You found the plane and the rescue helicopter flew you out of the jungle!</p>
          <div className="my-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-white/70 p-2">
              <div className="font-bold">Time</div>
              <div className="font-typewriter text-xl">{formatTime(progress.finishTime)}</div>
            </div>
            <div className="rounded-xl bg-white/70 p-2">
              <div className="font-bold">Plants cut</div>
              <div className="font-typewriter text-xl">{runStats.cellsCut.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/70 p-2">
              <div className="font-bold">Cash</div>
              <div className="font-typewriter text-xl text-[#2f8a1f]">{formatCash(economy.cash)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={leaveRun}
            className="rounded-2xl border-b-[6px] border-[#2f8a1f] bg-gradient-to-b from-[#8af04a] to-[#4cc12e] px-10 py-3 text-2xl font-bold text-white"
          >
            Back to the lobby
          </button>
          <p className="mt-2 text-sm text-[#6b5a44]">Flying back to the lobby in {left}s...</p>
        </div>
      </div>
    </div>
  );
}
