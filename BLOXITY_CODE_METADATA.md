---
canDie: false
hasScore: true
confirmed: false
---

# Boxity integration metadata

Required by docs/SDK.md (DELIVERABLES). The answers below are **proposed** from
CLAUDE.md and are **not yet confirmed by the developer**. Leaderboard ids are
permanent once declared, so `LEADERBOARDS_CONFIRMED` in
`client/src/config/platform.ts` stays `false` until this file is confirmed.

## canDie: false
Nothing in the design lets the player die, so no death screen is wired.

## hasScore: true (proposed boards, from CLAUDE.md 5.10)
| id | label | order | mode | format | reset |
|---|---|---|---|---|---|
| grass_cut | Grass Cut | desc | sum | compact | none |
| escapes | Escapees | desc | sum | number | none |
| best_time | Best Time | asc | best | time | none |

Open question: should the Daily Expedition's "today's top times" be its own
board (e.g. `daily_best_time`, asc, best, time, reset daily)?

## Screens declared for screen ads
`lobby`, `panel`, `results`, `gameplay` (gameplay banners OFF, the default).
No separate title `menu` screen exists in the current design.

## Still to configure
- `BOXITY_GAME_SLUG` (client/src/config/platform.ts and server env `BLOXITY_GAME_SLUG`)
- `BOXITY_HOSTING_ID` once the Colyseus server is hosted on Boxity (Phase 9)
- `.github/workflows/deploy.yml` (two-platform deploy) once the game id is known
