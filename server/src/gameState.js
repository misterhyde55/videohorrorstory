import { LOCATIONS, START_LOCATIONS, neighbors } from "./board.js";
import { drawFromPool, randomEvent } from "./cards.js";
import { TEEN_CHARACTERS, KILLERS, SPECIAL_COOLDOWN } from "./characters.js";

const MAX_TEENS = 4;
const MAX_ITEMS = 6;
const MONSTER_MAX_HP = 3;
const GAME_DURATION_MS = 10 * 60 * 1000;
const TEEN_FIGHT_BASE = 30;
const JOCK_FIGHT_BONUS = 25;
const BASE_FLEE_CHANCE = 50;
const CHEERLEADER_FLEE_CHANCE = 80;
const STALKER_FLEE_CHANCE = 35;

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
    killerId: null,
    thingRevealed: false,
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
    p.location = START_LOCATIONS.teens[i % START_LOCATIONS.teens.length];
    p.items = [];
    p.hp = 2;
    p.status = "alive";
    p.characterName = TEEN_CHARACTERS[p.pickId].name;
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
  room.killerId = slasher.pickId;
  room.thingRevealed = false;
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

  switch (action.type) {
    case "move": {
      const maxHops = character.id === "cheerleader" ? 2 : 1;
      const reachableSet = reachable(player.location, maxHops);
      if (!reachableSet.has(action.to)) return { error: "That location isn't reachable from here." };
      player.location = action.to;
      log(room, `${player.characterName} moves to ${LOCATIONS[action.to].name}.`);
      return { ok: true };
    }
    case "search": {
      if (player.items.length >= MAX_ITEMS) return { error: "Your inventory is full." };
      const rerollOnMiss = character.id === "nerd" || (character.id === "pothead" && loc.searchPool === "light");
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
        if (player.hp >= 2) return { error: "You're not hurt." };
        player.hp = 2;
        player.items.splice(idx, 1);
        log(room, `${player.characterName} patches up with the ${item.name}.`);
        return { ok: true };
      }
      return { error: "That item can't be used directly." };
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
    case "fight": {
      const slasher = slasherOf(room);
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      const weapon = player.items.find((it) => it.weapon);
      const jockBonus = character.id === "jock" ? JOCK_FIGHT_BONUS : 0;
      const chance = TEEN_FIGHT_BASE + (weapon?.bonus ?? 0) + jockBonus;
      if (roll(chance)) {
        room.monsterHp -= 1;
        room.thingRevealed = true;
        log(room, `${player.characterName} lands a hit with ${weapon ? weapon.name : "bare hands"}! The monster reels (${room.monsterHp}/${MONSTER_MAX_HP} HP left).`);
      } else {
        room.thingRevealed = true;
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
      let chance = killer.id === "stalker" ? STALKER_FLEE_CHANCE : BASE_FLEE_CHANCE;
      if (character.id === "cheerleader") chance = CHEERLEADER_FLEE_CHANCE;
      if (roll(chance)) {
        player.location = action.to;
        log(room, `${player.characterName} flees to ${LOCATIONS[action.to].name}!`);
      } else {
        log(room, `${player.characterName} tries to flee but stumbles!`);
        room.thingRevealed = true;
        if (character.id !== "jock") applyWound(room, player, 1);
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
  const killer = killerInfo(room);

  switch (action.type) {
    case "move": {
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      player.location = action.to;
      player.stalkStreak = 0;
      log(room, `The Slasher moves to ${LOCATIONS[action.to].name}.`);
      return { ok: true };
    }
    case "attack": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status === "dead" || target.status === "escaped") {
        return { error: "That target isn't here." };
      }
      const chance = killer.attackBase + player.stalkStreak * killer.stalkBonus;
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
  if (room.phase === "playing" && requester?.role === "teen" && requester.pickId === "pothead" && slasher) {
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
    const target = teensHere.reduce((weakest, t) => (t.hp < weakest.hp ? t : weakest), teensHere[0]);
    return { type: "attack", targetId: target.id };
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
