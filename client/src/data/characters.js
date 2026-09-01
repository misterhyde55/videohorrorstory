// Mirrors server/src/characters.js — used so the How to Play panel works
// even before connecting to a room (the live game state also sends this
// same data once a room exists).
export const TEEN_CHARACTERS = {
  jock: {
    id: "jock",
    name: "The Jock",
    icon: "🏈",
    tagline: "Built different. Fights back hard.",
    ability: "Brawler — +25% chance to land a hit in a fight, and shrugs off failed escape attempts without getting hurt.",
  },
  nerd: {
    id: "nerd",
    name: "The Nerd",
    icon: "🤓",
    tagline: "Read every page of the occult book twice.",
    ability: "Quick Study — can perform the banishing ritual with only 2 of the 3 relics, and searches more thoroughly.",
  },
  cheerleader: {
    id: "cheerleader",
    name: "The Cheerleader",
    icon: "📣",
    tagline: "Fast enough to outrun anything.",
    ability: "Fleet-Footed — far better odds of escaping the Slasher, and can move two locations in a single turn.",
  },
  pothead: {
    id: "pothead",
    name: "The Pothead",
    icon: "🍃",
    tagline: "Somehow always sees it coming.",
    ability: "Sixth Sense — always senses if the Slasher is lurking one location away, and finds a little extra while searching.",
  },
};

export const KILLERS = {
  stalker: {
    id: "stalker",
    name: "The Stalker",
    icon: "🔪",
    tagline: "Slow. Silent. Never stops.",
    ability: "Relentless — hits harder the longer it stalks a target, escape attempts against it are less likely to work, and it can shortcut straight to any teen it's tracking.",
  },
  thing: {
    id: "thing",
    name: "The Thing",
    icon: "🛸",
    tagline: "It could be anyone. It could be anything.",
    ability: "Mimicry — stays hidden in plain sight until it strikes, and a successful attack is devastating.",
  },
};
