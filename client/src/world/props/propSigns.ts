import type { PropKind } from "../../config/camp1";
import type { BannerStyle } from "../banners/banners";

/**
 * Where each camp prop's name is printed on the prop itself (local space,
 * front = +Z): the grinder's front wall, the tool rack's header plank, the
 * mower's marquee board, and so on. One banner atlas, no extra draw calls.
 */
export interface PropSign {
  x?: number;
  y: number;
  z: number;
  w: number;
  h: number;
  style: BannerStyle;
  sub?: string;
}

export const PROP_SIGNS: Partial<Record<PropKind, PropSign>> = {
  grinder: { y: 1.75, z: 0.93, w: 1.9, h: 0.45, style: "cream" },
  toolBoard: { y: 2.48, z: 0.09, w: 2.5, h: 0.42, style: "wood" },
  mowerStand: { y: 3.45, z: -1.41, w: 3.7, h: 0.95, style: "gold", sub: "20 SECONDS" },
  cashSign: { y: 1.9, z: 0.07, w: 2.0, h: 0.95, style: "gold" },
  nuke: { y: 3.7, z: -0.2, w: 1.4, h: 0.4, style: "cloth" },
  bagTable: { y: 0.7, z: 0.6, w: 2.1, h: 0.34, style: "cream" },
  moneyBox: { y: 0.5, z: 0.82, w: 1.4, h: 0.4, style: "gold" },
};
