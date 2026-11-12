/**
 * The escape at the end of the run: board the rescue helicopter, it takes
 * off and flies you out, then the results card sends you back to the lobby.
 * Mutable state (read in useFrame by the controller, viewmodel and EscapeSystem).
 */
export const ESCAPE = {
  /** Board when this close to the helicopter (m) and the last gate is open. */
  boardRadius: 5,
  /** Rotor spin-up, lift-off and fly-away timeline (s), then the results card. */
  spinUpS: 1.4,
  flyS: 5.2,
  /** Results card returns to the lobby on its own after this long (s). */
  autoReturnS: 8,
  /** Where the camera watches from (offset from the pad). */
  camOffset: [9, 2.6, 10] as [number, number, number],
};

export const escape = { active: false, start: 0 };

export function startEscape() {
  if (escape.active) return;
  escape.active = true;
  escape.start = performance.now() / 1000;
}

export function resetEscape() {
  escape.active = false;
  escape.start = 0;
}

/** Seconds since boarding (0 when not escaping). */
export const escapeTime = () => (escape.active ? performance.now() / 1000 - escape.start : 0);
