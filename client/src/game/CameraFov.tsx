import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { CAMERA } from "../config/render";
import { adaptiveFov } from "./fov";

/** Widens the vertical FOV on portrait / tall screens (re-runs on resize and rotation). */
export function CameraFov() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    camera.fov = adaptiveFov(CAMERA.fov, size.width / Math.max(1, size.height));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
