/** First-time guide (game/tutorial): the steps, their rewards and how much to do. */
export type TutorialHighlight = "" | "interact" | "cut" | "upgrades";

export interface TutorialStep {
  id: "talk" | "cut" | "sell" | "wood" | "upgrade";
  title: string;
  hint: string;
  /** Touch screens get their own hint. */
  touchHint?: string;
  reward: number;
  highlight: TutorialHighlight;
}

export const TUTORIAL = {
  storageKey: "ej_tutorial_done_v1",
  /** Plants to cut in the "cut" step. */
  cutTarget: 25,
  /** Ground chevrons: spacing (m), how many at most, and where they stop near the target. */
  path: { spacing: 1.15, max: 26, startGap: 1.6, endGap: 1.6 },
  steps: [
    { id: "talk", title: "Talk to Captain Rusty", hint: "Follow the glowing path and press E", touchHint: "Follow the glowing path and tap USE", reward: 0.5, highlight: "interact" },
    { id: "cut", title: "Cut the tall grass", hint: "Hold left click to swing your blade", touchHint: "Hold the CUT button", reward: 0.5, highlight: "cut" },
    { id: "sell", title: "Sell your grass at the Grinder", hint: "Walk into the grinder's chute", reward: 1, highlight: "" },
    { id: "wood", title: "Chop a tree for firewood", hint: "Swing at a tree with a red ribbon, then take a log (E)", touchHint: "Swing at a tree with a red ribbon, then tap USE", reward: 1.5, highlight: "interact" },
    { id: "upgrade", title: "Buy your first upgrade", hint: "Press TAB and buy one", touchHint: "Tap UPGRADES and buy one", reward: 0, highlight: "upgrades" },
  ] as TutorialStep[],
};
