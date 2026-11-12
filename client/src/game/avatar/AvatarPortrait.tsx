import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, WebGLRenderTarget } from "three";
import { player } from "../player/FirstPersonController";
import { onLocalLook } from "../../net/localLook";
import { usePortraitStore } from "../../store/portraitStore";

const SIZE = 160;
/** Head height of our avatar (m) and how far in front the portrait camera stands. */
const HEAD_Y = 1.62;
const CAM_DIST = 1.45;

/**
 * Takes a small portrait of the local avatar's face for the name card:
 * renders the scene once into a 160 px target from a camera in front of the
 * head (never per frame), shortly after load and whenever the look changes.
 */
export function AvatarPortrait() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const r = useMemo(() => {
    const target = new WebGLRenderTarget(SIZE, SIZE);
    const camera = new PerspectiveCamera(32, 1, 0.1, 30);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    return { target, camera, canvas, pixels: new Uint8Array(SIZE * SIZE * 4) };
  }, []);

  useEffect(() => {
    const snap = () => {
      const f = player.facing;
      const fx = -Math.sin(f);
      const fz = -Math.cos(f);
      const hx = player.x;
      const hz = player.z;
      r.camera.position.set(hx + fx * CAM_DIST, player.y + HEAD_Y + 0.12, hz + fz * CAM_DIST);
      r.camera.lookAt(hx, player.y + HEAD_Y - 0.08, hz);
      r.camera.updateMatrixWorld();
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(r.target);
      gl.clear();
      gl.render(scene, r.camera);
      gl.readRenderTargetPixels(r.target, 0, 0, SIZE, SIZE, r.pixels);
      gl.setRenderTarget(prev);
      const ctx = r.canvas.getContext("2d");
      if (!ctx) return;
      const img = ctx.createImageData(SIZE, SIZE);
      // WebGL rows are bottom-up: flip while copying.
      for (let y = 0; y < SIZE; y++) img.data.set(r.pixels.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
      ctx.putImageData(img, 0, 0);
      usePortraitStore.setState({ url: r.canvas.toDataURL("image/png") });
    };
    // After the avatar and its skin have loaded; again when the look changes.
    const timers = [window.setTimeout(snap, 2500), window.setTimeout(snap, 6000)];
    const off = onLocalLook(() => timers.push(window.setTimeout(snap, 1800)));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      off();
    };
  }, [gl, scene, r]);

  useEffect(() => () => r.target.dispose(), [r]);
  return null;
}
