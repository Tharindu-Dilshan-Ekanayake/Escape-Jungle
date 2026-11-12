import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";

/** Keeps the camera far plane in sync with the quality preset's view distance. */
export function CameraFar({ far }: { far: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useEffect(() => {
    camera.far = far;
    camera.updateProjectionMatrix();
  }, [camera, far]);
  return null;
}
