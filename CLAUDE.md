# Escape The Jungle — Web Clone (CLAUDE.md)

You are building a browser clone of the Roblox game "[C5] Escape The Jungle".
Reference screenshots live in `/reference/` and are listed in `/reference/INDEX.md`.
Before building any visual element, **open the screenshots relevant to that task** (not all at once).
Match layout, colors, proportions, UI placement and art style as closely as possible.
When unsure how something looks, re-open the matching screenshot.

Platform SDK rules live in `/docs/SDK.md`. **Read it fully before Phase 0** and follow it in every phase.
If the SDK conflicts with anything in this file, the SDK wins — tell me about the conflict.

Premise: a scenic plane tour over the Amazon crashes. The player parachutes into the jungle
and must cut a path through endless grass, earn cash, upgrade tools, unlock camps and escape.

---

## 1. Tech Stack (do not change)

- React + Vite + TypeScript
- React Three Fiber + @react-three/drei + @react-three/rapier
- Zustand (game state), Tailwind CSS (UI)
- Colyseus (multiplayer server, `/server`), 1–4 players per room
- Folder layout (repo root has exactly these top-level folders):
```
/docs          (SDK.md and other docs — read only)
/reference     (screenshots + INDEX.md — read only)
/client        (Vite frontend)
/server        (Colyseus backend, own package.json)
```
- Client and server are separate npm projects. Shared types go in `/server/src/shared` and are imported by the client via a path alias.
- Root `package.json` has scripts: `dev` (runs both with concurrently), `dev:client`, `dev:server`, `build`.
- Inner layout:
```
/client
  /src
    /game        (scene, systems, components)
    /world       (map, camps, props, environment)
    /grass       (grass grid + instancing system)
    /ui          (HUD, panels, modals)
    /lobby       (hub scene, party pads, maps modal)
    /cutscene    (intro + story beats)
    /config      (all balance numbers — JSON/TS only, no magic numbers in code)
    /store       (zustand stores)
    /net         (colyseus client)
/server
  /src/rooms     (LobbyRoom, RunRoom)
  /src/shared    (types + message names shared with client)
```

---

## 2. PERFORMANCE RULES (mandatory, game must run on low-end PCs and mobile)

1. **No React component per grass blade / plant.** One `InstancedMesh` per plant type per chunk.
2. Map split into **chunks of 16×16 m**. Only chunks within ~60 m of a player are visible/updated.
3. All static props (trees, rocks, leaves, fences) merged into as few meshes as possible per chunk.
4. **No textures for environment.** Low-poly geometry + `flatShading: true` + vertex colors / solid materials.
   Use `MeshLambertMaterial` (or `MeshToonMaterial`) — avoid `MeshStandardMaterial` on mobile.
5. `dpr={[1, 1.5]}`, mobile `dpr={1}`. Antialias off on mobile.
6. Shadows: one directional light, shadows **off on mobile**, small shadow map (1024) on desktop, static props only.
7. Hot-loop state (positions, cut progress, bag count tick) uses Zustand `getState()` / refs — **never setState every frame**.
8. Particles (cut leaves, fireflies, coins) are pooled instanced meshes with a hard cap (e.g. 300).
9. Target: < 150 draw calls, 60 fps desktop, 30+ fps mid-range mobile. Add an FPS/drawcall debug overlay (toggle with `F3`).
10. Lazy-load each chapter; show a loading screen with progress. GLB assets Draco/meshopt compressed, < 2 MB total per chapter.
11. Quality settings in Settings menu: Low / Medium / High (grass density, shadows, view distance, fireflies).

---

## 3. Art Direction / Environment (match screenshots)

**Style:** Roblox low-poly, flat-shaded, chunky shapes, saturated colors, soft warm lighting.

**Jungle run map** (see 09, 11, 13, 18, 19):
- Ground: **sandy yellow** (`#E8C873`) in camp clearings; **brown dirt** (`#8B5A2B`) where grass was cut,
  with small low-poly green stubble left behind (see 10, 17).
- Tall grass: big flat triangular blades, bright **lime → yellow-green** (`#9BE22D`, `#C6F03A`, `#6CC81E`),
  ~1.6–2.2 m tall so it towers over the camera (see 10, 20).
- Bamboo: tall segmented lime cylinders with rings and thin leaves (see 18, 19).
- Canopy: huge low-poly leaves and bushes in **dark green** (`#1F6B3A`, `#2E8B4A`) with lighter tips;
  tall beige/tan tree trunks (`#C9B38A`) going up out of frame; vines hanging.
- Sky: bright blue (`#3A8DFF`) with low-poly clouds; visible through canopy gaps.
- Fireflies: small glowing yellow-white emissive spheres floating near grass.
- Small low-poly flowers (pink, yellow, orange) and mushrooms around camps.
- Scattered fallen orange/brown leaf decals on the ground.

**Camp props** (see 11–15):
- **Grinder:** orange wooden booth with a slanted roof (orange bunting), big grey gear on the side,
  white sign "GRINDER" in a distressed typewriter font, hopper on top, gold coins spilling out front.
- **Tool board:** dark chalkboard panel on wooden posts with tools hanging (machete, shears, dynamite),
  price floating above each ("$3"), "NEXT CAMP $15" label.
- **Upgrade Bag table:** orange table with two glowing gold sacks; floating labels "Upgrade Bag $3" and "Infinite Bag".
- **Ride On Mower stand:** red sign with marquee bulbs "RIDE ON MOWER / 20 SECONDS", red tractor with spiked roller, BUY panel.
- **2X CASH** wooden sign with yellow bulbs, **NUKE** (green missile on stone pedestal), **MONEY BOX** pedestal.
- Orange torch-lamps on wooden poles.
- **Ground arrows:** white chevron arrows on the ground + yellow dashed line leading to the grinder (see 13).

**Lobby hub** (see 01, 03, 05):
- Brick/paver plaza (`#E9D2A6` tiles), central stone fountain with blue water, low-poly round trees,
  colorful bunting flags, wooden fences, shop stalls (SHOP, WORKSHOP, CLASS SHOP), leaderboard boards
  (Grass Cut, Escapees, Best Times), 8 party pads in a row with glowing **yellow-green borders** and
  floating "0 of 4 / Step in to play" text.

**Lighting:** warm directional sun + hemisphere light (sky blue / ground green). Light fog in jungle.

---

## 4. Fonts & UI Style

- HUD / objectives / signs: typewriter style — Google font **"Special Elite"** with dark outline/stroke.
- Step banner & lobby UI: bold rounded sans — **"Fredoka"** (lobby) and **"Montserrat ExtraBold"** (step banner).
- Self-host fonts in `/client/public/fonts`.
- Panels: wooden frame (brown), cream inner panel, red square "X" close button, green pill buy buttons,
  grey disabled buttons (see 04, 16).

**Run HUD layout (see 09, 16):**
- Top center: "Clear the area N%" + progress bar.
- Top left: "Objectives" list with checkboxes and green reward text.
- Below top bar: tutorial banner "STEP X OF 6 <instruction>".
- Top right: settings (P), leave (L), player list.
- Bottom left: bag icon with capacity above it, current bag count (turns **red** when full), cash `$0.00` in green.
- Bottom center: hotbar slot "1" with current tool icon.
- Bottom right: UPGRADES button (TAB) with red notification badge = affordable upgrades, gem count, run timer `00:00:00`.
- "FIRST FIND!" popup center-top with plant icon, plant name, "JUNGLE INDEX X OF 13".

**Lobby HUD (see 01, 05):** left column buttons (Gift timer, Shop, Pets, Spin, Rewards, Classes, Settings),
right side currency bars (Gems, Coins, Tickets) with green "+" buttons, "2X GEMS" badge, chapter countdown, big green PLAY button bottom center.

---

## 5. Core Systems

### 5.1 Grass Grid System (most important)
- Map ground is a grid of **cells (0.5 m)**. Each cell: `{ plantType, hp, alive }`.
- Each plant type has: `hp`, `bladesYield`, `minToolTier`, `cashValue`, `gemChance`, mesh, color.
- Render: per chunk, one InstancedMesh per plant type. Cutting a cell → set its instance matrix scale to 0
  and spawn stubble + leaf particles.
- Cutting: while mouse held, every `swingInterval / swingSpeedMultiplier` seconds, damage all cells within a
  **forward arc** (radius = tool.range, angle = tool.arc). Damage = `tool.damage + sharpness`.
- If plant `minToolTier > tool.tier` → no damage, show "Need better tool" hint.
- Cell destroyed → add `bladesYield` to bag (stop at capacity). Bag full → cutting still clears? **No**: bag full blocks cutting and shows Step 2 banner + arrows.
- `clearPercent = clearedCells / totalCuttableCells` (per current zone).
- Store alive state as a `Uint8Array` bitset (for network sync).

### 5.2 Bag & Grinder
- Bag capacity from Backpack upgrade level. Count turns red when full.
- Walk into grinder trigger zone → animate grass flying into hopper, convert `bag * value` → cash, coins pop out.
- Ground arrows + dashed path to grinder appear only when bag is full.

### 5.3 Tools (hotbar slot 1)
Sickle (tier 1) → Machete (tier 2, $3) → Shears (tier 3) → Weed Bomb (consumable AoE clear).
First-person viewmodel with swing animation (see 02, 18).

### 5.4 Upgrades panel (TAB)
Four cards, 10 levels each: Backpack (capacity), Sharpness (+blades/swing), Swing Speed (×), Legs (walk speed).
Card shows icon, current value, 10 dots for level, price button (green if affordable, grey if not).
Bottom row: Jungle Index — 13 slots, silhouette until found.

### 5.5 Camps & Gates
Each chapter = sequence of zones: Camp 1 → grass zone → gate → Camp 2 → … → Exit.
Gate opens by paying "NEXT CAMP $X". Exit reached → run complete screen with time + rewards.

### 5.6 Objectives & Tutorial
- 6-step tutorial banner: 1 Hold click to cut / 2 Bag full, follow arrows / 3 Sell & buy Machete / 4 … / 5 Press TAB, buy upgrade / 6 …
- Objectives list (3 at a time) with cash rewards; next objective replaces completed one.
- Secret stashes: hidden pickups (+cash/+gems), with sparkle.

### 5.7 Jungle Index
13 plant types per chapter. First cut of a new type → "FIRST FIND!" popup. Persistent per player.
Diamond Plant gives gems.

### 5.8 Shop stands (monetization placeholders)
Ride On Mower (20 s drivable mower clearing a wide path), 2X Cash, Infinite Bag, Nuke (clear radius), Money Box.
Priced in **gems** (no real money). Buttons open a confirm modal.

### 5.9 Cutscenes
Letterbox (black bars top/bottom), dialogue bottom center "YOU <text>" (YOU in yellow), typewriter reveal,
Skip button (ENTER). Intro: plane cabin → engine dies → jump → parachute over canopy → land at Camp 1.
Story beat mid-run: camera pans to huge paw prints in cut grass.

### 5.10 Lobby & Matchmaking
- Lobby hub with 8 party pads. Walk into a free pad → Maps modal:
  Chapters (Lost Canopy, Bamboo Gorge, Sunken Temple, Alien Crash Site, Fire Mountain; locked until previous escaped),
  Daily Expedition card (modifier, e.g. Light Pack = half bag; daily top times), Players 1–4, Friends Only,
  Easy/Hard, START. Pad shows "N of 4". Countdown when full or host presses start → RunRoom.
- Leaderboards: Grass Cut (total), Escapees, Best Times.

### 5.11 Multiplayer (Colyseus)
- RunRoom: shared grass bitset, shared clear %, individual bag/cash/upgrades/tools.
- Client predicts cuts locally, sends `cut { cellIds[] }` at most 10×/s. Server validates distance + rate,
  applies, broadcasts cleared cells as compact diffs.
- Players see each other (simple Roblox-style blocky avatar) and their swings.

---

## 6. Balance (put in `/config/balance.ts`)

```ts
grass.tallGrass   = { hp: 1, blades: 1, value: 0.014, tier: 1 }
bag.levels        = [150, 225, 300, 400, 475, 600, 750, 900, 1100, 1300]
upgrades.backpack = { base: 3, growth: 1.6 }
upgrades.sharpness= { base: 4, growth: 1.7 }
upgrades.swing    = { base: 5, growth: 1.7, stepMult: 0.1 }
upgrades.legs     = { base: 3, growth: 1.5, baseSpeed: 19, step: 1.5 }
tools.machete     = { price: 3, tier: 2 }
gates.camp2       = 15
objectives        = [{ text: "Grind grass 0 of 150", reward: 1 }, { text: "Buy a Machete", reward: 1 },
                     { text: "Press TAB to upgrade your Backpack", reward: 1.5 }, { text: "Buy a Weed Bomb", reward: 5 },
                     { text: "Find a secret stash", reward: 2 }]
```
Tune so Camp 1 → Camp 2 takes ~5–7 minutes for a new player.

---

## 7. Working rules for you (Claude Code)

- Integrate the platform SDK exactly as `/docs/SDK.md` describes (init, player identity, saves/currency, ads/purchases if any).

- Build in the phases listed in `PROMPTS.md`. Finish and test one phase before the next.
- After each phase: run the dev server, check no console errors, and list what to compare against which screenshot.
- Never hardcode balance numbers outside `/config`.
- Keep files < 300 lines; split systems.
- If a performance rule conflicts with visual fidelity, performance wins — tell me what you simplified.
