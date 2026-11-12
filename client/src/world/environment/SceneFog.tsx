import { useQualityStore } from "../../store/qualityStore";

/** Linear fog that ends at the preset's view distance (culled chunks hide in it); minView stops it closing in further. */
export function SceneFog({ color, startRatio, minView = 0 }: { color: string; startRatio: number; minView?: number }) {
  const preset = useQualityStore((s) => s.preset);
  if (!preset.fog) return null;
  const view = Math.max(preset.viewDistance, minView);
  return <fog attach="fog" args={[color, view * startRatio, view]} />;
}
