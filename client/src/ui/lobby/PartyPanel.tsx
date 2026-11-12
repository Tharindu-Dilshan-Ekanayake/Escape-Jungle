import { useEffect, useState } from "react";
import { CHAPTERS, LOBBY_LAYOUT, LOBBY_RULES } from "@shared";
import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { useGameStore } from "../../store/gameStore";
import { player } from "../../game/player/FirstPersonController";
import { ChapterArt } from "./ChapterArt";

/** Card captions (names and which maps are built come from the shared CHAPTERS list). */
export const CHAPTER_TAGS: Record<number, string> = {
  1: "Tall grass · 6 areas · find the plane",
  2: "Fog · bamboo · rope bridges · tougher plants",
  3: "Water · ruins · traps",
};

const wood = "bg-[linear-gradient(180deg,#b9824a,#8a5a34)]";
const plaque = "rounded-xl border-4 border-[#5a3418] bg-[#fff4d6] p-2 text-[#3a2a1a]";

/** Step off the pad (back toward the plaza): the server sees you leave the crew. */
function leavePad(padIndex: number) {
  const p = LOBBY_LAYOUT.pads[padIndex];
  if (!p) return;
  Object.assign(player, { x: p.x, z: p.z + LOBBY_LAYOUT.padSize / 2 + 1.6, vx: 0, vz: 0, facing: 0 });
}

/**
 * Panel while standing on an expedition pad. Each lobby area plays one map;
 * every pad has a fixed crew size (1-4). Once the pad is full the countdown
 * runs by itself and the crew leaves for that map. Offline: a solo run after
 * the same countdown.
 */
export function PartyPanel() {
  const status = useLobbyStore((s) => s.status);
  const me = useLobbyStore((s) => s.me);
  const padIndex = useLobbyStore(myPadIndex);
  const pad = useLobbyStore((s) => s.pads.find((p) => p.index === padIndex));
  const players = useLobbyStore((s) => s.players);
  const online = status === "online";
  const spot = LOBBY_LAYOUT.pads[padIndex];
  const size = online ? (pad?.maxPlayers ?? spot?.size ?? 1) : 1;
  // A solo pad is per player: other players standing on it are not in my crew.
  const members = online ? (size === 1 ? [me] : (pad?.members ?? [])) : [me];
  const chapter = spot?.chapter ?? 1;
  const map = CHAPTERS.find((c) => c.n === chapter);

  // Offline there is no server: count down locally, then a solo run.
  const [localLeft, setLocalLeft] = useState<number>(LOBBY_RULES.fullCountdown);
  useEffect(() => {
    if (online || padIndex < 0) return;
    setLocalLeft(LOBBY_RULES.fullCountdown);
    const id = window.setInterval(() => setLocalLeft((n) => n - 1), 1000);
    return () => window.clearInterval(id);
  }, [online, padIndex]);
  useEffect(() => {
    if (!online && padIndex >= 0 && localLeft <= 0) {
      useGameStore.getState().enterRun({ runId: `solo-${Date.now()}`, chapter, members: ["You"], solo: true });
    }
  }, [online, padIndex, localLeft, chapter]);

  const myWait = players.find((p) => p.id === me)?.wait ?? -1;
  const countdown = online ? (size === 1 ? myWait : (pad?.countdown ?? -1)) : Math.max(0, localLeft);
  const counting = countdown >= 0;
  const missing = size - members.length;
  const leave = () => leavePad(padIndex);

  return (
    <div className="fixed inset-x-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center px-3 font-lobby">
      <div className={`relative w-[min(94vw,560px)] rounded-[28px] border-4 border-[#5a3418] ${wood} p-3 pt-10 shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:p-4 sm:pt-12`}>
        {/* Hanging title plank on two ropes. */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2">
          <div className="absolute -top-6 left-6 h-7 w-1 bg-[#d9c79a]" />
          <div className="absolute -top-6 right-6 h-7 w-1 bg-[#d9c79a]" />
          <div className={`whitespace-nowrap rounded-xl border-4 border-[#5a3418] ${wood} px-5 py-1.5 text-center text-xl font-bold text-white shadow-lg sm:px-8 sm:text-3xl`}>
            <span className="text-outline">MAP {chapter}: {map?.name.toUpperCase()}</span>
          </div>
        </div>
        <button type="button" onClick={leave} aria-label="Close" className="absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-[#e8503a] text-2xl font-bold text-white shadow-lg active:scale-95">
          ✕
        </button>

        {/* This area's map. */}
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#fff8e6] p-2 shadow-md">
          <div className="aspect-[16/10] w-36 shrink-0 overflow-hidden rounded-md sm:w-44">
            <ChapterArt n={chapter} />
          </div>
          <div className="min-w-0 text-[#3a2a1a]">
            <div className="text-lg font-bold sm:text-xl">{map?.name}</div>
            <div className="text-xs text-[#6b5a44] sm:text-sm">{CHAPTER_TAGS[chapter]}</div>
            <div className="mt-1 text-xs font-semibold text-[#3a2a1a]">{online ? (size === 1 ? "Solo pad" : `${size}-player pad`) : "Offline: solo run"}</div>
          </div>
        </div>

        {/* Crew slots · countdown. */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr] sm:gap-3">
          <div className={plaque}>
            <div className="text-sm font-bold sm:text-base">
              CREW <span className="text-xs font-semibold">({members.length} of {size})</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {Array.from({ length: size }, (_, k) => {
                const id = members[k];
                const name = !online ? "You" : id ? (players.find((p) => p.id === id)?.name ?? "...") : null;
                return (
                  <span key={k} className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold sm:text-sm ${name ? "border-[#2f8a1f] bg-[#dff7cf] text-[#2a5a1a]" : "border-dashed border-[#b39a74] text-[#a08c6c]"}`}>
                    {name ? `${id === me || !online ? "⭐ " : ""}${name}` : "waiting..."}
                  </span>
                );
              })}
            </div>
          </div>
          <div className={`${plaque} flex flex-col items-center justify-center text-center ${counting ? "border-[#2f6a1f] bg-gradient-to-b from-[#c9f7a8] to-[#8ee05e]" : ""}`}>
            {counting ? (
              <>
                <div className="text-sm font-bold sm:text-base">GET READY!</div>
                <div className="text-outline text-4xl font-bold text-white sm:text-5xl">{countdown}</div>
                <div className="text-xs font-semibold">Leaving for {map?.name}...</div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold sm:text-base">WAITING FOR CREW</div>
                <div className="text-3xl font-bold">{missing > 0 ? `+${missing}` : "✓"}</div>
                <div className="text-xs font-semibold">{missing === 1 ? "1 more explorer" : `${missing} more explorers`} to step on</div>
              </>
            )}
          </div>
        </div>
      </div>
      <button type="button" onClick={leave} className="mt-4 rounded-2xl border-4 border-[#8a2a1a] bg-gradient-to-b from-[#ff7a5a] to-[#d63a2f] px-8 py-1.5 text-xl font-bold text-white shadow-lg active:translate-y-0.5">
        ← LEAVE
      </button>
    </div>
  );
}
