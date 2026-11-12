import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshBasicMaterial, type Group } from "three";
import { buildSky } from "./buildSky";
import { CAMERA, SKY } from "../../config/render";
import { useQualityStore } from "../../store/qualityStore";
import { DayNight } from "./DayNight";

/** Sky dome + clouds: 1 draw call, follows the camera, never fogged. With dayNight it also runs the day/night cycle (lights, stars, moon). */
export function Sky({ dayNight = false }: { dayNight?: boolean }) {
  const geometry = useMemo(() => buildSky(), []);
  const material = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  // The dome is built inside-out, so the default FrontSide shows it from the centre.

  const viewDistance = useQualityStore((s) => s.preset.viewDistance);
  const radius = viewDistance * CAMERA.farMultiplier * SKY.radiusRatio;
  const group = useRef<Group>(null);

  useFrame(({ camera }) => {
    group.current?.position.copy(camera.position);
  });

  return (
    <>
      <group ref={group} scale={radius}>
        <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />
      </group>
      {dayNight && <DayNight skyMaterial={material} />}
    </>
  );
}
