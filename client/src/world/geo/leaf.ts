import { BufferAttribute, BufferGeometry } from "three";

/**
 * Unit leaf: base at origin, tip at +Z (length 1), width 1, raised spine.
 * Both windings are included so it is visible from either side with
 * FrontSide culling (one material for the whole merged mesh).
 */
export function leafTemplate(): BufferGeometry {
  // prettier-ignore
  const p = new Float32Array([
    0, 0, 0,        // 0 base
    -0.5, 0.04, 0.4, // 1 left
    0.5, 0.04, 0.4,  // 2 right
    0, 0.1, 0.45,    // 3 spine (raised)
    0, -0.08, 1,     // 4 tip (droops)
  ]);
  const front = [0, 3, 1, 0, 2, 3, 1, 3, 4, 3, 2, 4];
  const back = [0, 1, 3, 0, 3, 2, 1, 4, 3, 3, 4, 2];
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(p, 3));
  g.setIndex([...front, ...back]);
  // Shading uses flat (derivative) normals; this attribute only needs to be non-zero.
  g.setAttribute("normal", new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  return g;
}
