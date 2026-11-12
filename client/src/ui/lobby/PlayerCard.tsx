import { usePlatformStore } from "../../store/platformStore";
import { useLobbyStore } from "../../store/lobbyStore";
import { usePortraitStore } from "../../store/portraitStore";
import { useUiStore } from "../../store/uiStore";
import { useHud } from "../../ui/layout/hudLayout";

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
  // Phones (portrait or sideways): a small card.
  const small = useHud((s) => s.mode !== "desktop");
  const statusText = status === "online" ? "Online" : status === "connecting" ? "Connecting..." : "Solo play";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center rounded-full border-2 border-[#ffd23f]/80 bg-gradient-to-r from-[#2a3a2a]/90 to-[#3f5a2f]/90 shadow-lg ${small ? "gap-1.5 py-0.5 pl-0.5 pr-2.5" : "gap-2 py-1 pl-1 pr-4"}`}>
        <div className={`relative shrink-0 overflow-hidden rounded-full ${small ? "h-8 w-8 border-2" : "h-12 w-12 border-[3px]"} border-[#ffd23f] bg-gradient-to-b from-[#7fc4ff] to-[#3f8f4f] shadow-inner`}>
          {img ? (
            <img src={img} alt="" className="h-full w-full scale-110 object-cover" draggable={false} />
          ) : (
            <div className="grid h-full w-full place-items-center font-lobby text-2xl font-bold text-white">{name.slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div className="min-w-0 leading-tight">
          <div className={`truncate font-lobby text-outline font-bold text-white ${small ? "max-w-[30vw] text-sm" : "max-w-[38vw] text-lg sm:max-w-[220px]"}`}>{name}</div>
          <div className={`flex items-center gap-1 font-lobby font-semibold text-white/85 ${small ? "text-[10px]" : "gap-1.5 text-xs"}`}>
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
        className={`grid place-items-center border-2 border-black/30 bg-[#2a3a2a]/85 shadow-lg ${small ? "h-8 w-8 rounded-xl text-base" : "h-12 w-12 rounded-2xl text-2xl"}`}
      >
        ⚙️
      </button>
    </div>
  );
}
