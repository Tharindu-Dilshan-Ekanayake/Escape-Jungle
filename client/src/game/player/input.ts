import { LOOK } from "../../config/player";
import { usePlatformStore } from "../../store/platformStore";
import { useUiStore } from "../../store/uiStore";

/**
 * Mutable input state, written by DOM events (keyboard, mouse, touch UI) and
 * consumed by the controller every frame. Never React/Zustand state.
 * Note: P is intentionally NOT bound (Boxity/CrazyGames pause menu).
 */
export const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  /** Hold to cut (left mouse while pointer-locked, or the touch CUT button). */
  cut: false,
  /** Virtual joystick, -1..1 (y > 0 = forward). */
  joyX: 0,
  joyY: 0,
  /** Accumulated wheel steps (lobby camera zoom), consumed each frame. */
  zoom: 0,
  /** Accumulated look deltas in radians, consumed each frame. */
  lookX: 0,
  lookY: 0,
};

// Dev only: automated checks drive input without pointer lock (stripped from builds).
if (import.meta.env.DEV) (window as unknown as { __input: typeof input }).__input = input;

let canvas: HTMLCanvasElement | null = null;

const KEYS: Record<string, keyof Pick<typeof input, "forward" | "back" | "left" | "right" | "jump">> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
};

function sensitivity() {
  return usePlatformStore.getState().cameraSensitivity || 1;
}

/** Touch UI feeds look deltas in pixels through here. */
export function addTouchLook(dx: number, dy: number) {
  const s = LOOK.touch * sensitivity();
  input.lookX += dx * s;
  input.lookY += dy * s;
}

export function requestPointerLock() {
  if (!canvas || document.pointerLockElement === canvas) return;
  try {
    const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
    r?.catch?.(() => {});
  } catch {
    /* not allowed (e.g. iframe without permission) */
  }
}

function clearKeys() {
  input.forward = input.back = input.left = input.right = input.jump = input.cut = false;
}

export interface InputOptions {
  /** Click grabs the pointer for mouse-look (jungle, desktop). */
  pointerLock: boolean;
  /** Free mouse: drag on the canvas to orbit, wheel to zoom (lobby). */
  dragLook: boolean;
}

/** Wire DOM listeners for the given canvas. Returns cleanup. */
export function installInput(target: HTMLCanvasElement, opts: InputOptions) {
  canvas = target;
  const enablePointerLock = opts.pointerLock;

  // Drag-to-orbit (lobby): any mouse button dragged over the canvas turns the camera.
  let dragId = -1;
  let lastX = 0;
  let lastY = 0;
  const onPointerDown = (e: PointerEvent) => {
    if (!opts.dragLook || e.pointerType !== "mouse") return;
    dragId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    target.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== dragId) return;
    const s = LOOK.drag * sensitivity();
    input.lookX += (e.clientX - lastX) * s;
    input.lookY += (e.clientY - lastY) * s;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === dragId) dragId = -1;
  };
  const onWheel = (e: WheelEvent) => {
    if (!opts.dragLook) return;
    e.preventDefault();
    input.zoom += Math.sign(e.deltaY);
  };
  const onContextMenu = (e: Event) => opts.dragLook && e.preventDefault(); // right-drag orbits
  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("pointercancel", onPointerUp);
  target.addEventListener("wheel", onWheel, { passive: false });
  target.addEventListener("contextmenu", onContextMenu);
  const removeDrag = () => {
    target.removeEventListener("pointerdown", onPointerDown);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
    target.removeEventListener("pointercancel", onPointerUp);
    target.removeEventListener("wheel", onWheel);
    target.removeEventListener("contextmenu", onContextMenu);
  };

  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const k = KEYS[e.code];
    if (!k) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    input[k] = down;
    if (k === "jump" || e.code.startsWith("Arrow")) e.preventDefault();
  };
  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    // Chrome on Windows sometimes reports a huge jump for one event: skip it.
    if (Math.abs(e.movementX) > LOOK.spikePx || Math.abs(e.movementY) > LOOK.spikePx) return;
    const s = LOOK.mouse * sensitivity();
    input.lookX += e.movementX * s;
    input.lookY += e.movementY * s;
  };
  const onLockChange = () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked) input.cut = false;
    useUiStore.setState({ pointerLocked: locked });
  };
  const onClick = () => enablePointerLock && requestPointerLock();
  // The click that grabs the pointer does not cut: only presses while locked do.
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && document.pointerLockElement === canvas) input.cut = true;
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) input.cut = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  target.addEventListener("click", onClick);

  return () => {
    removeDrag();
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearKeys);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("pointerlockchange", onLockChange);
    target.removeEventListener("click", onClick);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    clearKeys();
    canvas = null;
  };
}
