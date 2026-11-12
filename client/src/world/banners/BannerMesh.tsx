import { useEffect, useMemo } from "react";
import { MeshLambertMaterial } from "three";
import { buildBanners, type BannerSpec } from "./banners";

/** Every printed sign / banner of a stage: one mesh, one atlas texture, lit like the world. */
export function Banners({ specs }: { specs: BannerSpec[] }) {
  const r = useMemo(() => {
    const build = buildBanners(specs);
    const material = new MeshLambertMaterial({ map: build.texture });
    return { build, material };
  }, [specs]);
  useEffect(
    () => () => {
      r.build.dispose();
      r.material.dispose();
    },
    [r],
  );
  if (!specs.length) return null;
  return <mesh geometry={r.build.geometry} material={r.material} matrixAutoUpdate={false} frustumCulled={false} />;
}
