import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import type { FireSpot } from "../../game/campfire/campfires";
import type { CampLayout } from "./baseLayout";
import { FINAL_WRECK } from "../../config/cutscene";
import type { BannerSpec } from "../banners/banners";
import { chapterData } from "../../config/chapters";

/**
 * Camp dressing: plaques on the food stores and water, and the scorched
 * crash trench at the plane wreck. Returns the printed banners.
 */
export function addCampDecor(b: PartBuilder, colliders: Collider[], camps: CampLayout[], fires: FireSpot[]): BannerSpec[] {
  void colliders;
  void fires;
  const banners: BannerSpec[] = [];
  /** Local (lx, lz) of something at spot s (turned by s.rotY) -> world. */
  const at = (s: { x: number; z: number; rotY: number }, lx: number, lz: number) => ({ x: s.x + lx * Math.cos(s.rotY) + lz * Math.sin(s.rotY), z: s.z - lx * Math.sin(s.rotY) + lz * Math.cos(s.rotY) });
  // Printed plaques on every food store and water sign. (No party lights, flags or
  // tidy signposts anywhere: every base is a rough survivor camp in a scary jungle.)
  for (const c of camps) {
    const st = at(c.store, 0, 1.14);
    banners.push({ text: "FOOD STORE", x: st.x, y: 2.1, z: st.z, rotY: c.store.rotY, w: 1.26, h: 0.34, style: "cream" });
    const wk = c.water.scale ?? 1;
    const wt = at(c.water, -0.6 * wk, 0.27 * wk);
    banners.push({ text: "WATER", x: wt.x, y: 1.8 * wk, z: wt.z, rotY: c.water.rotY, w: 0.62 * wk, h: 0.2 * wk, style: "cream" });
  };

  // Scorched ground and a ploughed trench where the plane came down (chapter 1, stage 7).
  if (!chapterData().intro) return banners;
  const [nx, , nz] = FINAL_WRECK.pieces.nose.pos;
  b.cyl(5.2, 5.4, 0.03, 14, { pos: [nx + 1.5, 0.03, nz + 2.5], color: "#3a2e24", top: "#4a3a2c" });
  b.cyl(2.6, 2.6, 0.035, 12, { pos: [nx + 0.4, 0.035, nz + 0.3], color: "#2a221c" });
  for (let k = 0; k < 6; k++) {
    const x = nx + 3 + k * 1.3;
    const z = nz - 1 - k * 0.6;
    b.box([1.5 - k * 0.12, 0.04, 1.3], { pos: [x, 0.03, z], rot: [0, 1.1, 0], color: "#6b4a2a", top: "#5a3e24" });
  }
  return banners;
}
