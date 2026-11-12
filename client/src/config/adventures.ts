/** One mini adventure per area, each given by a character in the camp before it. */
export type AdventureId = "luggage" | "monkey" | "frogs" | "lanterns" | "monkeyKing" | "butterflies";

export type NpcLook =
  | "pilot" | "professor" | "frog" | "monk" | "monkeyKing" | "botanist"
  // Misty Gorge (chapter 2)
  | "ranger" | "climber" | "yodeler" | "fogWitch" | "gorillaChief" | "collector";

export interface AdventureDef {
  id: AdventureId;
  /** Zone the adventure happens in (its giver stands in the camp before it). */
  zone: number;
  icon: string;
  title: string;
  npc: { name: string; look: NpcLook };
  /** Dialogue when you first talk (last line starts the adventure). */
  intro: string[];
  /** What the giver says while you're on it. */
  reminder: string;
  /** Said when you finish. */
  done: string;
  /** Items to find / catch / light (monkey: 1 compass). */
  count: number;
  reward: number;
  /** Must you walk back to the giver to finish? */
  turnIn: boolean;
  /** Seconds (butterflies only). */
  timeLimit?: number;
}

export const ADVENTURES: AdventureDef[] = [
  {
    id: "luggage",
    zone: 0,
    icon: "🧳",
    title: "Lost Luggage",
    npc: { name: "Captain Rusty", look: "pilot" },
    intro: [
      "You made it down too! Captain Rusty, Jungle Air. Sorry about the... emergency exit.",
      "My poor plane flew on without us. It came down way out past the jungle. We'll find it!",
      "Small problem: the suitcases flew out over the Meadow. Including MY lucky socks.",
      "Cut through the grass, find 4 suitcases and bring them back. I'll pay you!",
    ],
    reminder: "Suitcases are hiding in the tall grass of the Meadow. Follow the little stars!",
    done: "MY SOCKS! They still smell like adventure. Here, you earned this!",
    count: 4,
    reward: 4,
    turnIn: true,
  },
  {
    id: "monkey",
    zone: 1,
    icon: "🐒",
    title: "Cheeky Monkey",
    npc: { name: "Professor Fern", look: "professor" },
    intro: [
      "Psst! Professor Fern, jungle scientist. A monkey just stole my golden compass!",
      "He's somewhere in Fern Gully, laughing at me. Chase him and bonk him 2 times!",
    ],
    reminder: "That cheeky monkey is in Fern Gully. He's fast, but you're faster!",
    done: "My compass! ...It's sticky. Why is it sticky? Never mind. Thank you!",
    count: 1,
    reward: 6,
    turnIn: true,
  },
  {
    id: "frogs",
    zone: 2,
    icon: "🐸",
    title: "Frog Choir",
    npc: { name: "DJ Croak", look: "frog" },
    intro: ["Yo yo! DJ Croak in the house. My frog choir hopped off into the reeds, man.", "Find all 5 singers. Follow the music notes and listen for the ribbits!"],
    reminder: "Still missing singers! Look for the floating music notes in Reed Marsh.",
    done: "The band is BACK! Ribbit-ribbit-RIBBIT! That's the best concert ever!",
    count: 5,
    reward: 8,
    turnIn: false,
  },
  {
    id: "lanterns",
    zone: 3,
    icon: "🏮",
    title: "Ancient Lanterns",
    npc: { name: "Monk Lumi", look: "monk" },
    intro: ["Shh... the four spirit lanterns in the bamboo have gone dark.", "Light each one (E). When all four glow, the spirits will reward you."],
    reminder: "Find the dark lanterns in Bamboo Grove. Look for the blue spirit wisps.",
    done: "The spirits are happy! Their gift is yours, friend.",
    count: 4,
    reward: 12,
    turnIn: false,
  },
  {
    id: "monkeyKing",
    zone: 4,
    icon: "👑",
    title: "Monkey King's Feast",
    npc: { name: "Monkey King", look: "monkeyKing" },
    intro: ["HRRRM! I am the MIGHTY MONKEY KING! Bow before my... rumbling tummy.", "Bring me 6 BANANAS from the grove! (please)"],
    reminder: "BANANAS! The palms in Banana Grove have them. I'm STARVING over here!",
    done: "OOH OOH AH AH! *does a royal banana dance* Take my royal treasure!",
    count: 6,
    reward: 15,
    turnIn: true,
  },
  {
    id: "butterflies",
    zone: 5,
    icon: "🦋",
    title: "Butterfly Catch",
    npc: { name: "Bea the Botanist", look: "botanist" },
    intro: ["Oh my, oh my! The golden butterflies are out, but only for a moment!", "Run into 6 of them in 90 seconds. Ready? GO GO GO!"],
    reminder: "Catch the golden butterflies over Flower Hollow before time runs out!",
    done: "Magnificent! The rarest collection in the whole jungle. Thank you!",
    count: 6,
    reward: 20,
    turnIn: false,
    timeLimit: 90,
  },
];

export const ADVENTURE_RULES = {
  talkRadius: 3.2,
  pickupRadius: 1.6,
  butterflyCatchRadius: 2.2,
  /** Marker height above an item (above even bamboo). */
  markerHeight: 4.3,
  seed: 8080,
  /** Confetti burst size (LOW / higher). */
  confettiLow: 30,
  confetti: 70,
};
