import type { PartBuilder } from "../geo/PartBuilder";
import type { Collider } from "../../game/player/collision";
import type { AmazonCounts } from "../../config/amazon";
import { acaiPalm, bromeliad, coiledSnake, heliconia, lilyPond, monstera, oldBones, pitcherPlant, skullTotem, spiderWeb } from "./amazon";

type Point = () => { x: number; z: number } | null;

/** Scatter Amazon plants and creepy finds at points from `at` (null = no free spot). */
export function scatterAmazon(b: PartBuilder, colliders: Collider[], at: Point, n: AmazonCounts) {
  const place = (count: number, fn: (x: number, z: number) => void) => {
    for (let i = 0; i < count; i++) {
      const p = at();
      if (p) fn(p.x, p.z);
    }
  };
  place(n.heliconia, (x, z) => heliconia(b, x, z, b.rand(0.9, 1.4)));
  place(n.monstera, (x, z) => monstera(b, x, z, b.rand(0.9, 1.5)));
  place(n.bromeliad, (x, z) => bromeliad(b, x, z, b.rand(0.8, 1.3)));
  place(n.pitcher, (x, z) => pitcherPlant(b, x, z, b.rand(0.9, 1.3)));
  place(n.palm, (x, z) => {
    acaiPalm(b, x, z, b.rand(7, 11));
    colliders.push({ kind: "circle", x, z, r: 0.2 });
  });
  place(n.pond, (x, z) => lilyPond(b, x, z, b.rand(1.8, 2.6)));
  place(n.web, (x, z) => spiderWeb(b, x, z, b.rand(0, Math.PI * 2), b.rand(1, 1.3)));
  place(n.totem, (x, z) => {
    skullTotem(b, x, z, b.rand(0, Math.PI * 2));
    colliders.push({ kind: "circle", x, z, r: 0.25 });
  });
  place(n.snake, (x, z) => coiledSnake(b, x, z, b.rand(1, 1.4)));
  place(n.bones, (x, z) => oldBones(b, x, z));
}
