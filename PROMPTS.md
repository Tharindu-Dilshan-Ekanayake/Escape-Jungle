# Phase Prompts — copy-paste one at a time into Claude Code

Start every new session with:
> Read CLAUDE.md, /docs/SDK.md and /reference/INDEX.md fully before doing anything. Only open the screenshots a task points to.

---

## Phase 0 — Setup
```
Read CLAUDE.md, /docs/SDK.md and /reference/INDEX.md. Create the root package.json with concurrently scripts, then set up the /client (Vite + React + TS + R3F + drei + rapier + zustand + tailwind)
and /server (Colyseus) folders exactly as in section 1, each with its own package.json.
Integrate the SDK init/bootstrapping from /docs/SDK.md now. Add the F3 debug overlay (fps, draw calls, triangles)
and the Low/Medium/High quality store from section 2. Add self-hosted fonts from section 4. No gameplay yet.
```

## Phase 1 — Jungle environment (Camp 1 only)
```
Build Chapter 1 Camp 1 environment only, matching /reference/09, 11, 12, 13, 14, 18.
Sandy clearing, canopy leaves, tall trunks, sky, fireflies, flowers, torches, and placeholder positions for
Grinder, Tool board, Upgrade Bag table, Mower stand, 2X Cash sign, Nuke, Money Box.
Build all props from low-poly primitives with flatShading (no textures). Follow performance rules in section 2.
Add a first-person controller (WASD + mouse look + jump, pointer lock). Then tell me which screenshot to compare.
```

## Phase 2 — Grass grid system
```
Implement section 5.1 Grass Grid System. Fill the area around Camp 1 with tall grass (see /reference/10, 20),
chunked InstancedMeshes, 0.5m cells, Uint8Array alive bitset. Sickle viewmodel with swing animation (see 09).
Hold click cuts a forward arc, leaves brown dirt + stubble + leaf particles (see 10, 17).
Show "Clear the area N%" bar. Must keep 60fps with 50k+ grass cells on desktop.
```

## Phase 3 — Economy loop
```
Implement 5.2 Bag & Grinder, 5.3 Tools, the HUD layout from section 4 (bottom-left bag + cash, hotbar, top bar).
Bag full -> count turns red, ground white arrows + yellow dashed line to the Grinder (see /reference/13).
Grinder converts bag to cash with coin animation. Tool board: buy Machete $3 with E prompt (see 12).
All numbers from /config/balance.ts.
```

## Phase 4 — Upgrades, objectives, tutorial, index
```
Implement 5.4 Upgrades panel (TAB) exactly like /reference/16, 5.6 Objectives + 6-step tutorial banner,
5.7 Jungle Index with FIRST FIND popup (see 10, 19, 20), secret stashes, and the UPGRADES button with
red badge showing affordable count.
```

## Phase 5 — Camps, gates, plant tiers, exit
```
Implement 5.5: Camp 1 -> bamboo/banana zone -> gate "NEXT CAMP $15" -> Camp 2 (see /reference/18, 19) -> ... -> Exit.
Add 13 plant types with tiers (bamboo needs Shears, Diamond Plant gives gems). Add run timer, run complete screen.
```

## Phase 6 — Shop stands
```
Implement 5.8: Ride On Mower (drivable 20s, spiked roller clears wide path), 2X Cash, Infinite Bag, Nuke, Money Box,
priced in gems with confirm modal. Match signs in /reference/11, 13, 14.
```

## Phase 7 — Cutscenes
```
Implement 5.9: letterbox cutscene system with dialogue + Skip (ENTER), intro sequence (see /reference/06, 07, 08)
and the paw-prints story beat (see 17).
```

## Phase 8 — Lobby
```
Implement 5.10 lobby hub matching /reference/01, 02, 03, 05: plaza, fountain, shops, leaderboards, 8 party pads,
left button column, currency bars, PLAY button, Maps modal exactly like /reference/04.
```

## Phase 9 — Multiplayer
```
Implement 5.11 with Colyseus: LobbyRoom (pads, matchmaking, friends only), RunRoom (shared grass bitset diffs,
validated cuts, individual economy). Test with 4 browser tabs.
```

## Phase 10 — Polish & mobile
```
Add mobile controls (joystick + cut button + jump), test Low quality on a throttled CPU (6x slowdown in DevTools),
fix anything under 30fps. Add sounds (swing, cut, grinder, coins, ui click).
```

---

### Fix-up prompt (use anytime something looks off)
```
Open /reference/XX.png and compare with the current game. List every difference in colors, sizes, positions,
fonts and UI layout, then fix them one by one.
```
