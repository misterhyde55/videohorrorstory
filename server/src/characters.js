// Playable teens and killers for VHS: Video Horror Story.
// Ability text here is the source of truth shown to players; the actual
// mechanical effects live in gameState.js. Teen stats (health/sanity/speed/
// stealth/strength) directly drive the fight/flee/move/sanity formulas
// there — see FIGHT_STRENGTH_MULT, FLEE_STEALTH_MULT, etc.

// Each teen also carries an activeAbility — a once-per-turn (or, for the
// Leader, once-per-round) SPECIAL action the player spends an Action Point
// on, distinct from the passive traits in `ability` below. The mechanical
// resolvers live in gameState.js's TEEN_ABILITIES table; this is just the
// player-facing name/description/cost, shown in the UI.
export const TEEN_CHARACTERS = {
  leader: {
    id: "leader",
    name: "The Leader",
    icon: "🧭",
    tagline: "Keeps everyone together and on task.",
    stats: { health: 2, speed: 1, stealth: 1, strength: 1 },
    ability: "Rally — your Comfort action restores extra Sanity, and you're better at finding objective items (Escape/Banish kit) while searching.",
    activeAbility: {
      id: "lets_go",
      name: "Let's Go",
      apCost: 1,
      description: "Once per round: give a teammate at your location 1 bonus Action on their next turn.",
    },
  },
  athlete: {
    id: "athlete",
    name: "The Athlete",
    icon: "🏈",
    tagline: "Faster and stronger than anyone else at the park.",
    stats: { health: 3, speed: 2, stealth: 1, strength: 3 },
    ability: "Built Different — hits harder in a fight, and shrugs off failed escape attempts without getting hurt.",
    activeAbility: {
      id: "sprint",
      name: "Sprint",
      apCost: 1,
      description: "Once per turn: spend 1 Action to move up to 2 spaces at once. Loud — the Killer will hear you coming.",
    },
  },
  nerd: {
    id: "nerd",
    name: "The Nerd",
    icon: "🤓",
    tagline: "Knows more about the occult than anyone should.",
    stats: { health: 2, speed: 1, stealth: 2, strength: 1 },
    ability: "Quick Study — can perform the banishing ritual with only 2 of the 3 relics, and searches more thoroughly.",
    activeAbility: {
      id: "tinker",
      name: "Tinker",
      apCost: 1,
      description: "Once per turn: spend 1 Action to make your very next Interact this turn cost 0 Actions.",
    },
  },
  rebel: {
    id: "rebel",
    name: "The Rebel",
    icon: "🖤",
    tagline: "Not afraid to get the Monster's attention.",
    stats: { health: 2, speed: 1, stealth: 3, strength: 2 },
    ability: "Distraction — excellent at slipping away, and draws the Monster's focus away from more vulnerable teammates.",
    activeAbility: {
      id: "bait",
      name: "Bait",
      apCost: 1,
      description: "Once per turn: spend 1 Action to deliberately make LOUD Noise right where you're standing, pulling the Killer's attention toward you.",
    },
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

export const SPECIAL_COOLDOWN = 3;
