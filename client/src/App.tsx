import { lazy, Suspense } from "react";
import { DebugOverlay, useDebugHotkey } from "./ui/DebugOverlay";
import { LoadingScreen } from "./ui/LoadingScreen";
import { PlayOverlay } from "./ui/PlayOverlay";

// three.js + R3F live in this lazy chunk so the first paint (loader) is tiny.
const GameCanvas = lazy(() => import("./game/GameCanvas"));

export default function App() {
  useDebugHotkey();
  return (
    <>
      <Suspense fallback={null}>
        <GameCanvas />
      </Suspense>
      <PlayOverlay />
      <DebugOverlay />
      <LoadingScreen />
    </>
  );
}
