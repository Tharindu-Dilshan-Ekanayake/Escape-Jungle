import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useBootStore } from "../store/bootStore";
import { loadingEnd, loadingStep } from "../platform/boxity";

/**
 * Full-screen loader shown until the first scene has mounted. Mirrors progress
 * to Boxity's own loading screen via loadingStep/loadingEnd.
 */
export function LoadingScreen() {
  const ready = useBootStore((s) => s.ready);
  const { progress, active } = useProgress();
  const pct = active ? Math.round(progress) : ready ? 100 : 0;

  useEffect(() => {
    if (!ready) loadingStep(active ? `Loading assets ${Math.round(progress)}%` : "Loading engine...");
  }, [ready, active, progress]);

  useEffect(() => {
    if (ready) loadingEnd();
  }, [ready]);

  if (ready) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#1F6B3A] text-white">
      <h1 className="font-lobby text-outline text-5xl font-bold tracking-wide">Loading</h1>
      <div className="h-4 w-72 overflow-hidden rounded-full border-2 border-black/60 bg-black/30">
        <div className="h-full bg-[#9BE22D] transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
