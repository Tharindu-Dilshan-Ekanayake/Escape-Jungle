import { LOBBY_LAYOUT, LOBBY_RULES, ROOM_LIMITS } from "@shared";
import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { useGameStore } from "../../store/gameStore";
import { sendPadStart, sendPartySize } from "../../net/lobbyConnection";
import { player } from "../../game/player/FirstPersonController";
import { ChapterArt } from "./ChapterArt";

/** Our own chapters (chapter 1 playable; the next ones unlock as they are built). */
const CHAPTERS = [
  { n: 1, name: "The Overgrowth", tag: "Tall grass · 6 areas · find the plane" },
  { n: 2, name: "Misty Gorge", tag: "Bamboo · fog · rope bridges" },
  { n: 3, name: "Sunken Temple", tag: "Water · ruins · traps" },
];

const wood = "bg-[linear-gradient(180deg,#b9824a,#8a5a34)]";

/** Step off the pad (back toward the plaza): the server sees you leave the party. */
function leavePad(padIndex: number) {
  const p = LOBBY_LAYOUT.pads[padIndex];
  if (!p) return;
  Object.assign(player, { x: p.x, z: p.z + LOBBY_LAYOUT.padSize / 2 + 1.6, vx: 0, vz: 0, facing: 0 });
}

/**
 * Expedition start popup while standing on a pad: a wooden panel with a
 * hanging title plank, polaroid chapter cards, a crew stepper, a status box
 * and a big START button; X / LEAVE step you off the pad. Host picks the crew
 * size and starts; members wait; offline it starts a solo run.
 */
export function PartyPanel() {
  const status = useLobbyStore((s) => s.status);
  const me = useLobbyStore((s) => s.me);
  const padIndex = useLobbyStore(myPadIndex);
  const pad = useLobbyStore((s) => s.pads.find((p) => p.index === padIndex));
  const players = useLobbyStore((s) => s.players);
  const online = status === "online";
  const isHost = !online || pad?.host === me;
  const counting = online && pad !== undefined && pad.countdown >= 0;
  const aboard = online ? (pad?.members.length ?? 1) : 1;
  const crew = online ? (pad?.maxPlayers ?? 4) : 1;
  const names = (pad?.members ?? []).map((id) => players.find((p) => p.id === id)?.name ?? "...");
  const unlocked = (n: number) => (LOBBY_RULES.unlockedChapters as readonly number[]).includes(n);

  const startSolo = () => useGameStore.getState().enterRun({ runId: `solo-${Date.now()}`, chapter: 1, members: ["You"], solo: true });
  const setCrew = (n: number) => {
    if (!online || !isHost || counting || !pad) return;
    sendPartySize(Math.max(pad.members.length, Math.min(ROOM_LIMITS.partyMax, n)));
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
        <p className="text-outline mb-3 text-center text-base font-bold text-white sm:text-lg">Pick your jungle and gather your crew!</p>

        {/* Polaroid chapter cards. */}
        <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
          {CHAPTERS.map((c, i) => {
            const open = unlocked(c.n);
            const picked = c.n === 1;
            return (
              <div
                key={c.n}
                className={`relative rounded-xl bg-[#fff8e6] p-1.5 pb-2 shadow-md sm:p-2 ${picked ? "ring-4 ring-[#4cc12e]" : ""}`}
                style={{ transform: `rotate(${(i - 1) * 1.2}deg)` }}
              >
                <div className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] bg-[#f3e2a8]/80" />
                <div className={`relative aspect-[16/10] overflow-hidden rounded-md ${open ? "" : "grayscale"}`}>
                  <ChapterArt n={c.n} />
                  {!open && (
                    <div className="absolute inset-0 grid place-items-center bg-black/35 text-center text-white">
                      <div>
                        <div className="text-2xl sm:text-3xl">🔒</div>
                        <div className="text-outline text-[10px] font-bold sm:text-xs">Escape chapter {c.n - 1} first</div>
                      </div>
                    </div>
                  )}
                  {picked && (
                    <div className="absolute right-1 top-1 rotate-[-10deg] rounded-md border-2 border-[#2f8a1f] bg-white/90 px-1.5 text-xs font-bold text-[#2f8a1f] sm:text-base">PICKED!</div>
                  )}
                </div>
                <div className="mt-1 text-center text-sm font-bold text-[#3a2a1a] sm:text-lg">{c.name}</div>
                <div className="hidden text-center text-[11px] text-[#6b5a44] sm:block">{c.tag}</div>
              </div>
            );
          })}
        </div>

        {/* Crew stepper · status · start. */}
        <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_1.1fr_1.5fr] sm:gap-3">
          <div className="rounded-xl border-4 border-[#5a3418] bg-[#fff4d6] p-2 text-[#3a2a1a]">
            <div className="text-sm font-bold sm:text-base">
              CREW <span className="text-xs font-semibold">({aboard} aboard)</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setCrew(crew - 1)} disabled={!online || !isHost || counting || crew <= aboard} className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#5a3418] bg-[#f0dfb4] text-xl font-bold disabled:opacity-40">
                −
              </button>
              <span className="w-6 text-center text-3xl font-bold">{crew}</span>
              <button type="button" onClick={() => setCrew(crew + 1)} disabled={!online || !isHost || counting || crew >= ROOM_LIMITS.partyMax} className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#5a3418] bg-[#f0dfb4] text-xl font-bold disabled:opacity-40">
                +
              </button>
            </div>
          </div>
          <div className="rounded-xl border-4 border-[#5a3418] bg-[#fff4d6] p-2 text-[#3a2a1a]">
            <div className="text-sm font-bold sm:text-base">{online ? "YOUR CREW" : "SOLO RUN"}</div>
            <div className="truncate text-xs">{online ? names.join(", ") || "Just you" : "Play offline on your own"}</div>
            <div className="mt-1 text-xs font-semibold text-[#6b5a44]">
              {counting ? (
                <span className="text-sm font-bold text-[#e8533a]">Starting in {pad?.countdown}s...</span>
              ) : online ? (
                aboard < crew ? `Waiting for crew · ${aboard}/${crew}` : "Crew ready!"
              ) : (
                "Ready when you are"
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={counting || !isHost}
            onClick={online ? sendPadStart : startSolo}
            className="col-span-2 flex items-center justify-center gap-3 rounded-xl border-4 border-[#2f6a1f] bg-gradient-to-b from-[#8af04a] to-[#3fae22] px-4 py-2 text-white shadow-lg active:translate-y-0.5 disabled:from-[#bdbdbd] disabled:to-[#8f8f8f] disabled:border-[#6f6f6f] sm:col-span-1"
          >
            <span className="text-left leading-none">
              <span className="block text-sm font-bold sm:text-base">{counting ? "GET READY" : isHost ? "START THE" : "WAITING FOR"}</span>
              <span className="text-outline block text-2xl font-bold sm:text-3xl">{counting ? `${pad?.countdown}...` : isHost ? "EXPEDITION!" : "THE HOST"}</span>
            </span>
            {isHost && !counting && <span className="text-3xl font-bold sm:text-4xl">→</span>}
          </button>
        </div>
      </div>
      <button type="button" onClick={leave} className="mt-4 rounded-2xl border-4 border-[#8a2a1a] bg-gradient-to-b from-[#ff7a5a] to-[#d63a2f] px-8 py-1.5 text-xl font-bold text-white shadow-lg active:translate-y-0.5">
        ← LEAVE
      </button>
    </div>
  );
}
