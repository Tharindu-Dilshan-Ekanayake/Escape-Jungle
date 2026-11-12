import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  type DirectionalLight,
  type Fog,
  type HemisphereLight,
} from "three";
import { CAMERA, LIGHTING, SKY } from "../../config/render";
import { CYCLE, MOON, STARS } from "../../config/night";
import { dayNight, syncDayNight } from "../../game/time/dayNight";
import { runElapsed } from "../../net/runNet";
import { useQualityStore } from "../../store/qualityStore";
import { progress } from "../../game/progress/progress";
import { mulberry32 } from "../geo/rng";

interface Props {
  /** Sky dome material to tint (vertex colours x material colour). */
  skyMaterial: MeshBasicMaterial;
}

/**
 * Drives the day/night cycle: owns the hemisphere + sun/moon lights, tints the
 * sky, blends fog colour and distance, and fades in stars + moon (2 draw calls,
 * only drawn at night). Mutates existing three objects only (no allocations in useFrame).
 */
export function DayNight({ skyMaterial }: Props) {
  const preset = useQualityStore((s) => s.preset);
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);

  const sky = useMemo(() => {
    const rng = mulberry32(5150);
    const pos = new Float32Array(STARS.count * 3);
    for (let i = 0; i < STARS.count; i++) {
      const y = STARS.minElevation + rng() * (1 - STARS.minElevation);
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    const starMat = new PointsMaterial({
      color: "#ffffff",
      size: STARS.size,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const stars = new Points(g, starMat);
    stars.frustumCulled = false;
    const moonGeo = new CircleGeometry(1, 20);
    const moonMat = new MeshBasicMaterial({
      color: MOON.color,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const moon = new Mesh(moonGeo, moonMat);
    const [mx, my, mz] = MOON.direction;
    const len = Math.hypot(mx, my, mz);
    moon.position.set(mx / len, my / len, mz / len);
    moon.lookAt(0, 0, 0);
    moon.scale.setScalar(MOON.size);
    moon.frustumCulled = false;
    const group = new Group();
    group.add(stars, moon);
    return { group, stars, moon, g, starMat, moonGeo, moonMat };
  }, []);

  useEffect(
    () => () => {
      sky.g.dispose();
      sky.starMat.dispose();
      sky.moonGeo.dispose();
      sky.moonMat.dispose();
      skyMaterial.color.setRGB(1, 1, 1);
    },
    [sky, skyMaterial],
  );

  useFrame(({ scene, camera }) => {
    // Shared clock: every party member sees the same time of day.
    if (!progress.finished) syncDayNight(runElapsed());
    const L = dayNight.light;
    const k = dayNight.dark;
    if (hemi.current) {
      hemi.current.color.copy(L.hemiSky);
      hemi.current.groundColor.copy(L.hemiGround);
      hemi.current.intensity = L.hemi;
    }
    if (sun.current) {
      sun.current.color.copy(L.sun);
      sun.current.intensity = L.sunI;
    }
    skyMaterial.color.copy(L.sky);
    const fog = scene.fog as Fog | null;
    const vd = preset.viewDistance;
    if (fog) {
      fog.color.copy(L.fog);
      fog.near = vd * (CYCLE.dayFogStart + (CYCLE.nightFogStart - CYCLE.dayFogStart) * k);
      fog.far = vd * (1 + (CYCLE.nightFogEnd - 1) * k);
    }
    sky.starMat.opacity = k * k;
    sky.moonMat.opacity = k;
    sky.stars.visible = sky.moon.visible = k > 0.02;
    sky.group.position.copy(camera.position);
    sky.group.scale.setScalar(vd * CAMERA.farMultiplier * SKY.radiusRatio * 0.97);
  });

  const s = LIGHTING.shadowArea;
  const mapSize = preset.shadowMapSize || 1;
  return (
    <>
      <hemisphereLight ref={hemi} args={[LIGHTING.hemiSky, LIGHTING.hemiGround, LIGHTING.hemiIntensity]} />
      <directionalLight
        ref={sun}
        position={LIGHTING.sunPosition}
        castShadow={preset.shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={LIGHTING.shadowBias}
        shadow-camera-left={-s}
        shadow-camera-right={s}
        shadow-camera-top={s}
        shadow-camera-bottom={-s}
        shadow-camera-far={LIGHTING.shadowFar}
      />
      <primitive object={sky.group} />
    </>
  );
}
