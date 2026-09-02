// Item & event decks for VHS: Video Horror Story.
// Every item belongs to at least one "kit" needed to end the game:
//   escape -> car_keys + gas_can + tool_kit (repair the car), driven from Main Street
//   kill   -> a weapon item, used while sharing a location with the Slasher
//   banish -> ritual_candle + occult_book + cursed_tape, used at Twisted Castle

export const ITEMS = {
  car_keys: { id: "car_keys", name: "Car Keys", flavor: "Still on the park manager's keyring.", kit: "escape" },
  gas_can: { id: "gas_can", name: "Gas Can", flavor: "Just enough to get down the road.", kit: "escape" },
  tool_kit: { id: "tool_kit", name: "Tool Kit", flavor: "Enough to get that engine running again.", kit: "escape" },
  machete: { id: "machete", name: "Rusty Machete", flavor: "Park maintenance never returned this.", kit: "kill", weapon: true, bonus: 25, durability: 3 },
  shotgun: { id: "shotgun", name: "Shotgun", flavor: "One shell left. Make it count.", kit: "kill", weapon: true, bonus: 35, durability: 1 },
  fireaxe: { id: "fireaxe", name: "Fire Axe", flavor: "Behind glass marked EMERGENCY ONLY.", kit: "kill", weapon: true, bonus: 20, durability: 2 },
  ritual_candle: { id: "ritual_candle", name: "Black Candle", flavor: "Wax the color of a bruise.", kit: "banish" },
  occult_book: { id: "occult_book", name: "Occult Book", flavor: "The pages describe how it got out — and how to send it back.", kit: "banish" },
  cursed_tape: { id: "cursed_tape", name: "Cursed VHS Tape", flavor: "Static crawls across the label.", kit: "banish" },
  flashlight: { id: "flashlight", name: "Flashlight", flavor: "Cuts through the dark. Improves your searching.", utility: "search_bonus" },
  first_aid: { id: "first_aid", name: "First Aid Kit", flavor: "Patches you up — or brings someone back.", utility: "heal" },
  energy_drink: { id: "energy_drink", name: "Energy Drink", flavor: "Warm, flat, and definitely past its date. Drink it anyway.", utility: "sanity", sanityAmount: 1 },
  cassette_player: { id: "cassette_player", name: "Cassette Player", flavor: "Warped tape, but the mixtape still plays.", utility: "sanity", sanityAmount: 1 },
  family_photo: { id: "family_photo", name: "Family Photo", flavor: "Creased at the corners from being carried everywhere.", utility: "sanity", sanityAmount: 1, noMonsterHere: true },
  favorite_vhs: { id: "favorite_vhs", name: "Favorite VHS", flavor: "You've watched this a hundred times. It still helps.", utility: "sanity", sanityAmount: 2, noMonsterHere: true },
  canvas_bag: { id: "canvas_bag", name: "Canvas Bag", flavor: "More room to carry what you find.", utility: "capacity", capacityBonus: 2 },
};

// Search pools: weighted lists of item ids (or null for "nothing").
const POOLS = {
  light: ["flashlight", null, null, "first_aid", "energy_drink", "cassette_player", "family_photo", "canvas_bag", null],
  medium: ["car_keys", "gas_can", "tool_kit", "ritual_candle", null, "first_aid", "energy_drink", "favorite_vhs", "canvas_bag", null],
  heavy: ["machete", "shotgun", "fireaxe", "occult_book", "cursed_tape", "canvas_bag", null],
};

// Returns a fresh copy of the item so mutable per-instance state (like a
// weapon's remaining durability) never corrupts the shared item definition.
export function drawFromPool(poolName, rng = Math.random) {
  const pool = POOLS[poolName] ?? POOLS.light;
  const pick = pool[Math.floor(rng() * pool.length)];
  return pick ? { ...ITEMS[pick] } : null;
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
