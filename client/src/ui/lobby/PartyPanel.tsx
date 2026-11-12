import { useEffect, useState } from "react";
import { CHAPTERS, LOBBY_LAYOUT, LOBBY_RULES, chapterUnlocked } from "@shared";
import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { useGameStore } from "../../store/gameStore";
import { sendPadChapter } from "../../net/lobbyConnection";
import { player } from "../../game/player/FirstPersonController";
import { ChapterArt } from "./ChapterArt";

/** Card captions (names and which maps are built come from the shared CHAPTERS list). */
const TAGS: Record<number, string> = {
  1: "Tall grass · 6 areas · find the plane",
  2: "Bamboo · fog · rope bridges",
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
 * Panel while standing on an expedition pad. Every pad has a fixed crew size
 * (1-4); once it is full the countdown runs by itself and the crew leaves for
 * the jungle. The first one on the pad picks the map (only maps everyone has
 * unlocked: you unlock a map by escaping the one before it). Offline: a solo
 * run after the same countdown.
 */
export function PartyPanel() {
  const status = useLobbyStore((s) => s.status);
  const me = useLobbyStore((s) => s.me);
  const padIndex = useLobbyStore(myPadIndex);
  const pad = useLobbyStore((s) => s.pads.find((p) => p.index === padIndex));
  const players = useLobbyStore((s) => s.players);
  const online = status === "online";
  const size = online ? (pad?.maxPlayers ?? LOBBY_LAYOUT.pads[padIndex]?.size ?? 1) : 1;
  const members = online ? (pad?.members ?? []) : [me];
  const isHost = !online || pad?.host === me;
  const myBest = players.find((p) => p.id === me)?.best ?? 0;
  const bestOf = (id: string) => players.find((p) => p.id === id)?.best ?? 0;

  // Offline there is no server: count down locally, then a solo run.
  const [localChapter, setLocalChapter] = useState(1);
  const [localLeft, setLocalLeft] = useState<number>(LOBBY_RULES.fullCountdown);
  useEffect(() => {
    if (online || padIndex < 0) return;
    setLocalLeft(LOBBY_RULES.fullCountdown);
    const id = window.setInterval(() => setLocalLeft((n) => n - 1), 1000);
    return () => window.clearInterval(id);
  }, [online, padIndex]);
  const chapter = online ? (pad?.chapter ?? 1) : localChapter;
  useEffect(() => {
    if (!online && padIndex >= 0 && localLeft <= 0) {
      useGameStore.getState().enterRun({ runId: `solo-${Date.now()}`, chapter, members: ["You"], solo: true });
    }
  }, [online, padIndex, localLeft, chapter]);

  const countdown = online ? (pad?.countdown ?? -1) : Math.max(0, localLeft);
  const counting = countdown >= 0;
  const missing = size - members.length;
  const pick = (n: number) => {
    if (!isHost) return;
    if (online) sendPadChapter(n);
    else setLocalChapter(n);
  };
  const leave = () => leavePad(padIndex);

  return (
    <div className="fixed inset-x-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center px-3 font-lobby">
      <div className={`relative w-[min(96vw,720px)] rounded-[28px] border-4 border-[#5a3418] ${wood} p-3 pt-10 shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:p-4 sm:pt-12`}>
        {/* Hanging title plank on two ropes. */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2">
          <div className="absolute -top-6 left-6 h-7 w-1 bg-[#d9c79a]" />
          <div className="absolute -top-6 right-6 h-7 w-1 bg-[#d9c79a]" />
          <div className={`whitespace-nowrap rounded-xl border-4 border-[#5a3418] ${wood} px-5 py-1.5 text-center text-2xl font-bold text-white shadow-lg sm:px-8 sm:text-4xl`}>
            <span className="mr-2">🌴</span>
            <span className="text-outline">JUNGLE EXPEDITION!</span>
            <span className="ml-2">🧭</span>
          </div>
        </div>
        <button type="button" onClick={leave} aria-label="Close" className="absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-[#e8503a] text-2xl font-bold text-white shadow-lg active:scale-95">
          ✕
        </button>
        <p className="text-outline mb-3 text-center text-base font-bold text-white sm:text-lg">
          {online ? (size === 1 ? "Solo pad" : `${size}-player pad`) : "Offline: solo run"} · {isHost ? "pick your jungle!" : "the first explorer picks the jungle"}
        </p>

        {/* Polaroid map cards. */}
        <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
          {CHAPTERS.map((c, i) => {
            const prev = CHAPTERS.find((x) => x.n === c.n - 1);
            // Online the map must be open for everyone on the pad; offline only chapter 1 (no saved unlocks).
            const open = online ? members.every((id) => chapterUnlocked(c.n, bestOf(id))) : c.n === 1;
            const mine = online ? chapterUnlocked(c.n, myBest) : c.n === 1;
            const can = open && c.playable && isHost;
            const picked = c.n === chapter;
            return (
              <button
                type="button"
                key={c.n}
                disabled={!can}
                onClick={() => pick(c.n)}
                className={`relative rounded-xl bg-[#fff8e6] p-1.5 pb-2 text-left shadow-md transition sm:p-2 ${picked ? "ring-4 ring-[#4cc12e]" : can ? "hover:-translate-y-0.5" : ""}`}
                style={{ transform: `rotate(${(i - 1) * 1.2}deg)` }}
              >
                <div className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] bg-[#f3e2a8]/80" />
                <div className={`relative aspect-[16/10] overflow-hidden rounded-md ${open && c.playable ? "" : "grayscale"}`}>
                  <ChapterArt n={c.n} />
                  {(!open || !c.playable) && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40 px-1 text-center text-white">
                      <div>
                        <div className="text-2xl sm:text-3xl">{!mine ? "🔒" : !c.playable ? "🚧" : "🔒"}</div>
                        <div className="text-outline text-[10px] font-bold sm:text-xs">
                          {!mine ? `Escape ${prev?.name ?? "the last map"} first` : !c.playable ? "Coming soon" : "Locked for your crew"}
                        </div>
                      </div>
                    </div>
                  )}
                  {picked && (
                    <div className="absolute right-1 top-1 rotate-[-10deg] rounded-md border-2 border-[#2f8a1f] bg-white/90 px-1.5 text-xs font-bold text-[#2f8a1f] sm:text-base">PICKED!</div>
                  )}
                </div>
                <div className="mt-1 text-center text-sm font-bold text-[#3a2a1a] sm:text-lg">{c.name}</div>
                <div className="hidden text-center text-[11px] text-[#6b5a44] sm:block">{TAGS[c.n]}</div>
              </button>
            );
          })}
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
                <div className="text-xs font-semibold">Leaving for the jungle...</div>
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
