import { DoubleSide, MeshLambertMaterial } from "three";
import { GRASS_RENDER } from "../config/grass";

/**
 * Flat-shaded, double-sided Lambert with vertex + instance colours, plus a
 * tiny vertex-shader sway. Sway scales with world height, so stubble (cut
 * cells, scaled down) barely moves. Uniforms are mutated per frame, not state.
 */
export function createGrassMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: GRASS_RENDER.wind },
    uWindSpeed: { value: GRASS_RENDER.windSpeed },
  };
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;\nuniform float uWindSpeed;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  float gSx = max(length(instanceMatrix[0].xyz), 0.001);
  float gSy = length(instanceMatrix[1].xyz);
  float gPhase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
  float gSway = sin(uTime * uWindSpeed + gPhase) * uWind * position.y * gSy;
  transformed.x += gSway / gSx;
  transformed.z += 0.6 * gSway / gSx;
#endif`,
      );
  };
  material.customProgramCacheKey = () => "grass-v1";
  return { material, uniforms };
}
