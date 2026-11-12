import { LOBBY_LAYOUT, ROOM_LIMITS } from "@shared";
import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { quickJoin } from "../../net/lobbyConnection";
import { player } from "../../game/player/FirstPersonController";
import { PartyPanel } from "./PartyPanel";
import { PlayerCard } from "./PlayerCard";
import { DEVICE } from "../../store/device";

/** Nearest pad centre to the player (offline PLAY target). */
function nearestPad() {
  let best: { x: number; z: number } = LOBBY_LAYOUT.pads[0];
  let bestD = Infinity;
  for (const p of LOBBY_LAYOUT.pads) {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function PlayerList() {
  const players = useLobbyStore((s) => s.players);
  const me = useLobbyStore((s) => s.me);
  const status = useLobbyStore((s) => s.status);
  if (status !== "online") return null;
  return (
    <div className="w-44 overflow-hidden rounded-2xl border-2 border-black/30 bg-[#2a3a2a]/80 font-lobby text-white shadow-lg sm:w-56">
      <div className="flex items-center justify-between bg-black/25 px-3 py-1.5 text-lg font-bold">
        <span>Players</span>
        <span className="text-[#c8f56a]">
          {players.length}/{ROOM_LIMITS.lobbyMaxClients}
        </span>
      </div>
      <ul className="max-h-32 overflow-y-auto px-3 py-1 text-[15px] sm:max-h-56">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-0.5">
            <span className={`truncate font-semibold ${p.id === me ? "text-[#ffd23f]" : ""}`}>
              {p.name}
              {p.id === me ? " (you)" : ""}
            </span>
            <span className="shrink-0 text-xs text-white/70">
              {!p.connected ? "reconnecting" : p.zone === "lobby" ? "" : "in jungle"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lobby overlay: status + player list (top right), PLAY (bottom centre), party panel on a pad. */
export function LobbyHud() {
  const onPad = useLobbyStore((s) => myPadIndex(s) >= 0);
  return (
    <>
      <div className="pointer-events-auto fixed z-30 flex flex-col items-end gap-2" style={{ top: "max(12px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>
        <PlayerCard />
        <PlayerList />
      </div>
      {onPad ? (
        <PartyPanel />
      ) : (
        <div className="fixed left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2" style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <p className="max-w-[86vw] text-center font-lobby text-outline text-lg font-bold text-white sm:text-xl">Step on a glowing pad to start a run!</p>
          {!DEVICE.prefersTouchControls && (
            <p className="font-lobby text-outline text-sm font-semibold text-white/90">WASD move · Drag mouse to look · Scroll to zoom · Space jump</p>
          )}
          <button
            type="button"
            onClick={() => quickJoin(nearestPad())}
            className="rounded-full border-b-[6px] border-[#2f8a1f] bg-gradient-to-b from-[#8af04a] to-[#4cc12e] px-14 py-3 font-lobby text-outline text-4xl font-bold text-white shadow-xl transition-transform hover:scale-105 active:translate-y-1 active:border-b-2"
          >
            ▶ PLAY
          </button>
        </div>
      )}
    </>
  );
}
