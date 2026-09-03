import { generateBoard } from "./board.js";
import { drawFromPool, randomEvent, randomHallucination, drawTraumaCard, pickSearchOutcome, drawClue, drawLore, drawEvidence, ITEMS } from "./cards.js";
import { TEEN_CHARACTERS, KILLERS, SPECIAL_COOLDOWN } from "./characters.js";

const MAX_TEENS = 4;
const MAX_ITEMS = 6;
const MONSTER_MAX_HP = 3;
const GAME_DURATION_MS = 10 * 60 * 1000;
const TEEN_ACTIONS_PER_TURN = 3;

const FIGHT_BASE = 25;
const FIGHT_STRENGTH_MULT = 10;
const STUN_CHANCE = 50;

const FLEE_BASE = 30;
const FLEE_STEALTH_MULT = 12;
const STALKER_FLEE_PENALTY = 15;

const UNEASY_PENALTY = 5;
const FRIGHTENED_PENALTY = 15;
const PANIC_PENALTY = 25;
const PANIC_STUMBLE_CHANCE = 20;
const HALLUCINATION_CHANCE = 30;

const REVIVE_HP = 1;
const SEARCH_DURATION_MS = 10000;
const SEARCH_NOISE_CHANCE = 25; // percent chance a Search rummages loud enough to be heard

// The Slasher can't move (or shortcut) for its first 2 turns — a head
// start so teens can scatter and gear up before the hunt begins.
const SLASHER_FROZEN_ROUNDS = 2;

// Killer attack-chance ramp: weak at the start of the clock, normal by the
// midgame, and dangerous again in the final third (see difficultyModifier).
const EARLY_GAME_PENALTY_TIER1 = 20; // first ~20% of the clock elapsed
const EARLY_GAME_PENALTY_TIER2 = 10; // ~20-40% elapsed
const EARLY_GAME_TIER1_ELAPSED = 0.2;
const EARLY_GAME_TIER2_ELAPSED = 0.4;

// ---- Sanity Recovery Rules (0-100 scale) ----
// Percentage-shaped so players can read a change at a glance. Every loss
// and gain is a deliberately chunky, "felt" amount (see loseSanity/
// gainSanity call sites) — no more shaving off 1-2 points at a time.
const SANITY_MAX = 100;
const SANITY_START = 80;
const COMFORT_GAIN = 10; // The Leader grants 15 instead (see the "comfort" case)
const COMFORT_LIMIT = 30; // per player, per game (as the receiver)
const ITEM_SANITY_LIMIT = 40; // per player, per game
const OBJECTIVE_SANITY_LIMIT = 40; // per player, per game
const BROKEN_ENTER_SANITY = 0;
const BROKEN_RECOVER_SANITY = 30; // climb back to the bottom of Frightened to shake off Broken
const BROKEN_ROUND_CAP = 10; // max Sanity gain per round while Broken

// ---- Sanity loss amounts (see design doc: "losses should be meaningful,
// never -1/-2/-3") ----
const SANITY_LOSS_SEE_KILLER = 10;
const SANITY_LOSS_ATTACKED = 20;
const SANITY_LOSS_WITNESS_ATTACK = 5;
const SANITY_LOSS_DISCOVER_DEAD = 15;
const SANITY_LOSS_HORROR_EVENT = 10;
const SANITY_LOSS_CURSED_LOCATION = 5;
const SANITY_LOSS_FAILED_FEAR_CHECK = 10;
const SANITY_GAIN_MAJOR_OBJECTIVE = 10; // escape / banish / destroy the monster — every alive teen
const SANITY_GAIN_OBJECTIVE_PROGRESS = 5; // repairing the car

// ---- Noise System ----
// The Killer never sees teen locations directly (see canSeeLocation in
// publicState) — it hunts by listening. Most teen actions are silent; a
// few generate a Noise Alert naming the exact location (but never which
// teen), fading after a couple of rounds so it can never become a
// permanent tracker.
const NOISE_ALERT_LIFETIME = { noisy: 2, loud: 3 }; // rounds
const MAX_NOISE_ALERTS = 6;

// ---- Location Interactions (Phase 2) ----
// Each general-location type gets one bespoke Interact option beyond
// generic Search — see LOCATION_INTERACTIONS below for the full table.
const COFFEE_SANITY_GAIN = 8; // Grab Coffee (Diner) — once per player per game
const SCOUT_USES_PER_GAME = 2; // Scout (Water Tower) — per player per game
const ARCADE_USES_PER_ROOM = 2; // Power Up (Arcade) — shared across the whole match
const POWER_UP_SPEED_BONUS = 1; // temporary Movement, same shape as Monster Energy's
const REGROUP_GAIN = 8; // Regroup (ritual site) — per teen present, once per round
const REGROUP_SANITY_LIMIT = 24; // per player, per game — its own pool, separate from Comfort/Item/Objective
const INVESTIGATE_RISK_CHANCE = 30; // percent — high/very-high danger wonderland spots only

const KILLER_SECRET_OBJECTIVES = [
  {
    id: "bloodbath",
    name: "Bloodbath",
    description: "Kill at least 3 of the 4 teens before the game ends.",
    check: (room) => room.killCount >= 3,
  },
  {
    id: "silence_the_engine",
    name: "Silence the Engine",
    description: "Never let the car be repaired.",
    check: (room) => !room.carEverRepaired,
  },
  {
    id: "shatter_their_minds",
    name: "Shatter Their Minds",
    description: "Break at least one teen's mind (0 Sanity) before the game ends.",
    check: (room) => room.anyTeenBroken,
  },
  {
    id: "the_lone_kill",
    name: "The Lone Kill",
    description: "Kill a teen while they were completely alone.",
    check: (room) => room.soloKillHappened,
  },
];

// Horror Events: random mid-match happenings that fire a handful of times
// per game once things get going, each simple on its own but unscripted in
// combination — no two matches roll the same sequence. `apply` returns a
// short player-facing summary (shown to everyone as a banner) on success,
// or null if it had nothing valid to act on this round (e.g. no locations
// left to target), in which case the roll doesn't count as used.
const HORROR_EVENT_MIN_ROUND = 3;
const HORROR_EVENT_COOLDOWN_ROUNDS = 3;
const MAX_HORROR_EVENTS_PER_GAME = 5;
const HORROR_EVENT_CHANCE = 0.35; // rolled once per round, once eligible

const HORROR_EVENTS = [
  {
    id: "unsettling_presence",
    name: "Something's Wrong Here",
    apply(room) {
      const candidates = Object.values(room.board).filter((l) => !l.exit && !l.ritualSite);
      if (candidates.length === 0) return null;
      const loc = candidates[Math.floor(Math.random() * candidates.length)];
      room.horrorEvents.set(loc.id, { name: "Something's Wrong Here", expiresRound: room.round + 2 });
      aliveTeens(room)
        .filter((t) => t.location === loc.id)
        .forEach((t) => loseSanity(room, t, SANITY_LOSS_HORROR_EVENT));
      log(room, `Something is deeply wrong at ${loc.name} — no one will be able to settle down there for a while.`, "all");
      return "Something turns hostile somewhere on the map.";
    },
  },
  {
    id: "power_flicker",
    name: "Power Flicker",
    apply(room) {
      room.noiseSuppressedUntilRound = room.round + 1;
      log(room, "The power flickers and dies. For a moment, everything goes real quiet.", "all");
      return "The power flickers and dies — no sound will carry this round.";
    },
  },
  {
    id: "radio_static",
    name: "Dead Air",
    apply(room) {
      const teens = aliveTeens(room);
      if (teens.length === 0) return null;
      teens.forEach((t) => loseSanity(room, t, SANITY_LOSS_HORROR_EVENT));
      log(room, "Every dead radio in the place screams static at once.", "teens");
      return "Every radio in the place screams static at once.";
    },
  },
  {
    id: "false_report",
    name: "False Report",
    apply(room) {
      const ids = Object.keys(room.board);
      if (ids.length === 0) return null;
      const locId = ids[Math.floor(Math.random() * ids.length)];
      emitNoise(room, locId, "noisy", { fake: true });
      log(room, "A garbled voice on the radio reports a sighting that turns out to be nothing.", "teens");
      return "A false report crackles over the radio.";
    },
  },
  {
    id: "lightning_flash",
    name: "Lightning Flash",
    apply(room) {
      const slasher = slasherOf(room);
      if (!slasher) return null;
      const locName = room.board[slasher.location]?.name || "somewhere";
      room.sightings.push({
        id: `sighting-${++room.sightingCounter}`,
        locationId: slasher.location,
        locationName: locName,
        round: room.round,
        expiresRound: room.round,
        source: "lightning",
      });
      log(room, `Lightning cracks overhead — for one instant, you see exactly where it is: ${locName}.`, "teens");
      return "Lightning cracks overhead.";
    },
  },
  {
    id: "forgotten_footage",
    name: "Forgotten Footage",
    apply(room) {
      const teens = aliveTeens(room);
      if (teens.length === 0) return null;
      const teen = teens[Math.floor(Math.random() * teens.length)];
      gainSanity(room, teen, 10);
      log(room, `${teen.characterName} finds an old home movie of happier times, tucked away at ${room.board[teen.location]?.name}. It helps, a little.`, "teens");
      return "Someone finds an old home movie of happier times.";
    },
  },
];

export function createRoom(code, hostId) {
  return {
    code,
    hostId,
    phase: "lobby", // lobby | playing | ended
    players: new Map(), // id -> player
    board: null, // set at startGame — a fresh procedurally generated map
    layout: null,
    mapName: null,
    turnOrder: [],
    turnIndex: 0,
    round: 1,
    endsAt: null,
    monsterHp: MONSTER_MAX_HP,
    monsterStunned: false,
    killerId: null,
    thingRevealed: false,
    objectives: { carRepaired: false },
    log: [],
    winner: null, // 'teens' | 'slasher'
    winReason: null,
    createdAt: Date.now(),
    comfortPairsThisRound: new Set(),
    horrorEvents: new Map(), // locationId -> { name, expiresRound } — an active Horror Event there (blocks Rest)
    practice: false, // a short, guided practice match — see index.js create_solo_room
    noiseAlerts: [], // {id, level, locationId, locationName, round, expiresRound, fake}
    noiseAlertCounter: 0,
    noiseSuppressedUntilRound: 0, // Horror Event: no noise carries through this round
    sightings: [], // {id, locationId, locationName, round, expiresRound} — teen-visible Slasher glimpses
    sightingCounter: 0,
    killerSecretObjective: null,
    killCount: 0,
    carEverRepaired: false,
    anyTeenBroken: false,
    soloKillHappened: false,
    horrorEventsFired: [], // {id, name, round} — history for this match
    lastHorrorEventRound: 0,
    recentHorrorEvent: null, // {id, name, summary, round} — most recent, for the shared banner
  };
}

export function addPlayer(room, id, name, roleOverride) {
  if (room.players.has(id)) return;
  const role = roleOverride || (room.players.size === 0 ? "slasher" : "teen");
  room.players.set(id, {
    id,
    name: name?.slice(0, 20) || "Player",
    role,
    pickId: null, // teen character id, or killer id for the slasher
    location: null,
    items: [],
    itemCapacity: MAX_ITEMS,
    hp: 2,
    hpMax: 2,
    sanity: 0,
    sanityMax: 0,
    hiding: false,
    searching: false,
    searchEndsAt: null,
    evadeCooldownLocation: null, // set on a successful hold-breath — the Slasher must leave this location before it can search here again
    status: "alive", // alive | dead | escaped
    stalkStreak: 0,
    specialCooldown: 0,
    ready: false,
    isBot: false,
    broken: false,
    hasBeenBroken: false,
    traumaCard: null,
    brokenGainRound: null,
    brokenGainThisRound: 0,
    comfortGainTotal: 0,
    comfortReceivedRound: null,
    itemSanityGainTotal: 0,
    objectiveSanityGainTotal: 0,
    distractUsed: false,
    deathRound: null,
    deathLocation: null,
    actionsRemaining: 0, // set to TEEN_ACTIONS_PER_TURN (+ any banked bonus) whenever it becomes this teen's turn
    bonusActionsNextTurn: 0, // banked by a teammate's Let's Go, spent at the start of this player's next turn
    abilityUsedTurn: false, // Sprint / Tinker / Bait — once per turn
    abilityUsedRound: null, // Let's Go — once per round (compared against room.round)
    freeInteractAvailable: false, // Tinker: next Interact this turn costs 0 Actions
    coffeeUsed: false, // Grab Coffee (Diner) — once per game
    evidenceUsed: false, // Access Evidence (Police Station) — once per game
    scoutUses: 0, // Scout (Water Tower) — capped at SCOUT_USES_PER_GAME
    scavengeCategory: null, // Scavenge Supplies (Store/Gas Station) — biases the very next Search
    regroupGainTotal: 0, // Regroup (ritual site) — lifetime cap, its own pool
    regroupReceivedRound: null, // Regroup — once per round
  });
}


let botCounter = 0;

export function addBot(room, role, name) {
  const id = `bot-${role}-${++botCounter}-${Math.random().toString(36).slice(2, 6)}`;
  addPlayer(room, id, name, role);
  const bot = room.players.get(id);
  bot.isBot = true;
  bot.ready = true;
  return id;
}

// Removing a player shifts everyone after them left by one slot in
// turnOrder, but turnIndex is just a number — left unadjusted it silently
// points at the wrong player (skipping whoever's turn it truly is) or, if
// it was already at the end of the array, past the end entirely, which
// stalls the game since nothing then matches currentPlayerId(). Re-anchor
// it to the same player who logically still holds the turn: whoever came
// right after the removed player in the old order (which, post-filter,
// is simply the same numeric index — or wraps via modulo if that removed
// player themselves held the turn).
export function removePlayer(room, id) {
  const currentId = room.turnOrder[room.turnIndex];
  room.players.delete(id);
  room.turnOrder = room.turnOrder.filter((pid) => pid !== id);
  if (room.turnOrder.length === 0) {
    room.turnIndex = 0;
    return;
  }
  if (currentId !== id) {
    const idx = room.turnOrder.indexOf(currentId);
    room.turnIndex = idx >= 0 ? idx : room.turnIndex % room.turnOrder.length;
  } else {
    room.turnIndex = room.turnIndex % room.turnOrder.length;
  }
}

export function setRole(room, id, role) {
  const player = room.players.get(id);
  if (!player || room.phase !== "lobby") return { error: "Cannot change role now." };
  if (role === "slasher") {
    const currentSlasher = [...room.players.values()].find((p) => p.role === "slasher");
    if (currentSlasher && currentSlasher.id !== id) currentSlasher.role = "teen";
  } else if (role === "teen") {
    const teenCount = [...room.players.values()].filter((p) => p.role === "teen" && p.id !== id).length;
    if (teenCount >= MAX_TEENS) return { error: "Teen slots are full." };
  }
  if (player.role !== role) player.pickId = null;
  player.role = role;
  return { ok: true };
}

export function setReady(room, id, ready) {
  const player = room.players.get(id);
  if (player) player.ready = ready;
}

export function setCharacter(room, id, characterId) {
  const player = room.players.get(id);
  if (!player || room.phase !== "lobby") return { error: "Cannot change character now." };
  if (player.role !== "teen") return { error: "Only teens choose a character." };
  if (!TEEN_CHARACTERS[characterId]) return { error: "Unknown character." };
  const taken = [...room.players.values()].some(
    (p) => p.id !== id && p.role === "teen" && p.pickId === characterId
  );
  if (taken) return { error: "That character is already taken." };
  player.pickId = characterId;
  return { ok: true };
}

export function setKiller(room, id, killerId) {
  const player = room.players.get(id);
  if (!player || room.phase !== "lobby") return { error: "Cannot change killer now." };
  if (player.role !== "slasher") return { error: "Only the Slasher chooses who to play." };
  if (!KILLERS[killerId]) return { error: "Unknown killer." };
  player.pickId = killerId;
  return { ok: true };
}

export function canStart(room) {
  const players = [...room.players.values()];
  const slashers = players.filter((p) => p.role === "slasher");
  const teens = players.filter((p) => p.role === "teen");
  if (slashers.length !== 1) return { ok: false, reason: "Exactly one player must be the Slasher." };
  if (teens.length < 1) return { ok: false, reason: "At least one teen is needed." };
  if (!players.every((p) => p.ready)) return { ok: false, reason: "Not everyone is ready." };
  if (!slashers[0].pickId) return { ok: false, reason: "The Slasher must choose who to play." };
  if (teens.some((t) => !t.pickId)) return { ok: false, reason: "Every teen must choose a character." };
  return { ok: true };
}

// scope controls who sees this line in the Camp Log:
//  "all"     — visible to everyone (default; world/shared events)
//  "teens"   — visible to teens only, hidden from the Slasher (protects
//              movement/search/hide info the Noise System doesn't grant it)
//  "slasher" — visible to the Slasher only, hidden from teens (protects the
//              Slasher's own movement/lurk/shortcut from free tracking)
function log(room, message, scope = "all") {
  room.log.push({ t: Date.now(), round: room.round, message, scope });
  if (room.log.length > 200) room.log.shift();
}

export function startGame(room, { durationMs } = {}) {
  const players = [...room.players.values()];
  const teens = players.filter((p) => p.role === "teen");
  const slasher = players.find((p) => p.role === "slasher");

  const generated = generateBoard();
  room.board = generated.locations;
  room.layout = generated.layout;
  room.mapName = generated.mapName;

  teens.forEach((p, i) => {
    const character = TEEN_CHARACTERS[p.pickId];
    p.location = generated.startLocations.teens[i % generated.startLocations.teens.length];
    p.items = [];
    p.itemCapacity = MAX_ITEMS;
    p.hp = character.stats.health;
    p.hpMax = character.stats.health;
    p.sanity = SANITY_START;
    p.sanityMax = SANITY_MAX;
    p.hiding = false;
    p.searching = false;
    p.searchEndsAt = null;
    p.pendingDiscoveryUid = null;
    p.evadeCooldownLocation = null;
    p.status = "alive";
    p.characterName = character.name;
    p.broken = false;
    p.hasBeenBroken = false;
    p.traumaCard = null;
    p.brokenGainRound = null;
    p.brokenGainThisRound = 0;
    p.comfortGainTotal = 0;
    p.comfortReceivedRound = null;
    p.itemSanityGainTotal = 0;
    p.objectiveSanityGainTotal = 0;
    p.distractUsed = false;
    p.deathRound = null;
    p.deathLocation = null;
    p.knownDeaths = new Set();
    p.tempSpeedBonus = 0;
    p.actionsRemaining = TEEN_ACTIONS_PER_TURN;
    p.bonusActionsNextTurn = 0;
    p.abilityUsedTurn = false;
    p.abilityUsedRound = null;
    p.freeInteractAvailable = false;
    p.coffeeUsed = false;
    p.evidenceUsed = false;
    p.scoutUses = 0;
    p.scavengeCategory = null;
    p.regroupGainTotal = 0;
    p.regroupReceivedRound = null;
  });
  slasher.location = generated.startLocations.slasher;
  slasher.stalkStreak = 0;
  slasher.specialCooldown = 0;

  room.phase = "playing";
  room.turnOrder = [...teens.map((p) => p.id), slasher.id];
  room.turnIndex = 0;
  room.round = 1;
  room.gameDurationMs = durationMs ?? GAME_DURATION_MS;
  room.endsAt = Date.now() + room.gameDurationMs;
  room.monsterHp = MONSTER_MAX_HP;
  room.monsterStunned = false;
  room.killerId = slasher.pickId;
  room.thingRevealed = false;
  room.objectives = { carRepaired: false };
  room.winner = null;
  room.winReason = null;
  room.log = [];
  room.comfortPairsThisRound = new Set();
  room.horrorEvents = new Map();
  room.noiseAlerts = [];
  room.noiseAlertCounter = 0;
  room.noiseSuppressedUntilRound = 0;
  room.sightings = [];
  room.sightingCounter = 0;
  room.arcadeUsesRemaining = ARCADE_USES_PER_ROOM;
  room.killerSecretObjective = KILLER_SECRET_OBJECTIVES[Math.floor(Math.random() * KILLER_SECRET_OBJECTIVES.length)];
  room.killCount = 0;
  room.carEverRepaired = false;
  room.anyTeenBroken = false;
  room.soloKillHappened = false;
  room.horrorEventsFired = [];
  room.lastHorrorEventRound = 0;
  room.recentHorrorEvent = null;
  log(room, "The static clears. The night begins.");
  return room;
}

function currentPlayerId(room) {
  return room.turnOrder[room.turnIndex];
}

function aliveTeens(room) {
  return [...room.players.values()].filter((p) => p.role === "teen" && p.status !== "dead" && p.status !== "escaped");
}

function slasherOf(room) {
  return [...room.players.values()].find((p) => p.role === "slasher");
}

function killerInfo(room) {
  return KILLERS[room.killerId] ?? KILLERS.stalker;
}

function neighborsOf(room, locationId) {
  return room.board[locationId]?.connections ?? [];
}

// 0 = normal, 1 = final third of the clock, 2 = final countdown. The Monster
// hits harder and Sanity drains faster for isolated teens as this rises.
// Scaled to the room's own clock (GAME_DURATION_MS normally, but a shorter
// practice match runs its own faster arc) rather than a fixed duration.
function lateGameTier(room) {
  if (!room.endsAt) return 0;
  const fraction = (room.endsAt - Date.now()) / (room.gameDurationMs ?? GAME_DURATION_MS);
  if (fraction <= 0.15) return 2;
  if (fraction <= 0.33) return 1;
  return 0;
}

// The Monster's attack chance ramps up over the course of the match: eased
// in for the first ~40% of the clock so a fresh encounter isn't an instant
// death sentence, back to normal through the midgame, then the existing
// late-game tiers make it dangerous again as the clock runs out.
function killerDifficultyModifier(room) {
  if (!room.endsAt) return -EARLY_GAME_PENALTY_TIER1;
  const total = room.gameDurationMs ?? GAME_DURATION_MS;
  const elapsedFraction = 1 - (room.endsAt - Date.now()) / total;
  if (elapsedFraction <= EARLY_GAME_TIER1_ELAPSED) return -EARLY_GAME_PENALTY_TIER1;
  if (elapsedFraction <= EARLY_GAME_TIER2_ELAPSED) return -EARLY_GAME_PENALTY_TIER2;
  return lateGameTier(room) * 10;
}

// Five states on the 0-100 scale: Stable (76-100, no penalty), Uneasy
// (51-75, minor), Frightened (26-50, harder Fear Checks/Hold Your Breath),
// Panicked (1-25, significantly harder + more Noise), Broken (0, Trauma).
function sanityTier(player) {
  const sanity = typeof player === "number" ? player : player.sanity;
  if (sanity <= 0) return "broken";
  if (sanity <= 25) return "panicked";
  if (sanity <= 50) return "frightened";
  if (sanity <= 75) return "uneasy";
  return "stable";
}

function sanityPenalty(player) {
  const tier = sanityTier(player);
  if (tier === "broken" || tier === "panicked") return PANIC_PENALTY;
  if (tier === "frightened") return FRIGHTENED_PENALTY;
  if (tier === "uneasy") return UNEASY_PENALTY;
  return 0;
}

// ---- Sanity Recovery Rules engine ----
// Every Sanity change funnels through gainSanity/loseSanity so the Broken
// state, the 10-point cap, and the once-per-game Broken rule are always
// enforced in one place, no matter which of the five approved recovery
// channels (Trauma/Card, Objectives, Items, Comfort, Rest) — or which loss
// source (isolation, jump-scares, wounds) — triggered it.

const TIER_ORDER = ["broken", "panicked", "frightened", "uneasy", "stable"];
const TIER_ENTER_LOG = {
  panicked: (n) => `${n} is panicking — their mind is unraveling.`,
  frightened: (n) => `${n} is badly frightened.`,
  uneasy: (n) => `${n} is growing uneasy.`,
  stable: (n) => `${n} steadies their nerves.`,
};

function logSanityTierChange(room, player, before, after) {
  if (after === before) return;
  // Only announce the tier actually being ENTERED — moving from panicked
  // straight to stable in one big gain should say "steadies", not both.
  const worsened = TIER_ORDER.indexOf(after) < TIER_ORDER.indexOf(before);
  const line = TIER_ENTER_LOG[after]?.(player.characterName);
  if (line && (worsened || after === "stable")) log(room, line, "teens");
}

function enterBroken(room, player) {
  player.broken = true;
  player.hasBeenBroken = true;
  room.anyTeenBroken = true;
  const card = drawTraumaCard();
  player.traumaCard = card.text;
  log(room, `${player.characterName} breaks down completely. [Trauma: ${card.text}]`, "teens");
}

// Applies Sanity loss (isolation drain, jump-scares, etc). Reaching 0 for
// the first time makes the player Broken; if they've already recovered
// from a prior Broken state once, they floor at 1 instead of breaking again.
function loseSanity(room, player, amount) {
  if (amount <= 0 || player.status !== "alive") return;
  const before = sanityTier(player);
  let next = player.sanity - amount;
  if (next <= BROKEN_ENTER_SANITY) {
    next = player.hasBeenBroken && !player.broken ? 1 : 0;
  }
  player.sanity = Math.max(0, next);
  if (player.sanity <= BROKEN_ENTER_SANITY && !player.hasBeenBroken) enterBroken(room, player);
  logSanityTierChange(room, player, before, sanityTier(player));
}

// Applies Sanity gain from an approved recovery source. While Broken, gain
// is capped at BROKEN_ROUND_CAP per round regardless of source. Returns the
// amount actually applied (after the Broken cap and the max-10 clamp), so
// callers can charge their own per-source lifetime limit accurately.
function gainSanity(room, player, amount) {
  if (amount <= 0 || player.status !== "alive") return 0;
  let allowed = amount;
  if (player.broken) {
    if (player.brokenGainRound !== room.round) {
      player.brokenGainRound = room.round;
      player.brokenGainThisRound = 0;
    }
    allowed = Math.max(0, Math.min(allowed, BROKEN_ROUND_CAP - player.brokenGainThisRound));
  }
  const before = sanityTier(player);
  const startSanity = player.sanity;
  player.sanity = Math.min(SANITY_MAX, player.sanity + allowed);
  const actual = player.sanity - startSanity;
  if (player.broken) player.brokenGainThisRound += actual;
  if (player.broken && player.sanity >= BROKEN_RECOVER_SANITY) {
    player.broken = false;
    log(room, `${player.characterName} pulls themself back together.`, "teens");
  }
  logSanityTierChange(room, player, before, sanityTier(player));
  return actual;
}

// Objective and Item recovery each have their own +4-per-game lifetime cap.
// Grants are clipped to whatever headroom remains under that cap so the
// running total can never exceed it.
function grantObjectiveSanity(room, player, amount) {
  const remaining = OBJECTIVE_SANITY_LIMIT - player.objectiveSanityGainTotal;
  if (remaining <= 0) return 0;
  const grant = Math.min(amount, remaining);
  player.objectiveSanityGainTotal += grant;
  return gainSanity(room, player, grant);
}

function grantItemSanity(room, player, amount) {
  const remaining = ITEM_SANITY_LIMIT - player.itemSanityGainTotal;
  if (remaining <= 0) return 0;
  const grant = Math.min(amount, remaining);
  player.itemSanityGainTotal += grant;
  return gainSanity(room, player, grant);
}

// A win-condition objective (banishing or destroying the Monster) ends the
// horror for the whole team at once, so every teen still in it shares the
// relief — unlike Escape, which only the teen behind the wheel gets.
function grantMajorObjectiveSanityToAll(room) {
  aliveTeens(room).forEach((t) => grantObjectiveSanity(room, t, SANITY_GAIN_MAJOR_OBJECTIVE));
}

function hasActiveHorrorEvent(room, locationId) {
  return room.horrorEvents.has(locationId);
}

// Shared by the "comfort" action handler and the teen AI's own decision
// logic, so a bot never lines up a Comfort the server is just going to
// reject — an AI stuck retrying an illegal action every tick would stall
// its own turn (and the whole match) forever.
function canComfort(room, giver, target) {
  if (!target || target.role !== "teen" || target.location !== giver.location || target.status !== "alive") return false;
  if (target.id === giver.id) return false;
  if (target.sanity >= target.sanityMax) return false;
  if (hasActiveHorrorEvent(room, giver.location)) return false;
  if (target.comfortReceivedRound === room.round) return false;
  if (target.comfortGainTotal >= COMFORT_LIMIT) return false;
  if (room.comfortPairsThisRound.has(`${target.id}>${giver.id}`)) return false;
  return true;
}

// Isolation drains Sanity; grouping up with teammates only protects against
// that drain now — actual recovery only comes from the five approved
// channels (Rest, Comfort, Items, Objectives, Trauma/Card).
function applySanityTick(room, player) {
  const roommates = aliveTeens(room).filter((t) => t.location === player.location);
  if (roommates.length > 1) return;
  const drain = lateGameTier(room) >= 2 ? 5 : 3;
  loseSanity(room, player, drain);
}

// A teen who successfully held their breath is safe from another search at
// that spot until the Slasher actually leaves — this clears that immunity
// for anyone who was relying on the location the Slasher just left.
function clearEvadeCooldown(room, locationId) {
  aliveTeens(room).forEach((t) => {
    if (t.evadeCooldownLocation === locationId) t.evadeCooldownLocation = null;
  });
}

// The jump-scare of the Monster appearing costs Sanity immediately. Skipped
// for a still-disguised Thing, since the teens don't consciously see it.
// Distraction: a Rebel in the room draws the Monster's focus, so teammates
// alongside them are spared the jump-scare (the Rebel isn't spared their own).
function scareTeensAt(room, locationId) {
  const killer = killerInfo(room);
  if (killer.id === "thing" && !room.thingRevealed) return;
  const teensHere = aliveTeens(room).filter((t) => t.location === locationId);
  const hasRebel = teensHere.some((t) => t.pickId === "rebel");
  teensHere.forEach((t) => {
    if (hasRebel && t.pickId !== "rebel") return;
    loseSanity(room, t, SANITY_LOSS_SEE_KILLER);
  });
}

// Pushes a Noise Alert the Slasher can act on: names the exact location but
// never who caused it. Fades after a couple of rounds so it can't become a
// permanent tracker — the Slasher has to actually go investigate, promptly.
function emitNoise(room, locationId, level, opts = {}) {
  const loc = room.board[locationId];
  if (!loc) return;
  if (room.noiseSuppressedUntilRound && room.round <= room.noiseSuppressedUntilRound) return;
  const alert = {
    id: `noise-${++room.noiseAlertCounter}`,
    level,
    locationId,
    locationName: loc.name,
    round: room.round,
    expiresRound: room.round + NOISE_ALERT_LIFETIME[level],
    fake: !!opts.fake,
  };
  room.noiseAlerts.push(alert);
  if (room.noiseAlerts.length > MAX_NOISE_ALERTS) room.noiseAlerts.shift();
  log(
    room,
    level === "loud" ? `🚨 LOUD NOISE — activity detected at ${loc.name}.` : `🔊 Noise detected near ${loc.name}.`,
    "slasher"
  );
}

function pruneNoiseAlerts(room) {
  room.noiseAlerts = room.noiseAlerts.filter((a) => room.round <= a.expiresRound);
}

function pruneHorrorEvents(room) {
  for (const [locId, ev] of room.horrorEvents) {
    if (room.round > ev.expiresRound) room.horrorEvents.delete(locId);
  }
  room.sightings = room.sightings.filter((s) => room.round <= s.expiresRound);
}

// Rolls for a random Horror Event once per round, after an early grace
// period and with a cooldown/cap so they punctuate a match rather than
// flooding it. An event whose apply() finds nothing valid to do (e.g. no
// eligible location) doesn't consume the roll or start the cooldown.
function maybeTriggerHorrorEvent(room) {
  if (room.round < HORROR_EVENT_MIN_ROUND) return;
  if (room.round - room.lastHorrorEventRound < HORROR_EVENT_COOLDOWN_ROUNDS) return;
  if (room.horrorEventsFired.length >= MAX_HORROR_EVENTS_PER_GAME) return;
  if (Math.random() >= HORROR_EVENT_CHANCE) return;
  const event = HORROR_EVENTS[Math.floor(Math.random() * HORROR_EVENTS.length)];
  const summary = event.apply(room);
  if (summary == null) return;
  room.lastHorrorEventRound = room.round;
  room.horrorEventsFired.push({ id: event.id, name: event.name, round: room.round });
  room.recentHorrorEvent = { id: event.id, name: event.name, summary, round: room.round };
}

function advanceTurn(room) {
  if (room.winner) return;
  const n = room.turnOrder.length;
  if (n === 0) return;
  for (let i = 0; i < n; i++) {
    room.turnIndex = (room.turnIndex + 1) % n;
    if (room.turnIndex === 0) {
      room.round += 1;
      room.comfortPairsThisRound = new Set();
      pruneNoiseAlerts(room);
      pruneHorrorEvents(room);
      maybeTriggerHorrorEvent(room);
    }
    const pid = currentPlayerId(room);
    const player = room.players.get(pid);
    if (player && player.status !== "dead" && player.status !== "escaped") break;
  }
  // Fresh Action Points for whoever's turn it now is — plus any bonus a
  // teammate's Let's Go banked for them — and every once-per-turn ability
  // gate resets clean.
  const next = room.players.get(currentPlayerId(room));
  if (next && next.role === "teen") {
    next.actionsRemaining = TEEN_ACTIONS_PER_TURN + (next.bonusActionsNextTurn || 0);
    next.bonusActionsNextTurn = 0;
    next.abilityUsedTurn = false;
    next.freeInteractAvailable = false;
  }
}

export function checkClockExpired(room) {
  if (room.phase === "playing" && room.endsAt && Date.now() >= room.endsAt) {
    const killer = killerInfo(room);
    room.winner = "slasher";
    room.winReason = `The tape ran out. ${killer.name} wins — dawn never comes for them.`;
    room.phase = "ended";
    log(room, `REEL END. The tape runs out — ${killer.name} wins.`);
    return true;
  }
  return false;
}

function checkWin(room) {
  if (room.winner) return;
  if (room.monsterHp <= 0) {
    room.winner = "teens";
    room.winReason = "The monster has been destroyed.";
    room.phase = "ended";
    log(room, "The monster collapses, still at last. The teens win.");
    return;
  }
  if (aliveTeens(room).length === 0) {
    const killer = killerInfo(room);
    room.winner = "slasher";
    room.winReason = `Every teen has fallen. ${killer.name} wins.`;
    room.phase = "ended";
    log(room, `Silence falls over the park. ${killer.name} wins.`);
    return;
  }
}

function hasItems(player, ids) {
  return ids.filter((id) => player.items.some((it) => it.id === id));
}

function removeItems(player, ids) {
  ids.forEach((id) => {
    const idx = player.items.findIndex((it) => it.id === id);
    if (idx >= 0) player.items.splice(idx, 1);
  });
}

function roll(chance) {
  return Math.random() * 100 < chance;
}

function reachable(room, locationId, hops) {
  let frontier = new Set([locationId]);
  const seen = new Set([locationId]);
  for (let i = 0; i < hops; i++) {
    const next = new Set();
    for (const loc of frontier) {
      for (const n of neighborsOf(room, loc)) {
        if (!seen.has(n)) {
          seen.add(n);
          next.add(n);
        }
      }
    }
    frontier = next;
  }
  seen.delete(locationId);
  return seen;
}

// Teens get TEEN_ACTIONS_PER_TURN Action Points per turn and choose how to
// spend them (Move, Search, Hide, Use Item, a Special ability, ...) in any
// order/combination, ending their turn only once every point is spent or
// they explicitly End Turn — see the design note at the top of teenAction()
// for the full rationale. The Slasher's turn is unchanged: one action, then
// the turn passes, exactly as before this system existed.
export function applyAction(room, playerId, action) {
  if (checkClockExpired(room)) return { error: "Time is up." };
  if (room.phase !== "playing") return { error: "Game is not in progress." };
  if (currentPlayerId(room) !== playerId) return { error: "It's not your turn." };
  const player = room.players.get(playerId);
  if (!player) return { error: "Unknown player." };

  const result = player.role === "slasher" ? slasherAction(room, player, action) : teenAction(room, player, action);
  if (result?.error) return result;

  if (player.role === "teen") {
    const cost = result?.apCost ?? 1;
    player.actionsRemaining = Math.max(0, (player.actionsRemaining ?? TEEN_ACTIONS_PER_TURN) - cost);
  }
  // A turn-ending item find (an unresolved Take/Leave decision) always holds
  // the turn open regardless of Action Points — see teenAction's search
  // case and the pendingDiscoveryUid guard at its top. Dying (or escaping)
  // mid-turn always ends it immediately no matter how many Action Points
  // were left — a dead/escaped player can never spend them, and teenAction
  // itself refuses to act for one, so leaving the turn "open" would strand
  // the game waiting on a player who can't act again.
  const teenTurnEnding =
    player.role === "teen" && (player.status !== "alive" || (player.actionsRemaining <= 0 && !player.pendingDiscoveryUid));

  // Skip the ambient isolation tick on a turn where the action already
  // attempted a Sanity recovery (Rest, a Sanity item, an objective reward)
  // — even one fully capped to zero effect — otherwise a lone teen's own
  // recovery action could get canceled out (or double-punished) by the
  // same-turn passive drain. Fires once, when the turn actually ends, not
  // once per Action Point spent.
  if (player.role === "teen" && player.status === "alive" && teenTurnEnding && !result?.sanityActionTaken) {
    applySanityTick(room, player);
  }
  if (player.role === "slasher" && action.type !== "shortcut" && player.specialCooldown > 0) {
    player.specialCooldown -= 1;
  }
  // A Monster Energy's "+1 Movement this turn" only ever applies to the
  // turn it was drunk on — once that turn actually ends, the bonus is gone.
  if (player.role === "teen" && teenTurnEnding && player.tempSpeedBonus) {
    player.tempSpeedBonus = 0;
  }

  checkWin(room);
  if (!room.winner && (player.role === "slasher" || teenTurnEnding)) advanceTurn(room);
  return {
    ok: true,
    ...(player.role === "teen" ? { actionsRemaining: player.actionsRemaining } : {}),
    ...(result?.searchStarted ? { searchStarted: result.searchStarted } : {}),
    ...(result?.searchResult ? { searchResult: result.searchResult } : {}),
    ...(result?.itemUseResult ? { itemUseResult: result.itemUseResult } : {}),
  };
}

// Shared by the baseline Move action and the Athlete's Sprint ability:
// discovering a teammate's body, and walking into an active Horror Event,
// both apply the same way regardless of how many spaces were covered to
// get there.
function applyArrivalEffects(room, player, destination) {
  [...room.players.values()]
    .filter((t) => t.role === "teen" && t.status === "dead" && t.deathLocation === destination && !player.knownDeaths?.has(t.id))
    .forEach((t) => {
      player.knownDeaths?.add(t.id);
      log(room, `${player.characterName} finds ${t.characterName}'s body at ${room.board[destination].name}.`, "teens");
      loseSanity(room, player, SANITY_LOSS_DISCOVER_DEAD);
    });
  if (hasActiveHorrorEvent(room, destination)) {
    loseSanity(room, player, SANITY_LOSS_CURSED_LOCATION);
  }
}

// Active character abilities — each teen's Special action. Resolvers get
// the same room/player/action access as any other teenAction case; the
// per-teen cooldown gates (abilityUsedTurn for the once-per-turn three,
// abilityUsedRound for the Leader's once-per-round) live on the player
// object and are reset in advanceTurn(). Mirrors the HORROR_EVENTS/
// KILLER_SECRET_OBJECTIVES pattern already used elsewhere in this file:
// player-facing name/description lives in characters.js, the mechanics
// live here.
const TEEN_ABILITIES = {
  athlete: {
    apCost: 1,
    resolve(room, player, action) {
      if (player.abilityUsedTurn) return { error: "Already sprinted this turn." };
      const reachableSet = reachable(room, player.location, 2);
      if (!action.to || !reachableSet.has(action.to)) return { error: "That's too far for a Sprint." };
      player.abilityUsedTurn = true;
      const destination = action.to;
      player.location = destination;
      log(room, `${player.characterName} sprints to ${room.board[destination].name}!`, "teens");
      emitNoise(room, destination, "loud");
      applyArrivalEffects(room, player, destination);
      return { ok: true };
    },
  },
  nerd: {
    apCost: 1,
    resolve(room, player) {
      if (player.abilityUsedTurn) return { error: "Already tinkered this turn." };
      player.abilityUsedTurn = true;
      player.freeInteractAvailable = true;
      log(room, `${player.characterName} preps their gear for whatever's next.`, "teens");
      return { ok: true };
    },
  },
  rebel: {
    apCost: 1,
    resolve(room, player) {
      if (player.abilityUsedTurn) return { error: "Already done that this turn." };
      player.abilityUsedTurn = true;
      log(room, `${player.characterName} makes themselves impossible to ignore.`, "teens");
      emitNoise(room, player.location, "loud");
      return { ok: true };
    },
  },
  leader: {
    apCost: 1,
    resolve(room, player, action) {
      if (player.abilityUsedRound === room.round) return { error: "Already rallied the team this round." };
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status !== "alive" || target.id === player.id) {
        return { error: "That teammate isn't here." };
      }
      player.abilityUsedRound = room.round;
      target.bonusActionsNextTurn = (target.bonusActionsNextTurn || 0) + 1;
      log(room, `${player.characterName} rallies ${target.characterName} — extra hustle on their next turn.`, "teens");
      return { ok: true };
    },
  },
};

// Location Interactions (Phase 2) — most general locations get one bespoke
// option beyond generic Search, keyed by the location's own `type` so it
// works the moment the board generator picks it, on either map theme. Both
// themes' ritual sites (campfire / castle) share the `ritualSite` flag
// instead of a common `type` string, so Regroup is routed by that flag in
// locationInteractionFor() rather than by type. Every entry exposes an
// `availability` check reused by computeLocationInteraction() below for
// both display (publicState) and validation (the "interact" case), so the
// two can never drift out of sync with each other.
const LOCATION_INTERACTIONS = {
  diner: {
    id: "grab_coffee",
    label: "Grab Coffee",
    description: `A jolt of caffeine to steady your nerves. Once per game (+${COFFEE_SANITY_GAIN} Sanity).`,
    apCost: 1,
    availability(room, player) {
      if (player.coffeeUsed) return { available: false, reason: "Already had your coffee tonight." };
      return { available: true };
    },
    resolve(room, player) {
      player.coffeeUsed = true;
      const before = player.sanity;
      gainSanity(room, player, COFFEE_SANITY_GAIN);
      log(room, `${player.characterName} grabs the cold coffee off the counter — it still helps.`, "teens");
      return { ok: true, sanityActionTaken: player.sanity !== before };
    },
  },
  police: {
    id: "access_evidence",
    label: "Access Evidence",
    description: "Dig through the evidence locker for something on the Killer. Once per game.",
    apCost: 1,
    availability(room, player) {
      if (player.evidenceUsed) return { available: false, reason: "You've already been through the evidence locker." };
      return { available: true };
    },
    resolve(room, player) {
      player.evidenceUsed = true;
      const loc = room.board[player.location];
      const text = drawEvidence(killerInfo(room));
      loc.discoveredInformation = loc.discoveredInformation || [];
      loc.discoveredInformation.push({ type: "evidence", text });
      log(room, `${player.characterName} breaks into the evidence locker: "${text}"`, "teens");
      return { ok: true, interactionResult: { type: "evidence", text } };
    },
  },
  tower: {
    id: "scout",
    label: "Scout",
    description: `Climb up for a look around — reveals exactly where the Killer is right now. ${SCOUT_USES_PER_GAME} uses per game.`,
    apCost: 1,
    availability(room, player) {
      const used = player.scoutUses || 0;
      if (used >= SCOUT_USES_PER_GAME) return { available: false, reason: "You're out of vantage points for tonight.", usesLeft: 0 };
      return { available: true, usesLeft: SCOUT_USES_PER_GAME - used };
    },
    resolve(room, player) {
      player.scoutUses = (player.scoutUses || 0) + 1;
      const slasher = slasherOf(room);
      const locName = slasher ? room.board[slasher.location]?.name || "somewhere" : "somewhere";
      if (slasher) {
        room.sightings.push({
          id: `sighting-${++room.sightingCounter}`,
          locationId: slasher.location,
          locationName: locName,
          round: room.round,
          expiresRound: room.round,
          source: "scout",
        });
      }
      log(room, `${player.characterName} climbs up for a look around — it's at ${locName}.`, "teens");
      return { ok: true };
    },
  },
  store: {
    id: "scavenge",
    label: "Scavenge Supplies",
    description: "Rummage with a category in mind — your very next Search this turn leans toward it.",
    apCost: 1,
    requiresCategory: true,
    availability() {
      return { available: true };
    },
    resolve(room, player, action) {
      const category = action?.category;
      const valid = ["Healing", "Utility", "Weapon", "Sanity", "Objective"];
      if (!valid.includes(category)) return { error: "Choose a category to scavenge for first." };
      player.scavengeCategory = category;
      log(room, `${player.characterName} starts scavenging with ${category} in mind.`, "teens");
      return { ok: true };
    },
  },
  campfire: {
    id: "regroup",
    label: "Regroup",
    description: `Rally with your teammates here for +${REGROUP_GAIN} Sanity each, once per round.`,
    apCost: 1,
    availability(room, player) {
      const teensHere = aliveTeens(room).filter((t) => t.location === player.location);
      if (teensHere.length < 2) return { available: false, reason: "Nobody else is here to regroup with." };
      if (player.regroupReceivedRound === room.round) return { available: false, reason: "Already regrouped this round." };
      if (player.regroupGainTotal >= REGROUP_SANITY_LIMIT) return { available: false, reason: "Regrouping doesn't help you anymore." };
      return { available: true };
    },
    resolve(room, player) {
      const teensHere = aliveTeens(room).filter((t) => t.location === player.location);
      let anyGain = false;
      teensHere.forEach((t) => {
        if (t.regroupReceivedRound === room.round) return;
        const remaining = REGROUP_SANITY_LIMIT - t.regroupGainTotal;
        if (remaining <= 0) return;
        const grant = Math.min(REGROUP_GAIN, remaining);
        t.regroupGainTotal += grant;
        t.regroupReceivedRound = room.round;
        if (gainSanity(room, t, grant) > 0) anyGain = true;
      });
      log(room, `${player.characterName} pulls the group together for a moment.`, "teens");
      return { ok: true, sanityActionTaken: anyGain };
    },
  },
  arcade: {
    id: "power_up",
    label: "Power Up",
    description: `Hop on a cabinet for a burst of adrenaline (+${POWER_UP_SPEED_BONUS} Movement this turn). Shared — ${ARCADE_USES_PER_ROOM} uses per match.`,
    apCost: 1,
    availability(room) {
      const left = room.arcadeUsesRemaining ?? 0;
      if (left <= 0) return { available: false, reason: "The cabinets are all dead now.", usesLeft: 0 };
      return { available: true, usesLeft: left };
    },
    resolve(room, player) {
      room.arcadeUsesRemaining = Math.max(0, (room.arcadeUsesRemaining ?? 0) - 1);
      player.tempSpeedBonus = (player.tempSpeedBonus || 0) + POWER_UP_SPEED_BONUS;
      log(room, `${player.characterName} lights up an old cabinet — one last burst of adrenaline.`, "teens");
      return { ok: true };
    },
  },
};

// The wonderland map's higher-risk landmarks share one Investigate resolver
// — same mechanic, per-type flavor text — instead of several hand-written
// near-duplicates. High/very-high danger spots have a real (not
// guaranteed) chance of costing a little Sanity: not every dig into the
// park's history comes back clean.
const INVESTIGATE_LABELS = {
  carnival: "Investigate the Midway",
  coaster: "Investigate the Coaster",
  mountain: "Investigate the Mountain",
  pirate: "Investigate the Cove",
  boats: "Investigate the Boats",
  swamp: "Investigate the Swamp",
  funhouse: "Investigate the Funhouse",
};

function makeInvestigateInteraction(type) {
  return {
    id: "investigate",
    label: INVESTIGATE_LABELS[type] || "Investigate",
    description: "Dig into this spot's history for something on the Killer — might turn up nothing good.",
    apCost: 1,
    availability() {
      return { available: true };
    },
    resolve(room, player) {
      const loc = room.board[player.location];
      loc.investigateCount = (loc.investigateCount || 0) + 1;
      const text = drawEvidence(killerInfo(room));
      loc.discoveredInformation = loc.discoveredInformation || [];
      loc.discoveredInformation.push({ type: "evidence", text });
      log(room, `${player.characterName} investigates ${loc.name}: "${text}"`, "teens");
      let spooked = false;
      if ((loc.dangerLevel === "high" || loc.dangerLevel === "very-high") && roll(INVESTIGATE_RISK_CHANCE)) {
        loseSanity(room, player, SANITY_LOSS_CURSED_LOCATION);
        spooked = true;
      }
      return { ok: true, interactionResult: { type: "evidence", text, spooked } };
    },
  };
}
Object.keys(INVESTIGATE_LABELS).forEach((type) => {
  LOCATION_INTERACTIONS[type] = makeInvestigateInteraction(type);
});
// The Gas Station shares the General Store's Scavenge Supplies option.
LOCATION_INTERACTIONS.lot = LOCATION_INTERACTIONS.store;

// Both themes' ritual sites (campfire / castle) share the ritualSite flag
// rather than a common `type` string, so that flag routes to Regroup
// before falling back to a type lookup for everything else.
function locationInteractionFor(room, loc) {
  if (!loc) return null;
  if (loc.ritualSite) return LOCATION_INTERACTIONS.campfire;
  return LOCATION_INTERACTIONS[loc.type] || null;
}

// Shared by publicState() (what a teen is shown) and the "interact" action
// handler (what the server actually allows), so the two can never drift.
function computeLocationInteraction(room, player) {
  const loc = room.board[player.location];
  const interaction = locationInteractionFor(room, loc);
  if (!interaction) return null;
  const avail = interaction.availability(room, player);
  return {
    id: interaction.id,
    label: interaction.label,
    description: interaction.description,
    apCost: player.freeInteractAvailable ? 0 : interaction.apCost,
    requiresCategory: !!interaction.requiresCategory,
    available: !!avail.available,
    reason: avail.reason || null,
    usesLeft: avail.usesLeft ?? null,
  };
}

// Teens spend Action Points (see TEEN_ACTIONS_PER_TURN / applyAction) across
// however many of these calls they like before their turn actually ends —
// most cost 1 AP (the default when a case doesn't return its own apCost);
// a handful of quick, non-strategic actions (Give, Discard, picking up an
// already-left item) stay free at apCost: 0, exactly as they were free
// actions under the old one-action-per-turn model.
function teenAction(room, player, action) {
  if (player.status === "dead" || player.status === "escaped") return { error: "You cannot act." };
  if (player.pendingDiscoveryUid && action.type !== "take_item" && action.type !== "leave_item") {
    return { error: "Decide what to do with what you just found first." };
  }
  const loc = room.board[player.location];
  const character = TEEN_CHARACTERS[player.pickId];
  const tier = sanityTier(player);

  const panickedOrWorse = tier === "panicked" || tier === "broken";
  if (panickedOrWorse && roll(HALLUCINATION_CHANCE)) {
    log(room, `${player.characterName}: "${randomHallucination()}"`, "teens");
  }

  if (player.searching && action.type === "move") {
    resolveSearch(room, player.id, true);
  }

  if (player.hiding && !["hide", "pass"].includes(action.type)) {
    player.hiding = false;
    player.evadeCooldownLocation = null;
  }

  switch (action.type) {
    case "hide": {
      player.hiding = !player.hiding;
      if (!player.hiding) player.evadeCooldownLocation = null;
      log(room, player.hiding
        ? `${player.characterName} hides and holds still.`
        : `${player.characterName} comes out of hiding.`, "teens");
      return { ok: true };
    }
    case "move": {
      // Baseline Move is exactly one hop per Action Point — the Athlete's
      // Sprint ability (not this stat) is what covers extra ground, per
      // the action-economy redesign. Monster Energy's temporary +1
      // Movement still extends a single Move this turn past one hop;
      // Panicked/Broken overrides that back down to one hop regardless.
      const maxHops = panickedOrWorse ? 1 : 1 + (player.tempSpeedBonus || 0);
      const reachableSet = maxHops > 1 ? reachable(room, player.location, maxHops) : new Set(neighborsOf(room, player.location));
      if (!reachableSet.has(action.to)) return { error: "That location isn't reachable from here." };
      let destination = action.to;
      let stumbled = false;
      if (panickedOrWorse && roll(PANIC_STUMBLE_CHANCE)) {
        const options = [...reachableSet].filter((l) => l !== action.to);
        if (options.length) {
          destination = options[Math.floor(Math.random() * options.length)];
          stumbled = true;
        }
      }
      player.location = destination;
      log(room, stumbled
        ? `${player.characterName} panics and stumbles into ${room.board[destination].name} instead!`
        : `${player.characterName} moves to ${room.board[destination].name}.`, "teens");
      if (stumbled) emitNoise(room, destination, "noisy");
      applyArrivalEffects(room, player, destination);
      return { ok: true };
    }
    case "special": {
      const ability = TEEN_ABILITIES[character.id];
      if (!ability) return { error: "No special ability available." };
      const result = ability.resolve(room, player, action);
      if (result?.error) return result;
      return { apCost: ability.apCost, ...result };
    }
    case "end_turn": {
      const spent = player.actionsRemaining ?? 0;
      log(room, `${player.characterName} ends their turn.`, "teens");
      return { ok: true, apCost: spent };
    }
    case "interact": {
      const interaction = locationInteractionFor(room, loc);
      if (!interaction) return { error: "There's nothing special to do here." };
      const avail = interaction.availability(room, player);
      if (!avail.available) return { error: avail.reason || "Not available right now." };
      // Tinker: the Special used earlier this turn makes exactly one
      // Interact free — consumed here the moment it's actually spent.
      const apCost = player.freeInteractAvailable ? 0 : interaction.apCost;
      const result = interaction.resolve(room, player, action);
      if (result?.error) return result;
      if (player.freeInteractAvailable) player.freeInteractAvailable = false;
      return { apCost, ...result };
    }
    case "search": {
      const apCost = 1; // Tinker now discounts Interact instead — see the "interact" case above.
      const searchCount = loc.searchCount || 0;
      let outcome = pickSearchOutcome(searchCount);
      // Quick Study / Flashlight: one reroll of the whole outcome on a
      // total miss ("searches more thoroughly") — a real second chance at
      // finding anything at all, not just a better item.
      if (outcome === "nothing" && (character.id === "nerd" || player.items.some((it) => it.utility === "search_bonus"))) {
        outcome = pickSearchOutcome(searchCount);
      }
      loc.searchCount = searchCount + 1;
      const madeNoise = roll(SEARCH_NOISE_CHANCE);
      if (madeNoise) emitNoise(room, player.location, "noisy");

      // Scavenge Supplies (Store/Gas Station): the next Search after
      // choosing a category leans toward it — consumed here the moment
      // it's actually spent, win or lose, so it can't be banked or stacked.
      const scavengeCategory = player.scavengeCategory;
      if (scavengeCategory) player.scavengeCategory = null;

      if (outcome === "item") {
        // Rally: the Leader gets one bonus draw whenever the result isn't
        // an escape/banish kit item, and takes it only if it upgrades to
        // one ("finds objective items more easily").
        let item = null;
        if (scavengeCategory) {
          for (let tries = 0; tries < 20 && !item; tries++) {
            const candidate = drawFromPool(loc.searchPool);
            if (candidate && candidate.category === scavengeCategory) item = candidate;
          }
        }
        for (let tries = 0; tries < 20 && !item; tries++) item = drawFromPool(loc.searchPool);
        if (!item) item = { ...ITEMS.energy_drink };
        if (character.id === "leader" && !item?.kit) {
          const bonus = drawFromPool(loc.searchPool);
          if (bonus?.kit) item = bonus;
        }
        item.uid = `${item.id}_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
        loc.leftItems = loc.leftItems || [];
        loc.leftItems.push(item);
        // Held open until the player says Take or Leave — see take_item /
        // leave_item below, and the pendingDiscoveryUid gate above.
        player.pendingDiscoveryUid = item.uid;
        const inventoryFull = player.items.length >= player.itemCapacity && item.utility !== "capacity";
        log(room, `${player.characterName} searches ${loc.name} and finds ${item.name}.`, "teens");
        return {
          ok: true,
          apCost,
          searchResult: {
            type: "item",
            uid: item.uid,
            itemId: item.id,
            itemName: item.name,
            effect: item.effect,
            category: item.category,
            uses: item.uses,
            noiseLevel: item.noise,
            objective: !!item.objective,
            capacityItem: item.utility === "capacity",
            inventoryFull,
            noisy: madeNoise,
            searchCount: loc.searchCount,
          },
        };
      }
      if (outcome === "clue") {
        const text = drawClue(loc);
        loc.discoveredInformation = loc.discoveredInformation || [];
        loc.discoveredInformation.push({ type: "clue", text });
        log(room, `${player.characterName} searches ${loc.name} and turns up a clue: "${text}"`, "teens");
        return { ok: true, apCost, searchResult: { type: "clue", text, noisy: madeNoise, searchCount: loc.searchCount } };
      }
      if (outcome === "vhs") {
        const text = drawLore();
        loc.discoveredInformation = loc.discoveredInformation || [];
        loc.discoveredInformation.push({ type: "vhs", text });
        log(room, `${player.characterName} searches ${loc.name} and finds an old home movie.`, "teens");
        return { ok: true, apCost, searchResult: { type: "vhs", text, noisy: madeNoise, searchCount: loc.searchCount } };
      }
      const ev = randomEvent();
      log(room, `${player.characterName} searches ${loc.name} and finds nothing. ${ev.text}`, "teens");
      return { ok: true, apCost, searchResult: { type: "nothing", note: ev.text, noisy: madeNoise, searchCount: loc.searchCount } };
    }
    case "take_item": {
      const items = loc.leftItems || [];
      const idx = items.findIndex((it) => it.uid === action.uid);
      if (idx < 0) return { error: "That item isn't here anymore." };
      const item = items[idx];
      // Taking an item is always free — the Search that found it (or a
      // teammate's) already spent the Action Point, same as Give/Discard.
      if (player.pendingDiscoveryUid === item.uid) player.pendingDiscoveryUid = null;
      if (item.utility === "capacity") {
        items.splice(idx, 1);
        player.itemCapacity += item.capacityBonus;
        log(room, `${player.characterName} picks up the ${item.name}. More room to carry gear now.`, "teens");
        return { ok: true, apCost: 0 };
      }
      if (player.items.length >= player.itemCapacity) {
        if (!action.dropItemId) return { error: "Your bag is full — choose something to leave behind first." };
        const dropIdx = player.items.findIndex((it) => it.id === action.dropItemId);
        if (dropIdx < 0) return { error: "You don't have that item." };
        const [dropped] = player.items.splice(dropIdx, 1);
        dropped.uid = `${dropped.id}_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
        loc.leftItems = loc.leftItems || [];
        loc.leftItems.push(dropped);
        items.splice(items.findIndex((it) => it.uid === action.uid), 1);
        player.items.push(item);
        log(room, `${player.characterName} leaves the ${dropped.name} behind and takes the ${item.name}.`, "teens");
        return { ok: true, apCost: 0 };
      }
      items.splice(idx, 1);
      player.items.push(item);
      log(room, `${player.characterName} picks up the ${item.name}.`, "teens");
      return { ok: true, apCost: 0 };
    }
    case "leave_item": {
      if (!player.pendingDiscoveryUid) return { error: "There's nothing pending to leave." };
      player.pendingDiscoveryUid = null;
      log(room, `${player.characterName} leaves it where it is.`, "teens");
      return { ok: true, apCost: 0 };
    }
    case "discard": {
      const idx = player.items.findIndex((it) => it.id === action.itemId);
      if (idx < 0) return { error: "You don't have that item." };
      const [item] = player.items.splice(idx, 1);
      log(room, `${player.characterName} drops the ${item.name}.`, "teens");
      return { ok: true, apCost: 0 };
    }
    case "use_item": {
      const idx = player.items.findIndex((it) => it.id === action.itemId);
      if (idx < 0) return { error: "You don't have that item." };
      const item = player.items[idx];
      if (item.utility === "heal") {
        if (player.hp >= player.hpMax) return { error: "You're not hurt." };
        const hpBefore = player.hp;
        player.hp = player.hpMax;
        player.items.splice(idx, 1);
        log(room, `${player.characterName} patches up with the ${item.name}.`, "teens");
        return { ok: true, itemUseResult: { itemId: item.id, itemName: item.name, type: "heal", hpBefore, hpAfter: player.hp, hpMax: player.hpMax } };
      }
      if (item.utility === "sanity") {
        const slasher = slasherOf(room);
        const monsterHere = slasher && slasher.location === player.location;
        if (item.noMonsterHere && monsterHere) return { error: "Not with the Slasher right here." };
        if (player.sanity >= player.sanityMax) return { error: "You're already at ease." };
        const sanityBefore = player.sanity;
        const grant = grantItemSanity(room, player, item.sanityAmount);
        if (item.moveBonus) player.tempSpeedBonus = (player.tempSpeedBonus || 0) + item.moveBonus;
        player.items.splice(idx, 1);
        log(room, grant > 0
          ? `${player.characterName} uses the ${item.name} and feels a little steadier.`
          : `${player.characterName} uses the ${item.name}, but it doesn't seem to help anymore.`, "teens");
        return {
          ok: true,
          sanityActionTaken: true,
          // A can of Monster Energy is a quick swig, not a whole Action
          // Point — drinking it doesn't cost the action its +1 Movement is
          // meant to apply to. Every other Sanity item still costs 1 AP.
          apCost: item.moveBonus ? 0 : 1,
          itemUseResult: {
            itemId: item.id,
            itemName: item.name,
            type: "sanity",
            sanityBefore,
            sanityAfter: player.sanity,
            moveBonus: item.moveBonus || 0,
          },
        };
      }
      return { error: "That item can't be used directly." };
    }
    case "revive": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status !== "dead") {
        return { error: "There's no one here to revive." };
      }
      const idx = player.items.findIndex((it) => it.id === "first_aid");
      if (idx < 0) return { error: "You need a First Aid Kit." };
      player.items.splice(idx, 1);
      target.status = "alive";
      target.hp = REVIVE_HP;
      target.sanity = Math.max(1, Math.floor(target.sanityMax / 2));
      if (target.broken && target.sanity >= BROKEN_RECOVER_SANITY) target.broken = false;
      log(room, `${player.characterName} revives ${target.characterName}!`, "teens");
      return { ok: true };
    }
    case "give": {
      const target = room.players.get(action.toPlayerId);
      if (!target || target.role !== "teen" || target.location !== player.location) {
        return { error: "That player isn't here." };
      }
      const idx = player.items.findIndex((it) => it.id === action.itemId);
      if (idx < 0) return { error: "You don't have that item." };
      if (target.items.length >= target.itemCapacity) return { error: "Their inventory is full." };
      const [item] = player.items.splice(idx, 1);
      target.items.push(item);
      log(room, `${player.characterName} hands the ${item.name} to ${target.characterName}.`, "teens");
      return { ok: true, apCost: 0 };
    }
    case "repair": {
      if (!loc.carSite) return { error: "The car is somewhere else." };
      if (room.objectives.carRepaired) return { error: "The car is already running." };
      const hasToolKit = player.items.some((it) => it.id === "tool_kit");
      room.objectives.carRepaired = true;
      room.carEverRepaired = true;
      grantObjectiveSanity(room, player, SANITY_GAIN_OBJECTIVE_PROGRESS);
      log(room, `${player.characterName} gets the engine running again.`, "teens");
      if (hasToolKit) log(room, `The Tool Kit makes quick, quiet work of it — no one heard a thing.`, "teens");
      else emitNoise(room, player.location, "noisy");
      return { ok: true, sanityActionTaken: true };
    }
    case "fight": {
      const slasher = slasherOf(room);
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      const weaponIdx = player.items.findIndex((it) => it.weapon);
      const weapon = weaponIdx >= 0 ? player.items[weaponIdx] : null;
      const chance = FIGHT_BASE + character.stats.strength * FIGHT_STRENGTH_MULT + (weapon?.bonus ?? 0)
        - sanityPenalty(player) - lateGameTier(room) * 10;
      room.thingRevealed = true;
      // A gunshot or a swung axe is loud whether or not it lands — matches
      // the "Noise: Loud" every weapon's item info actually promises.
      if (weapon) emitNoise(room, player.location, "loud");
      let killedMonster = false;
      if (roll(chance)) {
        let broke = false;
        if (weapon) {
          weapon.durability -= 1;
          if (weapon.durability <= 0) {
            player.items.splice(weaponIdx, 1);
            broke = true;
          }
        }
        const weaponName = weapon ? weapon.name : "bare hands";
        if (roll(STUN_CHANCE)) {
          room.monsterStunned = true;
          log(room, `${player.characterName} lands a solid hit with ${weaponName} — the monster reels, stunned!${broke ? ` The ${weaponName} shatters!` : ""}`);
        } else {
          room.monsterHp -= 1;
          log(room, `${player.characterName} wounds the monster with ${weaponName}! (${room.monsterHp}/${MONSTER_MAX_HP} HP left)${broke ? ` The ${weaponName} breaks in the process!` : ""}`);
          if (room.monsterHp <= 0) {
            grantMajorObjectiveSanityToAll(room);
            killedMonster = true;
          }
        }
      } else {
        log(room, `${player.characterName} strikes and misses — the monster retaliates!`);
        applyWound(room, player, 1);
      }
      return { ok: true, sanityActionTaken: killedMonster };
    }
    case "flee": {
      const slasher = slasherOf(room);
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      if (!neighborsOf(room, player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      const killer = killerInfo(room);
      let chance = FLEE_BASE + character.stats.stealth * FLEE_STEALTH_MULT - sanityPenalty(player) - lateGameTier(room) * 10;
      if (killer.id === "stalker") chance -= STALKER_FLEE_PENALTY;
      if (roll(chance)) {
        player.location = action.to;
        log(room, `${player.characterName} flees to ${room.board[action.to].name}!`, "teens");
        emitNoise(room, action.to, "noisy");
      } else {
        log(room, `${player.characterName} tries to flee but stumbles!`);
        room.thingRevealed = true;
        if (character.id !== "athlete") {
          applyWound(room, player, 1);
        } else {
          log(room, `${player.characterName} shrugs it off.`);
          loseSanity(room, player, SANITY_LOSS_FAILED_FEAR_CHECK);
        }
      }
      return { ok: true };
    }
    case "ritual": {
      if (!loc.ritualSite) return { error: "The ritual can only be performed here." };
      const need = ["ritual_candle", "occult_book", "cursed_tape"];
      const minNeeded = character.id === "nerd" ? 2 : 3;
      const have = hasItems(player, need);
      if (have.length < minNeeded) {
        return { error: `You need at least ${minNeeded} of: the candle, the occult book, and the cursed tape.` };
      }
      removeItems(player, have);
      room.monsterHp = 0;
      grantMajorObjectiveSanityToAll(room);
      log(room, `${player.characterName} performs the ritual. The monster is dragged screaming back into the tape.`, "teens");
      emitNoise(room, player.location, "noisy");
      return { ok: true, sanityActionTaken: true };
    }
    case "drive": {
      if (!loc.exit) return { error: "You need to find the way out first." };
      if (!hasItems(player, ["car_keys"]).length) return { error: "You need the car keys." };
      if (!room.objectives.carRepaired) return { error: "The car still needs to be repaired first." };
      const hasGasCan = hasItems(player, ["gas_can"]).length > 0;
      grantObjectiveSanity(room, player, hasGasCan ? SANITY_GAIN_MAJOR_OBJECTIVE + 2 : SANITY_GAIN_MAJOR_OBJECTIVE);
      player.status = "escaped";
      log(room, hasGasCan
        ? `${player.characterName} tops off the tank and peels out — no chance of running dry now!`
        : `${player.characterName} peels out and escapes!`);
      emitNoise(room, player.location, "loud");
      room.winner = "teens";
      room.winReason = `${player.characterName} escaped the park alive.`;
      room.phase = "ended";
      return { ok: true };
    }
    case "distract": {
      if (player.distractUsed) return { error: "You've already pulled that trick once this game." };
      const target = room.board[action.to];
      if (!target) return { error: "Unknown location." };
      if (action.to === player.location) return { error: "Pick somewhere else to fake the noise." };
      player.distractUsed = true;
      log(room, `${player.characterName} creates a diversion.`, "teens");
      emitNoise(room, action.to, "noisy", { fake: true });
      return { ok: true };
    }
    case "pass": {
      log(room, player.hiding ? `${player.characterName} stays hidden, listening.` : `${player.characterName} waits, listening.`, "teens");
      return { ok: true };
    }
    case "comfort": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status !== "alive") {
        return { error: "That teammate isn't here." };
      }
      if (target.id === player.id) return { error: "You can't comfort yourself." };
      if (hasActiveHorrorEvent(room, player.location)) return { error: "Something's still wrong here — you can't settle down." };
      if (target.comfortReceivedRound === room.round) {
        return { error: `${target.characterName} already had someone comfort them this round.` };
      }
      if (target.comfortGainTotal >= COMFORT_LIMIT) {
        return { error: `${target.characterName} doesn't need any more comforting.` };
      }
      if (room.comfortPairsThisRound.has(`${target.id}>${player.id}`)) {
        return { error: "You two already comforted each other this round." };
      }
      const baseGain = player.pickId === "leader" ? 15 : COMFORT_GAIN;
      const remaining = COMFORT_LIMIT - target.comfortGainTotal;
      const grant = Math.min(baseGain, remaining);
      target.comfortGainTotal += grant;
      target.comfortReceivedRound = room.round;
      room.comfortPairsThisRound.add(`${player.id}>${target.id}`);
      gainSanity(room, target, grant);
      log(room, `${player.characterName} comforts ${target.characterName}.`, "teens");
      return { ok: true };
    }
    default:
      return { error: "Unknown action." };
  }
}

function applyWound(room, player, amount) {
  const witnesses = aliveTeens(room).filter((t) => t.id !== player.id && t.location === player.location);
  player.hp = Math.max(0, player.hp - amount);
  if (player.hp <= 0) {
    const wasAlone = witnesses.length === 0;
    player.status = "dead";
    player.deathRound = room.round;
    player.deathLocation = player.location;
    player.knownDeaths?.add(player.id);
    room.killCount += 1;
    if (wasAlone) room.soloKillHappened = true;
    log(room, `${player.characterName} has been killed.`);
  } else {
    log(room, `${player.characterName} is injured.`);
    loseSanity(room, player, SANITY_LOSS_ATTACKED);
  }
  // Anyone else standing there watched it happen — they don't need to
  // separately "discover" this death later if they're the ones who saw it.
  witnesses.forEach((t) => {
    t.knownDeaths?.add(player.id);
    loseSanity(room, t, SANITY_LOSS_WITNESS_ATTACK);
  });
}

// Resolves a search that was started when the Slasher cornered a hiding
// teen. heldBreath=true means the teen survived the 10-second window
// (mashed space in time, or acted their way out); heldBreath=false means
// they were caught still and get one automatic chance to bolt.
export function resolveSearch(room, teenId, heldBreath) {
  const player = room.players.get(teenId);
  if (!player || !player.searching) return null;
  player.searching = false;
  player.searchEndsAt = null;

  if (heldBreath) {
    player.hiding = true;
    player.evadeCooldownLocation = player.location;
    log(room, `${player.characterName} holds perfectly still. The Killer moves on without finding them.`);
    return { found: false };
  }

  player.hiding = false;
  const character = TEEN_CHARACTERS[player.pickId];
  const killer = killerInfo(room);
  const chance = FLEE_BASE + character.stats.stealth * FLEE_STEALTH_MULT
    - sanityPenalty(player) - lateGameTier(room) * 10
    - (killer.id === "stalker" ? STALKER_FLEE_PENALTY : 0);
  const options = neighborsOf(room, player.location);
  const dest = options[Math.floor(Math.random() * options.length)];

  if (dest && roll(chance)) {
    player.location = dest;
    log(room, `${player.characterName} is found — but scrambles away to ${room.board[dest].name}!`, "teens");
    emitNoise(room, dest, "noisy");
  } else if (character.id === "athlete") {
    log(room, `${player.characterName} is found — but shrugs off the scare and holds their ground.`);
  } else {
    log(room, `${player.characterName} is found and caught!`);
    applyWound(room, player, killer.id === "thing" ? 2 : 1);
    checkWin(room);
  }
  return { found: true };
}

export function reportHoldBreath(room, playerId, success) {
  const player = room.players.get(playerId);
  if (!player || !player.searching) return { error: "No active search." };
  resolveSearch(room, playerId, success);
  return { ok: true };
}

function slasherAction(room, player, action) {
  if (room.monsterStunned) {
    room.monsterStunned = false;
    log(room, "The Monster is still reeling and can't act this turn!");
    return { ok: true };
  }

  const killer = killerInfo(room);
  const frozen = room.round <= SLASHER_FROZEN_ROUNDS;

  switch (action.type) {
    case "move": {
      if (frozen) return { error: "The Slasher is still getting its bearings and can't move yet." };
      if (!neighborsOf(room, player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      const prevLocation = player.location;
      player.location = action.to;
      player.stalkStreak = 0;
      clearEvadeCooldown(room, prevLocation);
      log(room, `The Slasher moves to ${room.board[action.to].name}.`, "slasher");
      scareTeensAt(room, action.to);
      return { ok: true };
    }
    case "attack": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status === "dead" || target.status === "escaped") {
        return { error: "That target isn't here." };
      }
      if (target.searching) return { error: "Already searching for them..." };
      room.thingRevealed = true;
      player.stalkStreak = 0;

      if (target.hiding) {
        if (target.evadeCooldownLocation === target.location) {
          return { error: `${target.characterName} gave you the slip here — you'll need to leave and come back before you can search again.` };
        }
        target.searching = true;
        target.searchEndsAt = Date.now() + SEARCH_DURATION_MS;
        log(room, `The ${killer.name} corners ${target.characterName}'s hiding spot and starts searching...`);
        return { ok: true, searchStarted: { teenId: target.id, endsAt: target.searchEndsAt } };
      }

      const chance = killer.attackBase + player.stalkStreak * killer.stalkBonus + killerDifficultyModifier(room);
      if (roll(chance)) {
        const dmg = killer.id === "thing" ? 2 : 1;
        log(room, killer.id === "thing"
          ? `Something wrong unfolds where ${target.characterName} was standing!`
          : `The Slasher strikes ${target.characterName}!`);
        applyWound(room, target, dmg);
      } else {
        log(room, `The attack lunges at ${target.characterName} and misses!`);
      }
      return { ok: true };
    }
    case "lurk": {
      const teenHere = [...room.players.values()].some(
        (p) => p.role === "teen" && p.status !== "dead" && p.status !== "escaped" && p.location === player.location
      );
      player.stalkStreak = teenHere ? player.stalkStreak + 1 : 0;
      log(room, `Something lurks in the shadows of ${room.board[player.location].name}...`, "slasher");
      return { ok: true };
    }
    case "sabotage": {
      if (!room.board[player.location]?.carSite) return { error: "There's nothing to sabotage here." };
      if (!room.objectives.carRepaired) return { error: "The car isn't repaired yet." };
      room.objectives.carRepaired = false;
      log(room, "The Monster tears into the engine — the car is wrecked again!");
      return { ok: true };
    }
    case "shortcut": {
      if (frozen) return { error: "The Slasher is still getting its bearings and can't move yet." };
      if (player.specialCooldown > 0) return { error: `Not ready yet (${player.specialCooldown} more turn(s)).` };
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.status === "dead" || target.status === "escaped") {
        return { error: "Invalid target." };
      }
      const prevLocation = player.location;
      player.location = target.location;
      player.stalkStreak = 0;
      player.specialCooldown = SPECIAL_COOLDOWN;
      clearEvadeCooldown(room, prevLocation);
      log(room, killer.id === "thing"
        ? `Something that looked exactly like ${target.characterName} was already waiting at ${room.board[target.location].name}...`
        : `The Stalker appears out of nowhere at ${room.board[target.location].name}!`, "slasher");
      scareTeensAt(room, target.location);
      return { ok: true };
    }
    default:
      return { error: "Unknown action." };
  }
}

// Substrings of existing log lines that make a good "key scene" in the
// post-game recap — deaths, sanity swings, monster hits, objective beats,
// and hide/catch outcomes. Reusing the log this way means the recap needs
// no separate instrumentation of its own to stay in sync with the rules.
const RECAP_KEYWORDS = [
  "has been killed",
  "breaks down completely",
  "pulls themself back together",
  "collapses, still at last",
  "Silence falls over the park",
  "REEL END",
  "escaped the park alive",
  "peels out and escapes",
  "performs the ritual",
  "gets the engine running again",
  "tears into the engine",
  "revives",
  "monster reels, stunned",
  "wounds the monster",
  "is found and caught",
  "scrambles away",
];

// Built once the match is over: the full log's secrecy no longer matters
// (nobody has anything left to protect), so this pulls straight from
// room.log — unfiltered by role — rather than the round-by-round scoped
// view everyone got while playing.
function buildRecap(room) {
  const killer = killerInfo(room);
  const cast = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    characterName: p.characterName,
    role: p.role,
    pickId: p.pickId,
    status: p.status,
    deathRound: p.deathRound,
    deathLocation: p.deathLocation ? room.board[p.deathLocation]?.name || null : null,
  }));
  const keyScenes = room.log
    .filter((e) => RECAP_KEYWORDS.some((k) => e.message.includes(k)))
    .map((e) => e.message);
  return {
    mapName: room.mapName,
    killerName: killer?.name || "The Slasher",
    winner: room.winner,
    winReason: room.winReason,
    cast,
    keyScenes,
    horrorEventsFired: room.horrorEventsFired,
  };
}

export function publicState(room, forPlayerId) {
  const requester = room.players.get(forPlayerId);
  const isSlasher = requester?.role === "slasher";
  const slasher = slasherOf(room);
  const killer = room.killerId ? killerInfo(room) : null;
  const identityHidden = room.phase === "playing" && killer?.id === "thing" && !room.thingRevealed;
  const slasherPresent =
    room.phase === "playing" && !isSlasher && requester && slasher && slasher.location === requester.location && !identityHidden;

  let slasherNearby = null;
  if (room.phase === "playing" && requester?.role === "teen" && slasher) {
    const near = neighborsOf(room, requester.location);
    slasherNearby = near.includes(slasher.location) ? slasher.location : null;
  }

  const canSeeKillerType = room.phase !== "playing" || isSlasher;

  const players = [...room.players.values()].map((p) => {
    const base = {
      id: p.id,
      name: p.name,
      characterName: p.characterName,
      role: p.role,
      pickId: p.role === "teen" || canSeeKillerType || p.id === forPlayerId ? p.pickId : null,
      status: p.status,
      hp: p.hp,
      hpMax: p.hpMax,
      sanity: p.sanity,
      sanityMax: p.sanityMax,
      hiding: p.hiding,
      searching: p.searching,
      searchEndsAt: p.searchEndsAt,
      evadeSafe: p.role === "teen" && p.hiding && p.evadeCooldownLocation === p.location,
      broken: p.broken,
      ready: p.ready,
      isBot: p.isBot,
      itemCount: p.items.length,
    };
    // The Slasher never sees a teen's exact location unless it's standing
    // right there with them — everything else it has to learn by listening
    // (see the Noise System / noiseAlerts below). Teens still always see
    // each other, as before, to coordinate.
    const canSeeLocation =
      room.phase !== "playing" ||
      p.id === forPlayerId ||
      (!isSlasher && p.role === "teen") ||
      (isSlasher && p.role === "teen" && slasher && p.location === slasher.location);
    if (canSeeLocation) base.location = p.location;
    if (p.id === forPlayerId) {
      base.items = p.items;
      base.itemCapacity = p.itemCapacity;
      base.specialCooldown = p.specialCooldown;
      base.distractUsed = p.distractUsed;
      base.pendingDiscoveryUid = p.pendingDiscoveryUid || null;
      base.tempSpeedBonus = p.tempSpeedBonus || 0;
      if (p.role === "teen") {
        base.actionsRemaining = p.actionsRemaining ?? TEEN_ACTIONS_PER_TURN;
        // Whether this teen's Special is available right now — the Leader's
        // Let's Go is once per round, the other three are once per turn.
        base.abilityReady = p.pickId === "leader" ? p.abilityUsedRound !== room.round : !p.abilityUsedTurn;
        base.locationInteraction = room.phase === "playing" ? computeLocationInteraction(room, p) : null;
      }
    }
    return base;
  });

  const visibleLog = room.log
    .filter((e) => {
      const scope = e.scope || "all";
      if (scope === "all") return true;
      if (scope === "teens") return !isSlasher;
      if (scope === "slasher") return isSlasher;
      return true;
    })
    .slice(-50);

  const secretObjectiveRevealed = room.phase === "ended" && room.killerSecretObjective;

  return {
    code: room.code,
    phase: room.phase,
    players,
    turnOrder: room.turnOrder,
    turnPlayerId: room.phase === "playing" ? currentPlayerId(room) : null,
    round: room.round,
    endsAt: room.endsAt,
    clockPhase: room.phase === "playing" ? (lateGameTier(room) === 2 ? "final" : lateGameTier(room) === 1 ? "tense" : "normal") : "normal",
    monsterHp: room.monsterHp,
    monsterMaxHp: MONSTER_MAX_HP,
    monsterStunned: room.monsterStunned,
    practice: room.practice,
    slasherFrozen: room.phase === "playing" && room.round <= SLASHER_FROZEN_ROUNDS,
    objectives: room.objectives,
    log: visibleLog,
    winner: room.winner,
    winReason: room.winReason,
    board: room.board ?? {},
    layout: room.layout ?? {},
    mapName: room.mapName,
    characters: TEEN_CHARACTERS,
    killers: KILLERS,
    you: forPlayerId,
    slasherPresent,
    slasherNearby,
    noiseAlerts: isSlasher ? room.noiseAlerts : [],
    sightings: isSlasher ? [] : room.sightings,
    activeHorrorEventLocations: [...room.horrorEvents.keys()],
    recentHorrorEvent:
      room.recentHorrorEvent && room.round - room.recentHorrorEvent.round <= 1 ? room.recentHorrorEvent : null,
    killerSecretObjective: isSlasher
      ? room.killerSecretObjective
      : secretObjectiveRevealed
        ? { name: room.killerSecretObjective.name, description: room.killerSecretObjective.description }
        : null,
    secretObjectiveAchieved: secretObjectiveRevealed ? room.killerSecretObjective.check(room) : null,
    recap: room.phase === "ended" ? buildRecap(room) : null,
  };
}

// Finds the location the bot should step to next in order to shorten its
// distance to a specific target location, via a breadth-first search over
// the board graph starting from the bot's own location.
function stepTowardLocation(room, fromLocation, targetLocationId) {
  if (!targetLocationId || targetLocationId === fromLocation) return null;
  const firstStep = new Map([[fromLocation, null]]);
  const queue = [fromLocation];
  while (queue.length) {
    const current = queue.shift();
    for (const next of neighborsOf(room, current)) {
      if (firstStep.has(next)) continue;
      const step = current === fromLocation ? next : firstStep.get(current);
      firstStep.set(next, step);
      if (next === targetLocationId) return step;
      queue.push(next);
    }
  }
  return null;
}

// The AI Slasher gets exactly the same information a human Slasher would —
// no cheating with real teen positions. It heads toward the loudest/most
// recent live Noise Alert; with no lead at all, it patrols a random
// neighbor rather than standing still, so it isn't just camping.
function latestNoiseTarget(room) {
  const active = room.noiseAlerts.filter((a) => room.round <= a.expiresRound);
  if (!active.length) return null;
  const loud = active.filter((a) => a.level === "loud");
  const pool = loud.length ? loud : active;
  return pool[pool.length - 1].locationId;
}

export function decideBotAction(room, bot) {
  const teensHere = aliveTeens(room).filter((t) => t.location === bot.location);
  const attackable = teensHere.filter((t) => !t.searching && !(t.hiding && t.evadeCooldownLocation === t.location));
  if (attackable.length > 0) {
    const target = attackable.find((t) => t.pickId === "rebel")
      || attackable.reduce((weakest, t) => (t.hp < weakest.hp ? t : weakest), attackable[0]);
    return { type: "attack", targetId: target.id };
  }
  if (teensHere.length > 0) {
    return { type: "lurk" };
  }

  if (room.board[bot.location]?.carSite && room.objectives.carRepaired) {
    return { type: "sabotage" };
  }

  const teensAlive = aliveTeens(room);
  if (teensAlive.length === 0) return { type: "lurk" };

  // Can't move or shortcut yet — still within the opening head-start window.
  if (room.round <= SLASHER_FROZEN_ROUNDS) return { type: "lurk" };

  if (bot.specialCooldown === 0 && Math.random() < 0.35) {
    const target = teensAlive[Math.floor(Math.random() * teensAlive.length)];
    return { type: "shortcut", targetId: target.id };
  }

  const noiseTarget = latestNoiseTarget(room);
  const step = noiseTarget
    ? stepTowardLocation(room, bot.location, noiseTarget)
    : neighborsOf(room, bot.location)[Math.floor(Math.random() * neighborsOf(room, bot.location).length)];
  if (step) return { type: "move", to: step };
  return { type: "lurk" };
}

// Generic BFS: finds the first step from fromLocation toward the nearest
// location matching isTarget. Used by AI teen companions to path toward a
// Safe Location, the car site, the ritual site, or the exit.
function stepToward(room, fromLocation, isTarget) {
  const firstStep = new Map([[fromLocation, null]]);
  const queue = [fromLocation];
  while (queue.length) {
    const current = queue.shift();
    for (const next of neighborsOf(room, current)) {
      if (firstStep.has(next)) continue;
      const step = current === fromLocation ? next : firstStep.get(current);
      firstStep.set(next, step);
      if (isTarget(room.board[next])) return step;
      queue.push(next);
    }
  }
  return null;
}

const TEEN_MISTAKE_CHANCE = 12; // percent

// AI-controlled teen companions for Solo Mode. Priority order: escape a
// pending search, survive a Monster encounter, hide from one sensed nearby,
// patch up, revive a fallen teammate, tend to Sanity, chase the current
// objective, or explore. A small chance of a "mistake" (a random, possibly
// suboptimal move) keeps them from feeling like perfectly coordinated
// computer players — real teenagers in a slasher movie panic sometimes.
export function decideTeenBotAction(room, bot) {
  const loc = room.board[bot.location];
  const character = TEEN_CHARACTERS[bot.pickId];
  const neighbors = neighborsOf(room, bot.location);
  const randomNeighbor = () => (neighbors.length ? neighbors[Math.floor(Math.random() * neighbors.length)] : null);

  // A find is waiting on a Take/Leave call — nothing else is legal until
  // it's resolved, so this always takes priority.
  if (bot.pendingDiscoveryUid) {
    const found = (loc.leftItems || []).find((it) => it.uid === bot.pendingDiscoveryUid);
    if (!found) return { type: "leave_item" };
    if (found.utility === "capacity" || bot.items.length < bot.itemCapacity) {
      return { type: "take_item", uid: found.uid };
    }
    // Bag's full — swap it in only if it's worth more than the least
    // useful thing already carried (a kit piece or a weapon/heal item).
    const worseIdx = bot.items.findIndex((it) => !it.kit && !it.weapon && it.utility !== "heal");
    if (found.kit && worseIdx >= 0) {
      return { type: "take_item", uid: found.uid, dropItemId: bot.items[worseIdx].id };
    }
    return { type: "leave_item" };
  }

  // Already mid-search (the Slasher cornered a hiding spot) — moving away
  // on this turn auto-resolves it as a successful getaway.
  if (bot.searching) {
    const dest = randomNeighbor();
    return dest ? { type: "move", to: dest } : { type: "pass" };
  }

  const slasher = slasherOf(room);
  const monsterHere = slasher && slasher.location === bot.location;

  if (monsterHere) {
    const weapon = bot.items.find((it) => it.weapon);
    if (weapon && bot.hp > 1 && roll(65)) return { type: "fight" };
    const dest = randomNeighbor();
    return dest ? { type: "flee", to: dest } : { type: "pass" };
  }

  // Sense the Monster next door but it hasn't arrived yet — worth hiding.
  const monsterNearby = slasher && neighbors.includes(slasher.location);
  if (monsterNearby && !bot.hiding && roll(40)) {
    return { type: "hide" };
  }

  // Occasional believable mistake: act on a whim instead of the "best" plan.
  if (roll(TEEN_MISTAKE_CHANCE)) {
    const mistakes = [{ type: "search" }, { type: "pass" }];
    const dest = randomNeighbor();
    if (dest) mistakes.push({ type: "move", to: dest });
    return mistakes[Math.floor(Math.random() * mistakes.length)];
  }

  // Patch up before anything else if hurt and able to.
  if (bot.hp < bot.hpMax) {
    const healIdx = bot.items.findIndex((it) => it.utility === "heal");
    if (healIdx >= 0) return { type: "use_item", itemId: bot.items[healIdx].id };
  }

  // Rescue a fallen teammate sharing this location.
  const deadHere = [...room.players.values()].filter(
    (p) => p.role === "teen" && p.location === bot.location && p.status === "dead"
  );
  if (deadHere.length > 0 && bot.items.some((it) => it.id === "first_aid")) {
    return { type: "revive", targetId: deadHere[0].id };
  }

  // Tend to Sanity: drink an Energy Drink if carrying one, or comfort a
  // struggling teammate.
  if (bot.sanity <= 30) {
    const sanityIdx = bot.items.findIndex((it) => it.utility === "sanity");
    if (sanityIdx >= 0) return { type: "use_item", itemId: bot.items[sanityIdx].id };
    const teammateHere = aliveTeens(room).find((t) => canComfort(room, bot, t));
    if (teammateHere) return { type: "comfort", targetId: teammateHere.id };
  }

  // Grab anything sitting here from an earlier search — free, no roll
  // needed — before deciding what else to do this turn.
  const leftHere = (loc.leftItems || [])[0];
  if (leftHere && (leftHere.utility === "capacity" || bot.items.length < bot.itemCapacity)) {
    return { type: "take_item", uid: leftHere.uid };
  }

  // Chase the current objective.
  const hasCarKeys = bot.items.some((it) => it.id === "car_keys");
  const ritualHave = bot.items.filter((it) => ["ritual_candle", "occult_book", "cursed_tape"].includes(it.id)).length;
  const ritualNeed = character?.id === "nerd" ? 2 : 3;

  if (loc.carSite && !room.objectives.carRepaired) return { type: "repair" };
  if (loc.ritualSite && ritualHave >= ritualNeed) return { type: "ritual" };
  if (loc.exit && room.objectives.carRepaired && hasCarKeys) return { type: "drive" };

  // Head toward whatever's most useful right now.
  let target = null;
  if (!room.objectives.carRepaired) target = (l) => l.carSite;
  else if (hasCarKeys) target = (l) => l.exit;
  else if (ritualHave < ritualNeed) target = (l) => l.ritualSite;

  if (target && !target(loc)) {
    const step = stepToward(room, bot.location, target);
    if (step) return { type: "move", to: step };
  }

  // No pressing objective: search here fairly often, otherwise explore —
  // occasionally toward a living teammate to regroup rather than scatter.
  if (roll(45)) return { type: "search" };
  if (roll(30)) {
    const teenLocations = new Set(aliveTeens(room).filter((t) => t.id !== bot.id).map((t) => t.location));
    if (teenLocations.size > 0) {
      const step = stepToward(room, bot.location, (l) => teenLocations.has(l.id));
      if (step) return { type: "move", to: step };
    }
  }
  const dest = randomNeighbor();
  return dest ? { type: "move", to: dest } : { type: "pass" };
}

export const KILLER_IDS = Object.keys(KILLERS);

export const constants = { MAX_TEENS, MONSTER_MAX_HP, GAME_DURATION_MS };
