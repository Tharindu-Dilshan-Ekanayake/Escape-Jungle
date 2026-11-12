/**
 * Field of view that adapts to the screen shape. `baseFov` is the vertical FOV
 * on a normal landscape screen; on taller screens (portrait phones) we keep a
 * sensible horizontal view instead, so the world doesn't look zoomed in.
 */
const REF_ASPECT = 16 / 9;
const MAX_FOV = 100;

export function adaptiveFov(baseFov: number, aspect: number): number {
  if (aspect >= 1.3) return baseFov;
  // Horizontal FOV we'd have at the reference aspect, scaled down a bit for tall screens.
  const hfov = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * REF_ASPECT) * (aspect < 1 ? 0.78 : 0.9);
  const v = (2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180) / Math.PI;
  return Math.min(MAX_FOV, Math.max(baseFov, v));
}
