// Mirrors server/src/characters.js — used so the How to Play panel and pick
// cards work even before connecting to a room (the live game state also
// sends this same data once a room exists).
export const TEEN_CHARACTERS = {
  leader: {
    id: "leader",
    name: "The Leader",
    icon: "🧭",
    tagline: "Keeps everyone together and on task.",
    stats: { health: 2, speed: 1, stealth: 1, strength: 1 },
    ability: "Rally — your Comfort action restores extra Sanity, and you're better at finding objective items (Escape/Banish kit) while searching.",
  },
  athlete: {
    id: "athlete",
    name: "The Athlete",
    icon: "🏈",
    tagline: "Faster and stronger than anyone else at camp.",
    stats: { health: 3, speed: 2, stealth: 1, strength: 3 },
    ability: "Built Different — hits harder in a fight, moves two locations at once, and shrugs off failed escape attempts without getting hurt.",
  },
  nerd: {
    id: "nerd",
    name: "The Nerd",
    icon: "🤓",
    tagline: "Knows more about the occult than anyone should.",
    stats: { health: 2, speed: 1, stealth: 2, strength: 1 },
    ability: "Quick Study — can perform the banishing ritual with only 2 of the 3 relics, and searches more thoroughly.",
  },
  rebel: {
    id: "rebel",
    name: "The Rebel",
    icon: "🖤",
    tagline: "Not afraid to get the Monster's attention.",
    stats: { health: 2, speed: 1, stealth: 3, strength: 2 },
    ability: "Distraction — excellent at slipping away, and draws the Monster's focus away from more vulnerable teammates.",
  },
};

export const KILLERS = {
  stalker: {
    id: "stalker",
    name: "The Stalker",
    icon: "🔪",
    tagline: "Slow. Silent. Never stops.",
    ability: "Relentless — hits harder the longer it stalks a target, escape attempts against it are less likely to work, and it can shortcut straight to any teen it's tracking.",
    attackBase: 32,
    stalkBonus: 18,
  },
  thing: {
    id: "thing",
    name: "The Thing",
    icon: "🛸",
    tagline: "It could be anyone. It could be anything.",
    ability: "Mimicry — stays hidden in plain sight until it strikes, and a successful attack is devastating.",
    attackBase: 24,
    stalkBonus: 12,
  },
};

export const STAT_LABELS = [
  { key: "health", label: "HP", icon: "❤️" },
  { key: "speed", label: "Speed", icon: "👟" },
  { key: "stealth", label: "Stealth", icon: "🥷" },
  { key: "strength", label: "Strength", icon: "💪" },
];
