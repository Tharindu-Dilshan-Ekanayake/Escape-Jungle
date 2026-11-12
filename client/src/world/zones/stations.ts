import { ZONES1 } from "../../config/zones1";
import { CAMP1 } from "../../config/camp1";
import { STATIONS } from "../../config/economy";
import { outpostPlan } from "./outpostLayout";

export interface GrinderSpot {
  /** Prop position + yaw (faces the base centre). */
  x: number;
  z: number;
  rotY: number;
  /** Intake point in front of it (walk in here to sell). */
  ix: number;
  iz: number;
}

function spot(x: number, z: number, rotY: number): GrinderSpot {
  const k = STATIONS.grinder.localZ;
  return { x, z, rotY, ix: x + Math.sin(rotY) * k, iz: z + Math.cos(rotY) * k };
}

/** Outpost grinder after zone i: its slot in the outpost plan (work corner). */
export function outpostGrinder(i: number): GrinderSpot {
  const g = outpostPlan(i).grinder;
  return spot(g.x, g.z, g.rotY);
}

/** Every grinder in the chapter: the camp's, then one per outpost (not the exit). */
export function allGrinders(): GrinderSpot[] {
  const p = CAMP1.props.find((q) => q.kind === "grinder")!;
  const rot = p.rotY ?? Math.atan2(-p.x, -p.z);
  const list = [spot(p.x, p.z, rot)];
  for (let i = 0; i < ZONES1.length - 1; i++) list.push(outpostGrinder(i));
  return list;
}
