import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { rendererStats } from "../store/debugStore";

const SAMPLE_WINDOW_S = 0.5;
let frames = 0;
let elapsed = 0;

/**
 * Writes renderer stats into the mutable `rendererStats` object.
 * No React/Zustand state is touched per frame (forbidden inside useFrame).
 * three.js auto-resets gl.info AFTER the shadow pass, which hides shadow draw
 * calls. We disable autoReset, read the totals in scene.onAfterRender (shadow
 * + main pass) and reset there ourselves, so the overlay shows real GPU work.
 */
export function RendererStats() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const info = gl.info;
    const prevAutoReset = info.autoReset;
    const prev = scene.onAfterRender;
    info.autoReset = false;
    // Dev-only: lets the headless perf probes break triangles down per mesh.
    if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = { scene, gl };
    scene.onAfterRender = (...args) => {
      prev.apply(scene, args);
      rendererStats.drawCalls = info.render.calls;
      rendererStats.triangles = info.render.triangles;
      rendererStats.geometries = info.memory.geometries;
      rendererStats.textures = info.memory.textures;
      info.reset();
    };
    return () => {
      scene.onAfterRender = prev;
      info.autoReset = prevAutoReset;
    };
  }, [gl, scene]);

  useFrame((state, delta) => {
    rendererStats.dpr = state.viewport.dpr;
    frames++;
    elapsed += delta;
    if (elapsed >= SAMPLE_WINDOW_S) {
      rendererStats.fps = frames / elapsed;
      rendererStats.frameMs = (elapsed / frames) * 1000;
      frames = 0;
      elapsed = 0;
    }
  });
  return null;
}
