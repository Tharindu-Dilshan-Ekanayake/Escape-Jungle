/**
 * Intro cutscene: tour plane over the jungle -> engine catches fire -> everyone
 * parachutes out over the Landing Site -> the burning plane flies on and goes
 * down far away (stage 7, the Plane Wreck) -> you land at camp. All timings in
 * seconds from the start; positions in metres.
 */
type V3 = [number, number, number];

/** Flight path (Catmull-Rom): over the Landing Site, then on to the far crash. */
const PATH: V3[] = [
  [40, 56, 175],
  [18, 50, 80],
  [2, 45, 10],
  [-12, 40, -55],
  [-36, 26, -130],
  [-58, 3, -196],
];

export type Speaker = "YOU" | "RUSTY";

export const INTRO = {
  duration: 20.2,
  path: PATH,
  /** The plane reaches the end of the path (far crash); path progress eases in (it speeds up as it dives). */
  crashAt: 12.4,
  pathEase: 1.6,
  engineFailAt: 4.6,
  /** Camera shots (start times). */
  shots: { side: 0, close: 4.5, door: 6.9, follow: 9.4, watch: 10.8, glide: 13.8, ground: 15.6 },
  /** Chase-camera offsets per shot: [right, up, along-path] in metres. */
  sideOffset: [14, 7, -8] as V3,
  closeOffset: [8.5, 3, -1.5] as V3,
  /** Door shot: camera fixed to the plane (plane-local), looking at the door. */
  doorCam: [-7.5, 1.2, -7.5] as V3,
  /** Cabin door (plane-local, left side) and which way jumpers are pushed out. */
  door: [-1.15, -0.1, -2.0] as V3,
  /** Follow shot: offset from your parachute (world), slowly circling. */
  followOffset: [5.5, 1.4, 7] as V3,
  /** Ground shot: camera offset from where you land. */
  groundOffset: [5.2, 1.9, 6.6] as V3,
  /** Freefall before the canopy opens, canopy open time (bounce), collapse after landing. */
  freefallS: 0.9,
  openS: 0.55,
  collapseS: 0.9,
  gravity: 9.8,
  /** The four jumpers: you first, then Captain Rusty and two passengers. Land at [x, z] at `land` seconds. */
  jumpers: [
    { who: "you", exit: 7.2, land: 17.0, to: [0, 6.4] },
    { who: "rusty", exit: 7.55, land: 16.3, to: [2.2, -1.4] },
    { who: "red", exit: 7.9, land: 16.7, to: [3.4, 5.0] },
    { who: "purple", exit: 8.25, land: 17.4, to: [-3.8, 5.6] },
  ] as { who: "you" | "rusty" | "red" | "purple"; exit: number; land: number; to: [number, number] }[],
  shake: { duration: 0.6, amount: 0.08 },
  /** A faint flash when the plane goes down on the horizon. */
  flash: { at: 12.4, inS: 0.06, outS: 0.7, max: 0.3 },
  fadeOut: { at: 18.3, durationS: 0.6 },
  fadeIn: { at: 19.4, durationS: 0.8 },
  /** Dialogue lines, typed out at `cps` characters per second. */
  lines: [
    { at: 0.6, who: "YOU", text: "What a view... nothing but jungle for miles." },
    { at: 4.7, who: "RUSTY", text: "Engine's on fire! Everybody grab a parachute and JUMP!" },
    { at: 6.9, who: "YOU", text: "Here goes nothing...!" },
    { at: 9.5, who: "YOU", text: "Whoa! The chute opened! Everyone okay?" },
    { at: 11.0, who: "YOU", text: "Look! The plane... it's going down way out there!" },
    { at: 13.9, who: "RUSTY", text: "Aim for that clearing below! Bend your knees!" },
    { at: 15.8, who: "YOU", text: "Made it... Now we cut through the jungle and find that plane." },
  ] as { at: number; who: Speaker; text: string }[],
  cps: 34,
  skipKey: "Enter",
};

/**
 * Where the plane ends up: broken in four pieces at the Plane Wreck (stage 7),
 * still burning. Piece centres (world) + rotation (YXZ euler), plus colliders.
 */
export const FINAL_WRECK = {
  pieces: {
    nose: { pos: [-70.5, 0.95, -204.5] as V3, rot: [0.22, 3.55, 0.32] as V3 },
    body: { pos: [-67.4, 1.05, -199.2] as V3, rot: [-0.06, 3.25, 0.45] as V3 },
    wingL: { pos: [-73.2, 0.45, -197.6] as V3, rot: [0.04, 1.1, 0.06] as V3 },
    wingR: { pos: [-63.2, 0.55, -208.4] as V3, rot: [0.1, 2.35, -0.08] as V3 },
  },
  colliders: [
    { x: -70.5, z: -204.5, r: 1.7 },
    { x: -67.4, z: -199.2, r: 2.1 },
    { x: -73.2, z: -197.6, r: 1.6 },
    { x: -63.2, z: -208.4, r: 1.6 },
  ],
  /** Fires on the wreck: [x, y, z, size]. */
  fires: [
    [-70.2, 1.7, -203.6, 0.95],
    [-67.4, 2.0, -199.6, 0.7],
    [-72.6, 0.7, -197.8, 0.5],
    [-62.4, 1.0, -207.6, 0.6],
  ] as [number, number, number, number][],
  /** Smoke column you can see from far away (the goal). */
  plume: { x: -68.5, z: -202, height: 34 },
};

/** Smoke (engine trail during the flight, column from the wreck afterwards). */
export const SMOKE = {
  pool: 70,
  life: 2.6,
  /** Particles per second while emitting. */
  rate: 16,
  rise: 2.2,
  startSize: 0.5,
  endSize: 2.2,
  dustBurst: 26,
  colors: ["#5b5b5b", "#7a7a7a", "#9a9a9a"],
  dust: ["#a07a4a", "#8a6a44", "#c2a072"],
};
