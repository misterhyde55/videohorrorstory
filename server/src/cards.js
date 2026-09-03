// Item & event decks for VHS: Video Horror Story.
// Every item belongs to at least one "kit" needed to end the game:
//   escape -> car_keys (the only required one) + repair the car (free, but
//             quieter with a tool_kit) + drive away from the exit; gas_can
//             is optional, just worth a small bonus
//   kill   -> a weapon item, used while sharing a location with the Slasher
//   banish -> ritual_candle + occult_book + cursed_tape, used at the ritual site

// Every item now carries a small structured info block on top of its
// flavor/effect prose, so the client can render a real spec sheet (name,
// category, exact effect, uses, noise, objective status) instead of
// leaving the player to guess what picking something up is actually worth:
//   category: Objective | Weapon | Healing | Utility | Sanity
//   uses: a number, "Passive" (works just by being carried), "Instant"
//         (applies the moment it's found), or "Objective" (consumed by
//         its objective action, not a manual Use)
//   noise: None | Quiet | Loud
//   objective: true if it's required (or a component of a required kit)
export const ITEMS = {
  car_keys: { id: "car_keys", name: "Car Keys", icon: "🔑", category: "Objective", flavor: "Still on the park manager's keyring.", effect: "Required to Drive Away once the car's repaired. The only item escape actually needs.", uses: "Objective", noise: "None", objective: true, kit: "escape" },
  gas_can: { id: "gas_can", name: "Gas Can", icon: "⛽", category: "Utility", flavor: "Just enough to get down the road.", effect: "Optional — carry one when you drive away for extra peace of mind (+12 bonus Sanity on escape instead of +10).", uses: "Objective", noise: "None", objective: false, kit: "escape" },
  tool_kit: { id: "tool_kit", name: "Tool Kit", icon: "🧰", category: "Utility", flavor: "Enough to get that engine running again.", effect: "Optional — repairing the car works without one, but a Tool Kit does it silently (no Noise).", uses: "Objective", noise: "None", objective: false, kit: "escape" },
  machete: { id: "machete", name: "Rusty Machete", icon: "🔪", category: "Weapon", flavor: "Park maintenance never returned this.", effect: "+25% Fight chance. Wears out and breaks after a few hits.", uses: 3, noise: "Loud", objective: false, kit: "kill", weapon: true, bonus: 25, durability: 3 },
  shotgun: { id: "shotgun", name: "Shotgun", icon: "🔫", category: "Weapon", flavor: "One shell left. Make it count.", effect: "+35% Fight chance. Breaks after one hit — make it count.", uses: 1, noise: "Loud", objective: false, kit: "kill", weapon: true, bonus: 35, durability: 1 },
  fireaxe: { id: "fireaxe", name: "Fire Axe", icon: "🪓", category: "Weapon", flavor: "Behind glass marked EMERGENCY ONLY.", effect: "+20% Fight chance. Wears out and breaks after a couple hits.", uses: 2, noise: "Loud", objective: false, kit: "kill", weapon: true, bonus: 20, durability: 2 },
  ritual_candle: { id: "ritual_candle", name: "Black Candle", icon: "🕯️", category: "Objective", flavor: "Wax the color of a bruise.", effect: "Banish kit — gather all three (or two, as the Nerd), then perform the ritual at the ritual site. Consumed when you do.", uses: "Objective", noise: "None", objective: true, kit: "banish" },
  occult_book: { id: "occult_book", name: "Occult Book", icon: "📖", category: "Objective", flavor: "The pages describe how it got out — and how to send it back.", effect: "Banish kit — gather all three (or two, as the Nerd), then perform the ritual at the ritual site. Consumed when you do.", uses: "Objective", noise: "None", objective: true, kit: "banish" },
  cursed_tape: { id: "cursed_tape", name: "Cursed VHS Tape", icon: "📼", category: "Objective", flavor: "Static crawls across the label.", effect: "Banish kit — gather all three (or two, as the Nerd), then perform the ritual at the ritual site. Consumed when you do.", uses: "Objective", noise: "None", objective: true, kit: "banish" },
  flashlight: { id: "flashlight", name: "Flashlight", icon: "🔦", category: "Utility", flavor: "Cuts through the dark. Improves your searching.", effect: "While carried, a Search that would come up empty gets one automatic reroll.", uses: "Passive", noise: "Quiet", objective: false, utility: "search_bonus" },
  first_aid: { id: "first_aid", name: "Medkit", icon: "🩹", category: "Healing", flavor: "Patches you up — or brings someone back.", effect: "Restores you to full Health, or revives a fallen teammate at 1 HP.", uses: 1, noise: "Quiet", objective: false, utility: "heal" },
  energy_drink: { id: "energy_drink", name: "Monster Energy", icon: "🥤", category: "Sanity", flavor: "A quick hit of caffeine keeps you moving and focused.", effect: "Restores 10 Sanity and grants +1 Movement this turn. Safe to drink even with the Slasher right there.", uses: 1, noise: "Quiet", objective: false, utility: "sanity", sanityAmount: 10, moveBonus: 1 },
  cassette_player: { id: "cassette_player", name: "Favorite Cassette", icon: "📻", category: "Sanity", flavor: "For a moment, the music drowns out the nightmare.", effect: "Restores 25 Sanity.", uses: 1, noise: "Quiet", objective: false, utility: "sanity", sanityAmount: 25 },
  family_photo: { id: "family_photo", name: "Family Photo", icon: "🖼️", category: "Sanity", flavor: "A reminder of home helps you regain control.", effect: "Restores 20 Sanity. Can't use with the Slasher right there.", uses: 1, noise: "Quiet", objective: false, utility: "sanity", sanityAmount: 20, noMonsterHere: true },
  favorite_vhs: { id: "favorite_vhs", name: "Personal Item", icon: "📼", category: "Sanity", flavor: "You've watched this a hundred times. It still helps — more than you'd expect.", effect: "Restores 30 Sanity. Rare. Can't use with the Slasher right there.", uses: 1, noise: "Quiet", objective: false, utility: "sanity", sanityAmount: 30, noMonsterHere: true },
  canvas_bag: { id: "canvas_bag", name: "Canvas Bag", icon: "🎒", category: "Utility", flavor: "More room to carry what you find.", effect: "Permanently expands your inventory by 2, the moment you find it.", uses: "Instant", noise: "None", objective: false, utility: "capacity", capacityBonus: 2 },
};

// Search pools: weighted lists of item ids (or null for "nothing"). Car
// Keys gets extra weight in both pools — it's the one item Escape actually
// requires, so it needs to turn up often enough that "find the keys" is a
// realistic couple of searches, not a long scavenger hunt.
const POOLS = {
  light: ["flashlight", "car_keys", null, "first_aid", "energy_drink", "cassette_player", "family_photo", "canvas_bag", null],
  medium: ["car_keys", "car_keys", "gas_can", "tool_kit", "ritual_candle", null, "first_aid", "energy_drink", "favorite_vhs", "canvas_bag", null],
  heavy: ["machete", "shotgun", "fireaxe", "occult_book", "cursed_tape", "canvas_bag", null],
};

// Returns a fresh copy of the item so mutable per-instance state (like a
// weapon's remaining durability) never corrupts the shared item definition.
export function drawFromPool(poolName, rng = Math.random) {
  const pool = POOLS[poolName] ?? POOLS.light;
  const pick = pool[Math.floor(rng() * pool.length)];
  return pick ? { ...ITEMS[pick] } : null;
}

// Diminishing-returns odds for the Search Discovery system, keyed by how
// many times a location has already been searched (by anyone — the count
// lives on the location, not the player). Index 0 = 1st search, 1 = 2nd,
// 2 = 3rd and every search after that. This is the sole anti-farming lever:
// nothing gets better the more a spot is picked over, but nothing is ever
// permanently exhausted either — see gameState.js's "search" handler.
export const SEARCH_ODDS = [
  { item: 0.70, clue: 0.15, vhs: 0.05, nothing: 0.10 },
  { item: 0.45, clue: 0.15, vhs: 0.05, nothing: 0.35 },
  { item: 0.25, clue: 0.10, vhs: 0.05, nothing: 0.60 },
];

export function pickSearchOutcome(searchCount, rng = Math.random) {
  const tier = SEARCH_ODDS[Math.min(searchCount, SEARCH_ODDS.length - 1)];
  const r = rng();
  let acc = 0;
  for (const outcome of Object.keys(tier)) {
    acc += tier[outcome];
    if (r < acc) return outcome;
  }
  return "nothing";
}

// Non-item discoveries: informational, take no inventory space, and get
// auto-recorded the moment they're found. Clues are little templates so
// they can at least gesture at the specific spot they turned up — not the
// full bespoke per-location loot table the design doc sketches, but real
// location texture rather than one generic string everywhere.
const CLUE_TEMPLATES = [
  (loc) => `A torn page describes something moving near ${loc.name} after dark.`,
  (loc) => `Scratches gouge the inside of a door here — something wanted out, or in.`,
  (loc) => `A hand-drawn map marks ${loc.name} with a red X and nothing else.`,
  (loc) => `Muddy boot prints lead away from here in a hurry, and don't come back.`,
  (loc) => `A journal page: "Don't go near ${loc.name} alone. Not after what happened."`,
  (loc) => `Something's been dragged across the floor here recently.`,
  (loc) => `A phone number is scrawled on the wall, half scratched out.`,
  (loc) => `Claw marks rake up one whole wall, well above head height.`,
];

export function drawClue(loc, rng = Math.random) {
  const make = CLUE_TEMPLATES[Math.floor(rng() * CLUE_TEMPLATES.length)];
  return make(loc);
}

// Lore VHS tapes — a distinct discovery from the physical Favorite VHS
// item (which is a carried Sanity item). These are found footage: pure
// worldbuilding, recorded into the location's discoveredInformation and
// never picked up.
export const VHS_LORE = [
  "A home movie: kids laughing around a campfire, decades ago. The tape cuts to static halfway through.",
  "A grainy recording shows the park under construction. A voice off-camera says something you can't quite make out.",
  "Someone recorded themselves reading from an old book. Their voice shakes on the last page.",
  "A local news clip about a disappearance nobody ever solved.",
  "A birthday party tape. Everyone in frame is smiling except one figure at the edge of the shot.",
  "Home security footage, timestamped last year. Something walks past the camera on two legs, slowly.",
];

export function drawLore(rng = Math.random) {
  return VHS_LORE[Math.floor(rng() * VHS_LORE.length)];
}

export const EVENTS = [
  { id: "creaking_floor", text: "A floorboard creaks somewhere behind you." },
  { id: "distant_scream", text: "You hear a scream from across the park." },
  { id: "power_flicker", text: "The lights flicker and die for a moment." },
  { id: "static", text: "Static hisses from a nearby TV, though it isn't plugged in." },
];

export function randomEvent(rng = Math.random) {
  return EVENTS[Math.floor(rng() * EVENTS.length)];
}

export const HALLUCINATIONS = [
  "You think you see it standing in the doorway. You blink — nothing's there.",
  "A shape moves at the edge of your vision. When you turn, it's gone.",
  "You could swear you just heard your name.",
  "The shadows seem to shift on their own.",
];

export function randomHallucination(rng = Math.random) {
  return HALLUCINATIONS[Math.floor(rng() * HALLUCINATIONS.length)];
}

// Drawn once when a teen's Sanity hits 0 and they become Broken. Flavor
// only — no unique mechanical effect beyond the standard Broken state.
export const TRAUMA_CARDS = [
  { id: "cant_stop_shaking", text: "Can't Stop Shaking — you flinch at every sound for the rest of the night." },
  { id: "thousand_yard_stare", text: "Thousand-Yard Stare — you keep seeing it, even when it isn't there." },
  { id: "frozen_up", text: "Frozen Up — your hands won't stop trembling." },
  { id: "cold_sweat", text: "Cold Sweat — you can't shake the feeling you're being watched." },
];

export function drawTraumaCard(rng = Math.random) {
  return TRAUMA_CARDS[Math.floor(rng() * TRAUMA_CARDS.length)];
}
