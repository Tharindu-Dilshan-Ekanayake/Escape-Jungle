import { useEffect, useState } from "react";
import { CAMP1 } from "../../config/camp1";
import { ZONES1 } from "../../config/zones1";
import { player } from "../../game/player/FirstPersonController";
import { runNet } from "../../net/runNet";

/** Every base, in order: where you land and which way you look (yaw). */
const BASES = [
  { name: "Landing Site", x: CAMP1.spawn.x, z: CAMP1.spawn.z, yaw: CAMP1.spawn.yaw },
  ...ZONES1.map((zn) => ({ name: zn.base.name, x: zn.base.x, z: zn.base.z + 2, yaw: 0 })),
];

/** Shown in dev builds, or with ?bases in the address (testing tool, not for players). */
export const baseJumpEnabled = () => import.meta.env.DEV || new URLSearchParams(window.location.search).has("bases");

function jump(i: number) {
  const b = BASES[i];
  Object.assign(player, { x: b.x, z: b.z, y: 0, vx: 0, vy: 0, vz: 0, yaw: b.yaw, facing: b.yaw });
  runNet.teleport = true;
}

/**
 * Right-side ◀ base ▶ arrows (and the [ / ] keys) that jump straight to any
 * base, so the camps can be looked at without playing through the run.
 */
export function BaseJump() {
  const [i, setI] = useState(0);
  const go = (d: number) =>
    setI((cur) => {
      const n = (cur + d + BASES.length) % BASES.length;
      jump(n);
      return n;
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "BracketLeft") go(-1);
      if (e.code === "BracketRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const btn = "grid h-11 w-11 place-items-center rounded-xl border-2 border-black/40 bg-black/55 text-2xl font-bold text-white active:scale-95";
  return (
    <div className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 font-lobby text-white">
      <button type="button" className={btn} onClick={() => go(-1)} aria-label="Previous base">
        ▲
      </button>
      <div className="rounded-lg bg-black/55 px-2 py-1 text-center text-xs font-bold leading-tight">
        {BASES[i].name}
        <div className="text-[10px] font-normal text-white/70">
          {i + 1}/{BASES.length} · [ ]
        </div>
      </div>
      <button type="button" className={btn} onClick={() => go(1)} aria-label="Next base">
        ▼
      </button>
    </div>
  );
}
