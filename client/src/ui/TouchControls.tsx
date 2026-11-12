import { lazy, Suspense, useEffect, useRef } from "react";
import { TOUCH } from "../config/player";
import { addTouchLook, input } from "../game/player/input";
import { useHud } from "./layout/hudLayout";
import { TUT_GLOW, useTutorialHighlight } from "./hud/TutorialCard";
// Jungle-only: loaded with the run, not with the lobby.
const UseButton = lazy(() => import("./UseButton").then((m) => ({ default: m.UseButton })));

/**
 * Mobile controls: floating joystick on the left, drag-to-look on the right,
 * jump button bottom-right. Writes straight into `input`; visuals move via
 * refs, so touch moves never re-render React.
 */
export function TouchControls({ showCut = true }: { showCut?: boolean }) {
  const L = useHud();
  const cutGlow = useTutorialHighlight() === "cut";
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    let joyId = -1;
    let lookId = -1;
    let ox = 0;
    let oy = 0;
    let lx = 0;
    let ly = 0;
    const R = TOUCH.joystickRadius;

    const showBase = (visible: boolean) => {
      if (base.current) base.current.style.opacity = visible ? "1" : "0";
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return; // a control button
      if (e.clientX < window.innerWidth * TOUCH.joystickZone && joyId < 0) {
        joyId = e.pointerId;
        ox = e.clientX;
        oy = e.clientY;
        if (base.current) base.current.style.transform = `translate(${ox - R}px, ${oy - R}px)`;
        if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
        showBase(true);
      } else if (lookId < 0) {
        lookId = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === joyId) {
        let dx = e.clientX - ox;
        let dy = e.clientY - oy;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        const mag = Math.min(d, R) / R;
        input.joyX = mag < TOUCH.deadzone ? 0 : dx / R;
        input.joyY = mag < TOUCH.deadzone ? 0 : -dy / R;
        if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (e.pointerId === lookId) {
        addTouchLook(e.clientX - lx, e.clientY - ly);
        lx = e.clientX;
        ly = e.clientY;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === joyId) {
        joyId = -1;
        input.joyX = 0;
        input.joyY = 0;
        showBase(false);
      } else if (e.pointerId === lookId) {
        lookId = -1;
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      input.joyX = input.joyY = 0;
    };
  }, []);

  const R = TOUCH.joystickRadius;
  return (
    <div ref={zone} className="fixed inset-0 z-10 touch-none select-none">
      <div
        ref={base}
        className="pointer-events-none absolute left-0 top-0 rounded-full border-4 border-white/50 bg-black/20 opacity-0 transition-opacity"
        style={{ width: R * 2, height: R * 2 }}
      >
        <div
          ref={knob}
          className="absolute rounded-full bg-white/70"
          style={{ width: R, height: R, left: R / 2, top: R / 2 }}
        />
      </div>
      {showCut && (
        <button
          type="button"
          aria-label="Cut"
          className={`absolute rounded-full border-4 border-white/70 bg-[#4f9a2a]/75 font-lobby text-xl font-bold text-white shadow-lg active:scale-95 active:bg-[#9BE22D]/80 ${cutGlow ? TUT_GLOW : ""}`}
          style={{ right: L.cut.right, bottom: L.cut.bottom, width: L.cut.size, height: L.cut.size }}
          onPointerDown={() => (input.cut = true)}
          onPointerUp={() => (input.cut = false)}
          onPointerCancel={() => (input.cut = false)}
          onPointerLeave={() => (input.cut = false)}
        >
          CUT
        </button>
      )}
      <button
        type="button"
        aria-label="Jump"
        className="absolute rounded-full border-4 border-white/60 bg-black/35 font-lobby text-lg font-bold text-white shadow-lg active:scale-95 active:bg-white/30"
        // Lobby portrait: keep JUMP clear of the PLAY button.
        style={{ right: L.jump.right, bottom: !showCut && L.mode === "portrait" ? 170 : L.jump.bottom, width: L.jump.size, height: L.jump.size }}
        onPointerDown={(e) => {
          e.stopPropagation();
          input.jump = true;
        }}
        onPointerUp={() => (input.jump = false)}
        onPointerCancel={() => (input.jump = false)}
        onPointerLeave={() => (input.jump = false)}
      >
        JUMP
      </button>
      {showCut && (
        <Suspense fallback={null}>
          <UseButton />
        </Suspense>
      )}
    </div>
  );
}
