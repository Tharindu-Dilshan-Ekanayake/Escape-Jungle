import { useEffect, useRef, useState } from "react";
import { HUD } from "../../config/hud";
import { STATIONS } from "../../config/economy";
import { buyNextTool, economy } from "../../game/economy/economy";
import { useHud } from "../layout/hudLayout";
import { Hotbar, SaleAndShop, StatusCard, TopButtons, UpgradesButton, openTeamPanel } from "./HudCorners";
import { isBagFull } from "../../game/economy/economy";
import { escape } from "../../game/escape/escape";
import { nearestGrinder } from "../../game/economy/StationSystem";
import { activeZones, cutState } from "../../game/cutting/cutState";
import { currentZoneIndex, progress } from "../../game/progress/progress";
import { GATES, ZONES1 } from "../../config/zones1";
import { RunTimer, RunComplete } from "./RunProgress";
import { DayClock, FindPopup, NightVignette } from "./NightLootHud";
import { Minimap } from "../map/Minimap";
import { loot } from "../../game/loot/loot";
import { anyFireLit, campfires } from "../../game/campfire/campfires";
import { dayNight, formatClock } from "../../game/time/dayNight";
import { nearestOpenFire, nightNear } from "../../game/progress/goal";
import { CAMPFIRE } from "../../config/night";
import { InteractPrompt, SurvivalBars, SurvivalOverlay } from "./SurvivalHud";
import { AdventureCelebration, AdventureTracker, DialogueBox } from "./AdventureHud";
import { survival } from "../../game/survival/survival";
import { SURVIVAL } from "../../config/survival";
import { animals, Kind } from "../../game/animals/animals";
import { AS } from "../../config/animals";

/** Danger first: a jaguar on your trail, then hunger / thirst. "" = all fine. */
function survivalBanner(): string {
  const hunted = animals.list.some((a) => a.kind === Kind.Jaguar && a.state === AS.Stalk && Math.hypot(a.x - player.x, a.z - player.z) < 30);
  if (hunted) return "A jaguar is hunting you! Run to a burning campfire!";
  if (survival.thirst < SURVIVAL.warnBelow) return "You're thirsty! Drink at a water barrel or a spring";
  if (survival.hunger < SURVIVAL.warnBelow) return "You're starving! Eat (F): berries, bananas or cooked meat";
  return "";
}

const BANNER_CLEARED_S = 5;
const BANNER_FIRE_S = 4;

/** Night / firewood banner text, or "" when nothing night-related needs saying. */
function nightBanner(now: number): string {
  if (now < loot.carryFullUntil) return `You can carry ${CAMPFIRE.carryMax} firewood. Bring it to a campfire!`;
  const lit = campfires.lastLit;
  if (lit.index >= 0 && now - lit.at < BANNER_FIRE_S) return "Campfire burning! Animals keep away · cook meat here";
  if (!nightNear() || anyFireLit()) return "";
  if (dayNight.phase === "day") return `Night falls in ${formatClock(dayNight.phaseLeft)}! Gather firewood and light a campfire`;
  if (loot.carried > 0 && nearestOpenFire()) return "Take the firewood to a campfire! (see the map)";
  return "It is dark and the jaguars hunt... find firewood and light a campfire!";
}
import { player } from "../../game/player/FirstPersonController";
import { leaveRun } from "../../net/lobbyConnection";
import { useUiStore } from "../../store/uiStore";
import { useLobbyStore } from "../../store/lobbyStore";
import { sfx } from "../../game/audio/sfx";
import { ClearBar } from "./ClearBar";
import { TutorialCard } from "./TutorialCard";
import { tutorial } from "../../game/tutorial/tutorial";


/** Banner under the clear bar: a gold-rimmed pill with an icon (bag full, need a tool, goals...). Polled. */
function Banner() {
  const box = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let lastKey = "";
    const id = window.setInterval(() => {
      const now = performance.now() / 1000;
      let text = "";
      let ico = "";
      let urgent = false;
      const goal = currentZoneIndex();
      const last = progress.lastOpened;
      const aboard = escape.aboard;
      if (aboard && !escape.active) {
        text = escape.boardedMe
          ? `Aboard! Waiting for ${aboard.waiting.join(", ")} (${aboard.n}/${aboard.total})`
          : `${aboard.n}/${aboard.total} aboard the helicopter: get to the Plane Wreck!`;
        ico = "🚁";
        urgent = true;
      } else if (isBagFull()) {
        text = "Bag full! Follow the arrow to the Grinder";
        ico = "🎒";
        urgent = true;
      } else if (now < cutState.needToolUntil) {
        text = "Need a better tool!";
        ico = "🪓";
        urgent = true;
      } else if ((text = survivalBanner())) {
        ico = "⚠️";
        urgent = true;
      } else if ((text = nightBanner(now))) {
        ico = "🔥";
      } else if (last.index >= 0 && now - last.at < BANNER_CLEARED_S) {
        const next = ZONES1[last.index + 1];
        text = next ? `Area cleared! The gate is open: on to ${next.name}` : "Area cleared! Head to the plane wreck!";
        ico = "🚪";
      } else if (goal >= 0) {
        // Phones: the clear bar at the top already says this.
        const zn = activeZones.list[goal];
        if (zn && useHud.getState().mode === "desktop") text = `Clear ${Math.round(GATES.clearToOpen * 100)}% of ${zn.zone.name} to open the gate · ${Math.floor(zn.field.clearRatio * 100)}%`;
        ico = "🌿";
      } else if (!progress.finished) {
        text = "Every gate is open! Find the plane wreck: the rescue chopper is waiting there";
        ico = "✈️";
      }
      if (tutorial.active && !urgent) text = ""; // the guide card has the spot
      const key = `${ico}|${text}|${urgent}`;
      if (key === lastKey || !box.current || !el.current || !icon.current) return;
      lastKey = key;
      el.current.textContent = text;
      icon.current.textContent = ico;
      box.current.style.display = text ? "flex" : "none";
      box.current.dataset.urgent = urgent ? "1" : "";
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, []);
  const L = useHud((st) => st.banner);
  return (
    <div
      ref={box}
      style={{ display: "none", top: L.top, maxWidth: L.maxWidth, fontSize: L.font }}
      className="hud-banner pointer-events-none fixed left-1/2 z-30 w-max -translate-x-1/2 items-center gap-2 rounded-full border-2 px-4 py-1 text-center font-banner leading-tight text-white"
    >
      <span ref={icon} className="text-[1.15em]" />
      <span ref={el} className="text-outline" />
    </div>
  );
}

/** Gold arrow in a round badge at the top of the screen, pointing at the grinder while the bag is full (with the distance). */
function GrinderArrow() {
  const el = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const top = useHud((st) => st.banner.top);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!el.current || !arrow.current || !dist.current) return;
      const show = isBagFull();
      el.current.style.display = show ? "flex" : "none";
      if (!show) return;
      const g = nearestGrinder(player.x, player.z);
      const dx = g.ix - player.x;
      const dz = g.iz - player.z;
      // Angle of the target relative to where the camera looks (yaw 0 = -Z).
      const rel = Math.atan2(-dx, -dz) - player.yaw;
      arrow.current.style.transform = `rotate(${(-rel * 180) / Math.PI}deg)`;
      dist.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div ref={el} style={{ display: "none", top: top + 44, left: "50%", marginLeft: -34 }} className="hud-bob pointer-events-none fixed z-30 w-[68px] flex-col items-center">
      <div className="grid h-[60px] w-[60px] place-items-center rounded-full border-[3px] border-[#ffd23f] bg-[#1d140c]/75 shadow-[0_0_16px_rgba(255,210,63,0.55)]">
        <svg ref={arrow} viewBox="0 0 48 48" width="40" height="40" style={{ transition: "transform 0.12s linear" }} aria-hidden>
          <defs>
            <linearGradient id="arrow-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff2a8" />
              <stop offset="1" stopColor="#f2a91f" />
            </linearGradient>
          </defs>
          <path d="M24 4 L42 26 L31 26 L31 44 L17 44 L17 26 L6 26 Z" fill="url(#arrow-gold)" stroke="#5a3a12" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </div>
      <span ref={dist} className="mt-1 rounded-full bg-[#1d140c]/75 px-2 font-banner text-xs text-[#ffd23f]" />
    </div>
  );
}

/** Connection dropped: we keep playing and the game reconnects (the seat in the run is held for a minute). */
function Reconnecting() {
  const lost = useLobbyStore((s) => s.status === "connecting");
  if (!lost) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[44%] z-40 w-max max-w-[90vw] -translate-x-1/2 animate-pulse rounded-full border-2 border-[#ffd23f] bg-black/75 px-4 py-1.5 font-lobby text-sm font-bold text-white shadow-lg">
      📶 Connection lost · reconnecting...
    </div>
  );
}

/** Jungle HUD: clear bar, banner, status card, hotbar, upgrades, settings (with Leave; L; never P). */
export function RunHud() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === STATIONS.buyKey && economy.nearShop && buyNextTool()) sfx.equip();
      if (e.code === "KeyL") leaveRun();
      if (e.code === "KeyT") openTeamPanel();
      if (e.code === "Tab") {
        e.preventDefault();
        useUiStore.getState().openPanel("upgrades");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const desktop = useHud((s) => s.mode === "desktop");
  // While the helicopter flies you out: no HUD, just letterbox bars (then the results card).
  const [escaping, setEscaping] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setEscaping(escape.active), 200);
    return () => window.clearInterval(id);
  }, []);
  if (escaping)
    return (
      <>
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[11vh] bg-black" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[11vh] bg-black" />
        <RunComplete />
      </>
    );

  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-white" />
      <ClearBar />
      <Banner />
      <TutorialCard />
      <GrinderArrow />
      <StatusCard />
      <Hotbar />
      {desktop && <UpgradesButton />}
      <SaleAndShop />
      <RunTimer />
      <RunComplete />
      <NightVignette />
      <SurvivalBars />
      <InteractPrompt />
      <SurvivalOverlay />
      <AdventureTracker />
      <DialogueBox />
      <AdventureCelebration />
      <Minimap />
      <DayClock />
      <FindPopup />
      <TopButtons />
      <Reconnecting />
    </>
  );
}
