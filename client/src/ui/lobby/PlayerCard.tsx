import { usePlatformStore } from "../../store/platformStore";
import { useLobbyStore } from "../../store/lobbyStore";
import { usePortraitStore } from "../../store/portraitStore";
import { useUiStore } from "../../store/uiStore";

/**
 * Top-right name tag: your avatar's face in a gold ring, your name and a small
 * status line, with the Settings button beside it.
 */
export function PlayerCard() {
  const user = usePlatformStore((s) => s.user);
  // Signed in to Boxity -> your account; otherwise your Boxity guest name. No login buttons.
  const guest = usePlatformStore((s) => s.guest);
  const portrait = usePortraitStore((s) => s.url);
  const me = useLobbyStore((s) => s.players.find((p) => p.id === s.me));
  const status = useLobbyStore((s) => s.status);
  const name = user?.displayName || user?.username || guest?.displayName || guest?.username || me?.name || "Explorer";
  const img = portrait || user?.pfp || guest?.pfp || "";
  const dot = status === "online" ? "bg-[#7bdc4f]" : status === "connecting" ? "bg-[#ffd23f] animate-pulse" : "bg-[#ff6b5a]";
  const statusText = status === "online" ? "Online" : status === "connecting" ? "Connecting..." : "Solo play";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border-2 border-[#ffd23f]/80 bg-gradient-to-r from-[#2a3a2a]/90 to-[#3f5a2f]/90 py-1 pl-1 pr-4 shadow-lg">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-[3px] border-[#ffd23f] bg-gradient-to-b from-[#7fc4ff] to-[#3f8f4f] shadow-inner">
          {img ? (
            <img src={img} alt="" className="h-full w-full scale-110 object-cover" draggable={false} />
          ) : (
            <div className="grid h-full w-full place-items-center font-lobby text-2xl font-bold text-white">{name.slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="max-w-[38vw] truncate font-lobby text-outline text-lg font-bold text-white sm:max-w-[220px]">{name}</div>
          <div className="flex items-center gap-1.5 font-lobby text-xs font-semibold text-white/85">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {statusText}
            {!user && guest && <span className="text-white/60">· guest</span>}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => useUiStore.getState().openPanel("settings")}
        aria-label="Settings"
        className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-black/30 bg-[#2a3a2a]/85 text-2xl shadow-lg"
      >
        ⚙️
      </button>
    </div>
  );
}
