import { LOCATIONS, START_LOCATIONS, neighbors } from "./board.js";
import { drawFromPool, randomEvent, randomHallucination } from "./cards.js";
import { TEEN_CHARACTERS, KILLERS, SPECIAL_COOLDOWN } from "./characters.js";

const MAX_TEENS = 4;
const MAX_ITEMS = 6;
const MONSTER_MAX_HP = 3;
const GAME_DURATION_MS = 10 * 60 * 1000;

const FIGHT_BASE = 25;
const FIGHT_STRENGTH_MULT = 10;
const STUN_CHANCE = 50;

const FLEE_BASE = 30;
const FLEE_STEALTH_MULT = 12;
const STALKER_FLEE_PENALTY = 15;

const SHAKEN_PENALTY = 10;
const PANIC_PENALTY = 20;
const PANIC_STUMBLE_CHANCE = 20;
const HALLUCINATION_CHANCE = 30;

const REVIVE_HP = 1;

export function createRoom(code, hostId) {
  return {
    code,
    hostId,
    phase: "lobby", // lobby | playing | ended
    players: new Map(), // id -> player
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
    hp: 2,
    hpMax: 2,
    sanity: 0,
    sanityMax: 0,
    status: "alive", // alive | dead | escaped
    stalkStreak: 0,
    specialCooldown: 0,
    ready: false,
    isBot: false,
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

export function removePlayer(room, id) {
  room.players.delete(id);
  room.turnOrder = room.turnOrder.filter((pid) => pid !== id);
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

function log(room, message) {
  room.log.push({ t: Date.now(), message });
  if (room.log.length > 200) room.log.shift();
}

export function startGame(room) {
  const players = [...room.players.values()];
  const teens = players.filter((p) => p.role === "teen");
  const slasher = players.find((p) => p.role === "slasher");

  teens.forEach((p, i) => {
    const character = TEEN_CHARACTERS[p.pickId];
    p.location = START_LOCATIONS.teens[i % START_LOCATIONS.teens.length];
    p.items = [];
    p.hp = character.stats.health;
    p.hpMax = character.stats.health;
    p.sanity = character.stats.sanity;
    p.sanityMax = character.stats.sanity;
    p.status = "alive";
    p.characterName = character.name;
  });
  slasher.location = START_LOCATIONS.slasher;
  slasher.stalkStreak = 0;
  slasher.specialCooldown = 0;

  room.phase = "playing";
  room.turnOrder = [...teens.map((p) => p.id), slasher.id];
  room.turnIndex = 0;
  room.round = 1;
  room.endsAt = Date.now() + GAME_DURATION_MS;
  room.monsterHp = MONSTER_MAX_HP;
  room.monsterStunned = false;
  room.killerId = slasher.pickId;
  room.thingRevealed = false;
  room.objectives = { carRepaired: false };
  room.winner = null;
  room.winReason = null;
  room.log = [];
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

// 0 = normal, 1 = final third of the clock, 2 = final countdown. The Monster
// hits harder and Sanity drains faster for isolated teens as this rises.
function lateGameTier(room) {
  if (!room.endsAt) return 0;
  const fraction = (room.endsAt - Date.now()) / GAME_DURATION_MS;
  if (fraction <= 0.15) return 2;
  if (fraction <= 0.33) return 1;
  return 0;
}

function sanityTier(player) {
  if (player.sanity <= 0) return "panicked";
  if (player.sanity <= 1) return "shaken";
  return "steady";
}

function sanityPenalty(player) {
  const tier = sanityTier(player);
  if (tier === "panicked") return PANIC_PENALTY;
  if (tier === "shaken") return SHAKEN_PENALTY;
  return 0;
}

// Being alone drains Sanity; grouping up with teammates restores it (faster
// if a Leader is present). Called once per completed teen turn.
function applySanityTick(room, player) {
  const roommates = aliveTeens(room).filter((t) => t.location === player.location);
  const others = roommates.filter((t) => t.id !== player.id);
  const before = sanityTier(player);
  if (others.length > 0) {
    const hasLeader = roommates.some((t) => t.pickId === "leader");
    player.sanity = Math.min(player.sanityMax, player.sanity + (hasLeader ? 2 : 1));
  } else {
    const drain = lateGameTier(room) >= 2 ? 2 : 1;
    player.sanity = Math.max(0, player.sanity - drain);
  }
  const after = sanityTier(player);
  if (after === before) return;
  if (after === "panicked") log(room, `${player.characterName} is panicking — their mind is unraveling.`);
  else if (after === "shaken") log(room, `${player.characterName} is badly shaken.`);
  else if (after === "steady") log(room, `${player.characterName} steadies their nerves.`);
}

// The jump-scare of the Monster appearing costs Sanity immediately. Skipped
// for a still-disguised Thing, since the teens don't consciously see it.
function scareTeensAt(room, locationId) {
  const killer = killerInfo(room);
  if (killer.id === "thing" && !room.thingRevealed) return;
  aliveTeens(room)
    .filter((t) => t.location === locationId)
    .forEach((t) => {
      const before = sanityTier(t);
      t.sanity = Math.max(0, t.sanity - 1);
      const after = sanityTier(t);
      if (after !== before && after === "panicked") log(room, `${t.characterName} is panicking — their mind is unraveling.`);
      else if (after !== before && after === "shaken") log(room, `${t.characterName} is badly shaken.`);
    });
}

function advanceTurn(room) {
  if (room.winner) return;
  const n = room.turnOrder.length;
  if (n === 0) return;
  for (let i = 0; i < n; i++) {
    room.turnIndex = (room.turnIndex + 1) % n;
    if (room.turnIndex === 0) room.round += 1;
    const pid = currentPlayerId(room);
    const player = room.players.get(pid);
    if (player && player.status !== "dead" && player.status !== "escaped") break;
  }
}

export function checkClockExpired(room) {
  if (room.phase === "playing" && room.endsAt && Date.now() >= room.endsAt) {
    room.winner = "slasher";
    room.winReason = "The tape ran out. Dawn never comes for them.";
    room.phase = "ended";
    log(room, "REEL END. The tape runs out — the Slasher wins.");
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
    room.winner = "slasher";
    room.winReason = "Every teen has fallen.";
    room.phase = "ended";
    log(room, "Silence falls over the camp. The Slasher wins.");
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

function reachable(locationId, hops) {
  let frontier = new Set([locationId]);
  const seen = new Set([locationId]);
  for (let i = 0; i < hops; i++) {
    const next = new Set();
    for (const loc of frontier) {
      for (const n of neighbors(loc)) {
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

export function applyAction(room, playerId, action) {
  if (checkClockExpired(room)) return { error: "Time is up." };
  if (room.phase !== "playing") return { error: "Game is not in progress." };
  if (currentPlayerId(room) !== playerId) return { error: "It's not your turn." };
  const player = room.players.get(playerId);
  if (!player) return { error: "Unknown player." };

  const result = player.role === "slasher" ? slasherAction(room, player, action) : teenAction(room, player, action);
  if (result?.error) return result;

  if (player.role === "teen" && player.status === "alive" && result?.consumeTurn !== false) {
    applySanityTick(room, player);
  }
  if (player.role === "slasher" && action.type !== "shortcut" && player.specialCooldown > 0) {
    player.specialCooldown -= 1;
  }

  checkWin(room);
  if (!room.winner && result?.consumeTurn !== false) advanceTurn(room);
  return { ok: true };
}

function teenAction(room, player, action) {
  if (player.status === "dead" || player.status === "escaped") return { error: "You cannot act." };
  const loc = LOCATIONS[player.location];
  const character = TEEN_CHARACTERS[player.pickId];
  const tier = sanityTier(player);

  if (tier === "panicked" && roll(HALLUCINATION_CHANCE)) {
    log(room, `${player.characterName}: "${randomHallucination()}"`);
  }

  switch (action.type) {
    case "move": {
      const speed = tier === "panicked" ? 1 : character.stats.speed;
      const reachableSet = reachable(player.location, speed);
      if (!reachableSet.has(action.to)) return { error: "That location isn't reachable from here." };
      let destination = action.to;
      let stumbled = false;
      if (tier === "panicked" && roll(PANIC_STUMBLE_CHANCE)) {
        const options = [...reachableSet].filter((l) => l !== action.to);
        if (options.length) {
          destination = options[Math.floor(Math.random() * options.length)];
          stumbled = true;
        }
      }
      player.location = destination;
      log(room, stumbled
        ? `${player.characterName} panics and stumbles into ${LOCATIONS[destination].name} instead!`
        : `${player.characterName} moves to ${LOCATIONS[destination].name}.`);
      return { ok: true };
    }
    case "search": {
      if (player.items.length >= MAX_ITEMS) return { error: "Your inventory is full." };
      const rerollOnMiss = character.id === "nerd" || character.id === "leader";
      let item = drawFromPool(loc.searchPool);
      if (!item && rerollOnMiss) item = drawFromPool(loc.searchPool);
      if (item) {
        player.items.push(item);
        log(room, `${player.characterName} searches ${loc.name} and finds ${item.name}.`);
      } else {
        const ev = randomEvent();
        log(room, `${player.characterName} searches ${loc.name} and finds nothing. ${ev.text}`);
      }
      return { ok: true };
    }
    case "use_item": {
      const idx = player.items.findIndex((it) => it.id === action.itemId);
      if (idx < 0) return { error: "You don't have that item." };
      const item = player.items[idx];
      if (item.utility === "heal") {
        if (player.hp >= player.hpMax) return { error: "You're not hurt." };
        player.hp = player.hpMax;
        player.items.splice(idx, 1);
        log(room, `${player.characterName} patches up with the ${item.name}.`);
        return { ok: true };
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
      log(room, `${player.characterName} revives ${target.characterName}!`);
      return { ok: true };
    }
    case "give": {
      const target = room.players.get(action.toPlayerId);
      if (!target || target.role !== "teen" || target.location !== player.location) {
        return { error: "That player isn't here." };
      }
      const idx = player.items.findIndex((it) => it.id === action.itemId);
      if (idx < 0) return { error: "You don't have that item." };
      if (target.items.length >= MAX_ITEMS) return { error: "Their inventory is full." };
      const [item] = player.items.splice(idx, 1);
      target.items.push(item);
      log(room, `${player.characterName} hands the ${item.name} to ${target.characterName}.`);
      return { ok: true, consumeTurn: false };
    }
    case "repair": {
      if (loc.id !== "parking_lot") return { error: "The car is back at the Parking Lot." };
      if (room.objectives.carRepaired) return { error: "The car is already running." };
      if (!player.items.some((it) => it.id === "tool_kit")) return { error: "You need a tool kit to repair the car." };
      room.objectives.carRepaired = true;
      log(room, `${player.characterName} gets the engine running again.`);
      return { ok: true };
    }
    case "fight": {
      const slasher = slasherOf(room);
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      const weaponIdx = player.items.findIndex((it) => it.weapon);
      const weapon = weaponIdx >= 0 ? player.items[weaponIdx] : null;
      const chance = FIGHT_BASE + character.stats.strength * FIGHT_STRENGTH_MULT + (weapon?.bonus ?? 0)
        - sanityPenalty(player) - lateGameTier(room) * 10;
      room.thingRevealed = true;
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
        }
      } else {
        log(room, `${player.characterName} strikes and misses — the monster retaliates!`);
        applyWound(room, player, 1);
      }
      return { ok: true };
    }
    case "flee": {
      const slasher = slasherOf(room);
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      const killer = killerInfo(room);
      let chance = FLEE_BASE + character.stats.stealth * FLEE_STEALTH_MULT - sanityPenalty(player) - lateGameTier(room) * 10;
      if (killer.id === "stalker") chance -= STALKER_FLEE_PENALTY;
      if (roll(chance)) {
        player.location = action.to;
        log(room, `${player.characterName} flees to ${LOCATIONS[action.to].name}!`);
      } else {
        log(room, `${player.characterName} tries to flee but stumbles!`);
        room.thingRevealed = true;
        if (character.id !== "athlete") applyWound(room, player, 1);
        else log(room, `${player.characterName} shrugs it off.`);
      }
      return { ok: true };
    }
    case "ritual": {
      if (!loc.ritualSite) return { error: "The ritual can only be performed at the Root Cellar." };
      const need = ["ritual_candle", "occult_book", "cursed_tape"];
      const minNeeded = character.id === "nerd" ? 2 : 3;
      const have = hasItems(player, need);
      if (have.length < minNeeded) {
        return { error: `You need at least ${minNeeded} of: the candle, the occult book, and the cursed tape.` };
      }
      removeItems(player, have);
      room.monsterHp = 0;
      log(room, `${player.characterName} performs the ritual. The monster is dragged screaming back into the tape.`);
      return { ok: true };
    }
    case "drive": {
      if (!loc.exit) return { error: "You need to reach the Entrance Road first." };
      if (hasItems(player, ["car_keys", "gas_can"]).length < 2) return { error: "You need the car keys and a gas can." };
      if (!room.objectives.carRepaired) return { error: "The car still needs to be repaired at the Parking Lot." };
      player.status = "escaped";
      log(room, `${player.characterName} peels out down the Entrance Road and escapes!`);
      room.winner = "teens";
      room.winReason = `${player.characterName} escaped camp alive.`;
      room.phase = "ended";
      return { ok: true };
    }
    case "pass": {
      log(room, `${player.characterName} waits, listening.`);
      return { ok: true };
    }
    default:
      return { error: "Unknown action." };
  }
}

function applyWound(room, player, amount) {
  player.hp = Math.max(0, player.hp - amount);
  if (player.hp <= 0) {
    player.status = "dead";
    log(room, `${player.characterName} has been killed.`);
  } else {
    log(room, `${player.characterName} is injured.`);
  }
}

function slasherAction(room, player, action) {
  if (room.monsterStunned) {
    room.monsterStunned = false;
    log(room, "The Monster is still reeling and can't act this turn!");
    return { ok: true };
  }

  const killer = killerInfo(room);

  switch (action.type) {
    case "move": {
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      player.location = action.to;
      player.stalkStreak = 0;
      log(room, `The Slasher moves to ${LOCATIONS[action.to].name}.`);
      scareTeensAt(room, action.to);
      return { ok: true };
    }
    case "attack": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status === "dead" || target.status === "escaped") {
        return { error: "That target isn't here." };
      }
      const chance = killer.attackBase + player.stalkStreak * killer.stalkBonus + lateGameTier(room) * 10;
      room.thingRevealed = true;
      if (roll(chance)) {
        const dmg = killer.id === "thing" ? 2 : 1;
        log(room, killer.id === "thing"
          ? `Something wrong unfolds where ${target.characterName} was standing!`
          : `The Slasher strikes ${target.characterName}!`);
        applyWound(room, target, dmg);
      } else {
        log(room, `The attack lunges at ${target.characterName} and misses!`);
      }
      player.stalkStreak = 0;
      return { ok: true };
    }
    case "lurk": {
      const teenHere = [...room.players.values()].some(
        (p) => p.role === "teen" && p.status !== "dead" && p.status !== "escaped" && p.location === player.location
      );
      player.stalkStreak = teenHere ? player.stalkStreak + 1 : 0;
      log(room, `Something lurks in the shadows of ${LOCATIONS[player.location].name}...`);
      return { ok: true };
    }
    case "sabotage": {
      if (player.location !== "parking_lot") return { error: "There's nothing to sabotage here." };
      if (!room.objectives.carRepaired) return { error: "The car isn't repaired yet." };
      room.objectives.carRepaired = false;
      log(room, "The Monster tears into the engine — the car is wrecked again!");
      return { ok: true };
    }
    case "shortcut": {
      if (player.specialCooldown > 0) return { error: `Not ready yet (${player.specialCooldown} more turn(s)).` };
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.status === "dead" || target.status === "escaped") {
        return { error: "Invalid target." };
      }
      player.location = target.location;
      player.stalkStreak = 0;
      player.specialCooldown = SPECIAL_COOLDOWN;
      log(room, killer.id === "thing"
        ? `Something that looked exactly like ${target.characterName} was already waiting at ${LOCATIONS[target.location].name}...`
        : `The Stalker appears out of nowhere at ${LOCATIONS[target.location].name}!`);
      scareTeensAt(room, target.location);
      return { ok: true };
    }
    default:
      return { error: "Unknown action." };
  }
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
    const near = neighbors(requester.location);
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
      ready: p.ready,
      itemCount: p.items.length,
    };
    const canSeeLocation = room.phase !== "playing" || p.role === "teen" || isSlasher || p.id === forPlayerId;
    if (canSeeLocation) base.location = p.location;
    if (p.id === forPlayerId) {
      base.items = p.items;
      base.specialCooldown = p.specialCooldown;
    }
    return base;
  });

  return {
    code: room.code,
    phase: room.phase,
    players,
    turnPlayerId: room.phase === "playing" ? currentPlayerId(room) : null,
    round: room.round,
    endsAt: room.endsAt,
    monsterHp: room.monsterHp,
    monsterMaxHp: MONSTER_MAX_HP,
    monsterStunned: room.monsterStunned,
    objectives: room.objectives,
    log: room.log.slice(-50),
    winner: room.winner,
    winReason: room.winReason,
    board: LOCATIONS,
    characters: TEEN_CHARACTERS,
    killers: KILLERS,
    you: forPlayerId,
    slasherPresent,
    slasherNearby,
  };
}

// Finds the location the bot should step to next in order to shorten its
// distance to the nearest living teen, via a breadth-first search over the
// board graph starting from the bot's own location.
function stepTowardNearestTeen(room, fromLocation) {
  const teenLocations = new Set(aliveTeens(room).map((t) => t.location));
  if (teenLocations.size === 0) return null;

  const firstStep = new Map([[fromLocation, null]]);
  const queue = [fromLocation];
  while (queue.length) {
    const current = queue.shift();
    for (const next of neighbors(current)) {
      if (firstStep.has(next)) continue;
      const step = current === fromLocation ? next : firstStep.get(current);
      firstStep.set(next, step);
      if (teenLocations.has(next)) return step;
      queue.push(next);
    }
  }
  return null;
}

export function decideBotAction(room, bot) {
  const teensHere = aliveTeens(room).filter((t) => t.location === bot.location);
  if (teensHere.length > 0) {
    const target = teensHere.find((t) => t.pickId === "rebel")
      || teensHere.reduce((weakest, t) => (t.hp < weakest.hp ? t : weakest), teensHere[0]);
    return { type: "attack", targetId: target.id };
  }

  if (bot.location === "parking_lot" && room.objectives.carRepaired) {
    return { type: "sabotage" };
  }

  const teensAlive = aliveTeens(room);
  if (teensAlive.length === 0) return { type: "lurk" };

  if (bot.specialCooldown === 0 && Math.random() < 0.35) {
    const target = teensAlive[Math.floor(Math.random() * teensAlive.length)];
    return { type: "shortcut", targetId: target.id };
  }

  const step = stepTowardNearestTeen(room, bot.location);
  if (step) return { type: "move", to: step };
  return { type: "lurk" };
}

export const KILLER_IDS = Object.keys(KILLERS);

export const constants = { MAX_TEENS, MONSTER_MAX_HP, GAME_DURATION_MS };
