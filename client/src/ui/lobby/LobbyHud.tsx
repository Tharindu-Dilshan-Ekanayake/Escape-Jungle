import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { PartyPanel } from "./PartyPanel";
import { PlayerCard } from "./PlayerCard";
import { useEffect, useState } from "react";
import { CHAPTERS, LOBBY_LAYOUT, chapterPlayable, chapterUnlocked, padAt } from "@shared";
import { player } from "../../game/player/FirstPersonController";

/** Standing on a pad you cannot join: which map it is and how to open it. */
function LockedPadHint() {
  const [at, setAt] = useState(-1);
  useEffect(() => {
    const id = window.setInterval(() => setAt(padAt(player.x, player.z)), 250);
    return () => window.clearInterval(id);
  }, []);
  const me = useLobbyStore((s) => s.me);
  const online = useLobbyStore((s) => s.status === "online");
  const best = useLobbyStore((s) => s.players.find((p) => p.id === me)?.best ?? 0);
  if (at < 0) return null;
  const chapter = LOBBY_LAYOUT.pads[at].chapter;
  const name = CHAPTERS.find((c) => c.n === chapter)?.name ?? "";
  const prev = CHAPTERS.find((c) => c.n === chapter - 1)?.name ?? "";
  const text = !chapterPlayable(chapter)
    ? `🚧 ${name} is coming soon`
    : (online ? !chapterUnlocked(chapter, best) : chapter !== 1)
      ? `🔒 Escape ${prev} to open ${name}`
      : "";
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[38%] z-30 w-max max-w-[88vw] -translate-x-1/2 rounded-2xl border-2 border-[#ffd23f] bg-black/70 px-4 py-2 text-center font-lobby text-base font-bold text-white shadow-lg">
      {text}
    </div>
  );
}


/** Lobby overlay: your name card (top right), a hint (bottom centre), the expedition panel on a pad. */
export function LobbyHud() {
  const onPad = useLobbyStore((s) => myPadIndex(s) >= 0);
  return (
    <>
      <div className="pointer-events-auto fixed z-30 flex flex-col items-end gap-2" style={{ top: "max(12px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>
        <PlayerCard />
      </div>
      {!onPad && <LockedPadHint />}
      {onPad ? (
        <PartyPanel />
      ) : (
        <div className="fixed left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2" style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <p className="pointer-events-none max-w-[80vw] rounded-full bg-black/35 px-4 py-1 text-center font-lobby text-outline text-sm font-bold text-white sm:text-base">
            🌴 Walk onto a glowing pad to play
          </p>
        </div>
      )}
    </>
  );
}
