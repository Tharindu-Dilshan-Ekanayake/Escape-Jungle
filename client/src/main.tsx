import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initBoxity } from "./platform/boxity";
import { installAudioUnlock } from "./game/audio";
import { startLobbyConnection } from "./net/lobbyConnection";
import { sfx } from "./game/audio/sfx";

// SDK init runs ONCE, before anything else touches the platform.
initBoxity();
installAudioUnlock();
// Join the lobby room right away (falls back to offline solo play).
startLobbyConnection();
// Soft click on every button press (audio unlocks on this same first gesture).
document.addEventListener("pointerdown", (e) => {
  if ((e.target as HTMLElement | null)?.closest?.("button")) sfx.click();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
