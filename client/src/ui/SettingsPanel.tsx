import { useQualityStore } from "../store/qualityStore";
import { usePlatformStore } from "../store/platformStore";
import { useDebugStore } from "../store/debugStore";
import { useUiStore } from "../store/uiStore";
import { getSDK } from "../platform/boxity";
import { setMasterVolume } from "../game/audio";
import type { QualityLevel } from "../config/quality";
import { Panel } from "./Panel";

const QUALITY_LABEL: Record<QualityLevel, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

/** Save to Boxity (it persists settings for every game); listeners apply them. */
function saveSetting(values: Record<string, string | number | boolean>) {
  getSDK()?.settings.set(values);
}

/** Settings panel (lobby + jungle): graphics quality, volume, camera, FPS overlay. */
export function SettingsPanel() {
  const requested = useQualityStore((s) => s.requested);
  const ceiling = useQualityStore((s) => s.deviceCeiling);
  const volume = usePlatformStore((s) => s.masterVolume);
  const sens = usePlatformStore((s) => s.cameraSensitivity);
  const fps = useDebugStore((s) => s.overlayVisible);
  const close = () => useUiStore.getState().openPanel(null);

  const setQuality = (q: QualityLevel) => {
    useQualityStore.getState().setRequested(q);
    saveSetting({ graphics_quality: QUALITY_LABEL[q] });
  };

  return (
    <Panel title="Settings" icon="⚙️" onClose={close} width="min(92vw,460px)">
      <div className="space-y-4 font-lobby text-[#3a2a1a]">
        <div>
          <div className="mb-1 text-lg font-bold">Graphics</div>
          <div className="flex gap-2">
            {(["LOW", "MEDIUM", "HIGH"] as QualityLevel[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={`flex-1 rounded-xl border-b-4 py-2 text-lg font-bold ${
                  requested === q ? "border-[#2f8a1f] bg-[#6fd13a] text-white" : "border-[#c9b48a] bg-[#f3e6c4]"
                }`}
              >
                {QUALITY_LABEL[q]}
              </button>
            ))}
          </div>
          {ceiling !== "HIGH" && <p className="mt-1 text-xs text-[#6b5a44]">This device is capped at {QUALITY_LABEL[ceiling]} for smooth play.</p>}
        </div>
        <label className="block">
          <div className="mb-1 flex justify-between text-lg font-bold">
            <span>Volume</span>
            <span>{Math.round(volume)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              usePlatformStore.setState({ masterVolume: v });
              setMasterVolume(v);
              saveSetting({ master_volume: v });
            }}
            className="w-full accent-[#4cc12e]"
          />
        </label>
        <label className="block">
          <div className="mb-1 flex justify-between text-lg font-bold">
            <span>Camera sensitivity</span>
            <span>{sens.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={sens}
            onChange={(e) => {
              const v = Number(e.target.value);
              usePlatformStore.setState({ cameraSensitivity: v });
              saveSetting({ camera_sensitivity: v });
            }}
            className="w-full accent-[#4cc12e]"
          />
        </label>
        <label className="flex items-center justify-between text-lg font-bold">
          <span>Show FPS (F3)</span>
          <input
            type="checkbox"
            checked={fps}
            onChange={(e) => {
              useDebugStore.getState().setOverlay(e.target.checked);
              saveSetting({ show_fps: e.target.checked });
            }}
            className="h-6 w-6 accent-[#4cc12e]"
          />
        </label>
      </div>
    </Panel>
  );
}
