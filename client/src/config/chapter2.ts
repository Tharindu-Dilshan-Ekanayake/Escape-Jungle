import type { ZoneDef } from "./zones1";
import type { AdventureDef } from "./adventures";
import type { ChapterData } from "./chapters";

const H = Math.PI / 2;

/**
 * Chapter 2: MISTY GORGE. A foggy bamboo gorge: the path winds N/W/N/E/N/E
 * through bigger areas with tougher plants (most need a better tool), more of
 * the area to clear before a gate opens, and shorter days. Ends at Rescue
 * Ridge, where the helicopter waits. Same base / outpost systems as chapter 1.
 */
const ZONES: ZoneDef[] = [
  {
    id: "mistFerns", name: "Foggy Ferns", plantId: 7, tree: "treeFern", innerTrees: 6, floor: "#4e5a3c",
    rect: { minX: -12, maxX: 12, minZ: -64, maxZ: -14 },
    corridor: { minX: -3, maxX: 3, minZ: -15, maxZ: -9 },
    exit: { minX: -3.5, maxX: 3.5, minZ: -74, maxZ: -63 },
    gate: { x: 0, z: -67.5, rotY: 0, width: 7 },
    base: { x: 0, z: -79, r: 10.5, name: "Ranger Hut" },
  },
  {
    id: "ravine", name: "Rope Bridge Ravine", plantId: 8, tree: "mangrove", innerTrees: 6, floor: "#4a4636",
    rect: { minX: -52, maxX: -18, minZ: -96, maxZ: -62 },
    corridor: { minX: -19, maxX: -6, minZ: -83, maxZ: -75 },
    exit: { minX: -63, maxX: -51, minZ: -83, maxZ: -75 },
    gate: { x: -55, z: -79, rotY: H, width: 8 },
    base: { x: -68, z: -79, r: 10.5, name: "Cliff Camp" },
  },
  {
    id: "ironBamboo", name: "Iron Bamboo", plantId: 9, tree: "bambooClump", innerTrees: 4, floor: "#56502e",
    rect: { minX: -85, maxX: -51, minZ: -132, maxZ: -98 },
    corridor: { minX: -72, maxX: -64, minZ: -99, maxZ: -86 },
    exit: { minX: -71.5, maxX: -64.5, minZ: -142, maxZ: -131 },
    gate: { x: -68, z: -135.5, rotY: 0, width: 7 },
    base: { x: -68, z: -147, r: 10.5, name: "Bamboo Watch" },
  },
  {
    id: "ghostGrass", name: "Ghost Grass Flats", plantId: 10, tree: "broadleaf", innerTrees: 6, floor: "#5a5440",
    rect: { minX: -52, maxX: -18, minZ: -164, maxZ: -130 },
    corridor: { minX: -58, maxX: -51, minZ: -151, maxZ: -143 },
    exit: { minX: -19, maxX: -6, minZ: -151, maxZ: -143 },
    gate: { x: -15, z: -147, rotY: H, width: 8 },
    base: { x: 0, z: -147, r: 10.5, name: "Old Mill" },
  },
  {
    id: "bananaFalls", name: "Banana Falls", plantId: 12, tree: "bananaPalm", innerTrees: 6, floor: "#5c4a2c",
    rect: { minX: -17, maxX: 17, minZ: -198, maxZ: -164 },
    corridor: { minX: -4, maxX: 4, minZ: -165, maxZ: -152 },
    exit: { minX: -3.5, maxX: 3.5, minZ: -208, maxZ: -197 },
    gate: { x: 0, z: -201.5, rotY: 0, width: 7 },
    base: { x: 0, z: -213, r: 10.5, name: "Waterfall Camp" },
  },
  {
    id: "thorns", name: "Thorn Thicket", plantId: 11, tree: "blossom", innerTrees: 6, floor: "#4f3f30",
    rect: { minX: 18, maxX: 52, minZ: -230, maxZ: -196 },
    corridor: { minX: 6, maxX: 19, minZ: -217, maxZ: -209 },
    exit: { minX: 51, maxX: 63, minZ: -217, maxZ: -209 },
    gate: { x: 55, z: -213, rotY: H, width: 8 },
    base: { x: 68, z: -213, r: 10, name: "Rescue Ridge" },
  },
];

const ADVENTURES: AdventureDef[] = [
  {
    id: "luggage", zone: 0, icon: "🎒", title: "Lost Supplies",
    npc: { name: "Ranger Moss", look: "ranger" },
    intro: [
      "Another lost explorer? Ranger Moss. Welcome to Misty Gorge... watch your step.",
      "The fog rolled in and my supply packs went tumbling into the ferns.",
      "Find all 5 packs out there and bring them back. The gorge gets meaner further in!",
    ],
    reminder: "My supply packs are hidden in the Foggy Ferns. Look for the little stars in the mist.",
    done: "Rope, lanterns, snacks... we might survive this place after all. Here, take this!",
    count: 5, reward: 8, turnIn: true,
  },
  {
    id: "monkey", zone: 1, icon: "🐒", title: "Bridge Bandit",
    npc: { name: "Climber Kip", look: "climber" },
    intro: [
      "Hey! Climber Kip. The gorge monkeys are cheeky little thieves. One stole my bridge map!",
      "He's swinging round Rope Bridge Ravine. Chase him down and bonk him!",
    ],
    reminder: "The bandit monkey is in Rope Bridge Ravine. Corner him against the cliffs!",
    done: "My map! Now I know which bridges are safe... mostly. Thank you!",
    count: 1, reward: 10, turnIn: true,
  },
  {
    id: "frogs", zone: 2, icon: "🐸", title: "Echo Frogs",
    npc: { name: "Old Yodel", look: "yodeler" },
    intro: ["Yo-de-lay-hee-hoo! Old Yodel. My echo frogs sing back every yodel... but they hopped into the bamboo.", "Find all 6 of them. Follow the floating notes!"],
    reminder: "Still missing frogs! Look for the music notes in the Iron Bamboo.",
    done: "Yo-de-LAY! Listen to them echo! The gorge sings again!",
    count: 6, reward: 12, turnIn: false,
  },
  {
    id: "lanterns", zone: 3, icon: "🏮", title: "Fog Lanterns",
    npc: { name: "Granny Fog", look: "fogWitch" },
    intro: ["Hee hee... Granny Fog, dearie. My fog spirits are restless: five lanterns on the flats have gone out.", "Light each one (E). Only then will the mist part for you."],
    reminder: "Find the dark lanterns on the Ghost Grass Flats. Follow the blue wisps.",
    done: "The mist bows to you. Take the spirits' gift.",
    count: 5, reward: 16, turnIn: false,
  },
  {
    id: "monkeyKing", zone: 4, icon: "👑", title: "Chief Bongo's Feast",
    npc: { name: "Chief Bongo", look: "gorillaChief" },
    intro: ["HOO HOO! Chief Bongo, ruler of the falls. My troop is HUNGRY and my belly is grumbling.", "Bring me 8 BANANAS from the palms round Banana Falls!"],
    reminder: "BANANAS! The palms round Banana Falls are heavy with them!",
    done: "HOO HOO HAA! A feast for the whole troop! Take the chief's treasure!",
    count: 8, reward: 20, turnIn: true,
  },
  {
    id: "butterflies", zone: 5, icon: "🦋", title: "Thorn Butterflies",
    npc: { name: "Netty the Collector", look: "collector" },
    intro: ["The rare thorn butterflies only fly in the fog... and they're FAST.", "Catch 8 of them in 80 seconds. Mind the thorns!"],
    reminder: "Catch the golden butterflies over the Thorn Thicket before time runs out!",
    done: "Incredible! Nobody has ever caught that many. You're a legend!",
    count: 8, reward: 26, turnIn: false, timeLimit: 80,
  },
];

/** Chapter 2 from chapter 1's data: what changes. */
export function chapter2(ch1: ChapterData): ChapterData {
  return {
    zones: ZONES,
    adventures: ADVENTURES,
    // Harder: more of each area to clear, shorter days, longer nights.
    clearToOpen: 0.85,
    cycle: { day: 140, dusk: 22, night: 110, dawn: 20 },
    light: {
      // Cold blue-grey mist.
      day: { ...ch1.light.day, hemiSky: "#9fb4c0", hemiGround: "#2c3a30", hemi: 1.0, sun: "#e8f0ff", sunI: 1.25, fog: "#6d808a", sky: "#a9bcc6" },
      dusk: { ...ch1.light.dusk, hemiSky: "#a88a9a", fog: "#5e5662", sky: "#c98f8a" },
      night: { ...ch1.light.night },
    },
    fogStartRatio: 0.45,
    intro: false,
    startNote: "🌫️ Misty Gorge: the fog hides the way. Find Ranger Moss at the camp!",
    campName: "Gorge Camp",
  };
}
