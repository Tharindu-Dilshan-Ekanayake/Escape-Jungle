import { myPadIndex, useLobbyStore } from "../../store/lobbyStore";
import { PartyPanel } from "./PartyPanel";
import { PlayerCard } from "./PlayerCard";


/** Lobby overlay: your name card (top right), a hint (bottom centre), the expedition panel on a pad. */
export function LobbyHud() {
  const onPad = useLobbyStore((s) => myPadIndex(s) >= 0);
  return (
    <>
      <div className="pointer-events-auto fixed z-30 flex flex-col items-end gap-2" style={{ top: "max(12px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>
        <PlayerCard />
      </div>
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
