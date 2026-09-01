import { LOCATIONS, START_LOCATIONS, neighbors, isAdjacentOrSame } from "./board.js";
import { drawFromPool, randomEvent, ITEMS } from "./cards.js";

const MAX_TEENS = 4;
const MAX_ITEMS = 6;
const MONSTER_MAX_HP = 3;
const REEL_ROUNDS = 15;
const TEEN_FIGHT_BASE = 30;
const SLASHER_ATTACK_BASE = 45;
const SLASHER_STALK_BONUS = 15;
const FLEE_CHANCE = 50;

const TEEN_NAMES = ["Ashley", "Corey", "Marcus", "Dana"];

export function createRoom(code, hostId) {
  return {
    code,
    hostId,
    phase: "lobby", // lobby | playing | ended
    players: new Map(), // id -> player
    turnOrder: [],
    turnIndex: 0,
    round: 1,
    reelRoundsLeft: REEL_ROUNDS,
    monsterHp: MONSTER_MAX_HP,
    log: [],
    winner: null, // 'teens' | 'slasher'
    winReason: null,
    createdAt: Date.now(),
  };
}

export function addPlayer(room, id, name) {
  if (room.players.has(id)) return;
  const role = room.players.size === 0 ? "slasher" : "teen";
  room.players.set(id, {
    id,
    name: name?.slice(0, 20) || "Player",
    role,
    location: null,
    items: [],
    hp: 2,
    status: "alive", // alive | injured is derived from hp | dead | escaped
    stalkStreak: 0,
    ready: false,
  });
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
  player.role = role;
  return { ok: true };
}

export function setReady(room, id, ready) {
  const player = room.players.get(id);
  if (player) player.ready = ready;
}

export function canStart(room) {
  const players = [...room.players.values()];
  const slashers = players.filter((p) => p.role === "slasher");
  const teens = players.filter((p) => p.role === "teen");
  if (slashers.length !== 1) return { ok: false, reason: "Exactly one player must be the Slasher." };
  if (teens.length < 1) return { ok: false, reason: "At least one teen is needed." };
  if (!players.every((p) => p.ready)) return { ok: false, reason: "Not everyone is ready." };
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
    p.characterName = TEEN_NAMES[i % TEEN_NAMES.length];
  });
  slasher.location = START_LOCATIONS.slasher;
  slasher.stalkStreak = 0;

  room.phase = "playing";
  room.turnOrder = [...teens.map((p) => p.id), slasher.id];
  room.turnIndex = 0;
  room.round = 1;
  room.reelRoundsLeft = REEL_ROUNDS;
  room.monsterHp = MONSTER_MAX_HP;
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

function advanceTurn(room) {
  if (room.winner) return;
  const n = room.turnOrder.length;
  if (n === 0) return;
  for (let i = 0; i < n; i++) {
    room.turnIndex = (room.turnIndex + 1) % n;
    if (room.turnIndex === 0) {
      room.round += 1;
      room.reelRoundsLeft -= 1;
    }
    const pid = currentPlayerId(room);
    const player = room.players.get(pid);
    if (player && player.status !== "dead" && player.status !== "escaped") break;
  }
  checkTimeout(room);
}

function checkTimeout(room) {
  if (room.winner) return;
  if (room.reelRoundsLeft <= 0) {
    room.winner = "slasher";
    room.winReason = "The tape ran out. Dawn never comes for them.";
    room.phase = "ended";
    log(room, "REEL END. The tape runs out — the Slasher wins.");
  }
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
  return ids.every((id) => player.items.some((it) => it.id === id));
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

export function applyAction(room, playerId, action) {
  if (room.phase !== "playing") return { error: "Game is not in progress." };
  if (currentPlayerId(room) !== playerId) return { error: "It's not your turn." };
  const player = room.players.get(playerId);
  if (!player) return { error: "Unknown player." };

  const result = player.role === "slasher" ? slasherAction(room, player, action) : teenAction(room, player, action);
  if (result?.error) return result;

  checkWin(room);
  if (!room.winner && result?.consumeTurn !== false) advanceTurn(room);
  return { ok: true };
}

function teenAction(room, player, action) {
  if (player.status === "dead" || player.status === "escaped") return { error: "You cannot act." };
  const loc = LOCATIONS[player.location];

  switch (action.type) {
    case "move": {
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      player.location = action.to;
      log(room, `${player.characterName} moves to ${LOCATIONS[action.to].name}.`);
      return { ok: true };
    }
    case "search": {
      if (player.items.length >= MAX_ITEMS) return { error: "Your inventory is full." };
      const item = drawFromPool(loc.searchPool);
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
      const slasher = [...room.players.values()].find((p) => p.role === "slasher");
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      const weapon = player.items.find((it) => it.weapon);
      const chance = TEEN_FIGHT_BASE + (weapon?.bonus ?? 0);
      if (roll(chance)) {
        room.monsterHp -= 1;
        log(room, `${player.characterName} lands a hit with ${weapon ? weapon.name : "bare hands"}! The monster reels (${room.monsterHp}/${MONSTER_MAX_HP} HP left).`);
      } else {
        player.hp -= 1;
        log(room, `${player.characterName} strikes and misses — the monster retaliates!`);
        applyWound(room, player);
      }
      return { ok: true };
    }
    case "flee": {
      const slasher = [...room.players.values()].find((p) => p.role === "slasher");
      if (!slasher || slasher.location !== player.location) return { error: "The Slasher isn't here." };
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      if (roll(FLEE_CHANCE)) {
        player.location = action.to;
        log(room, `${player.characterName} flees to ${LOCATIONS[action.to].name}!`);
      } else {
        log(room, `${player.characterName} tries to flee but stumbles!`);
        player.hp -= 1;
        applyWound(room, player);
      }
      return { ok: true };
    }
    case "ritual": {
      if (!loc.ritualSite) return { error: "The ritual can only be performed at the Root Cellar." };
      const need = ["ritual_candle", "occult_book", "cursed_tape"];
      if (!hasItems(player, need)) return { error: "You need the candle, the occult book, and the cursed tape." };
      removeItems(player, need);
      room.monsterHp = 0;
      log(room, `${player.characterName} performs the ritual. The monster is dragged screaming back into the tape.`);
      return { ok: true };
    }
    case "drive": {
      if (!loc.exit) return { error: "You need to reach the Entrance Road first." };
      if (!hasItems(player, ["car_keys", "gas_can"])) return { error: "You need the car keys and a gas can." };
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

function applyWound(room, player) {
  if (player.hp <= 0) {
    player.hp = 0;
    player.status = "dead";
    log(room, `${player.characterName} has been killed.`);
  } else {
    log(room, `${player.characterName} is injured.`);
  }
}

function slasherAction(room, player, action) {
  switch (action.type) {
    case "move": {
      if (!neighbors(player.location).includes(action.to)) return { error: "That location isn't reachable from here." };
      const wasHere = [...room.players.values()].some(
        (p) => p.role === "teen" && p.status === "alive" && p.location === player.location
      );
      player.location = action.to;
      player.stalkStreak = 0;
      log(room, `The Slasher moves to ${LOCATIONS[action.to].name}.`);
      return { ok: true, quiet: !wasHere };
    }
    case "attack": {
      const target = room.players.get(action.targetId);
      if (!target || target.role !== "teen" || target.location !== player.location || target.status === "dead" || target.status === "escaped") {
        return { error: "That target isn't here." };
      }
      const chance = SLASHER_ATTACK_BASE + player.stalkStreak * SLASHER_STALK_BONUS;
      if (roll(chance)) {
        target.hp -= 1;
        log(room, `The Slasher strikes ${target.characterName}!`);
        applyWound(room, target);
      } else {
        log(room, `The Slasher lunges at ${target.characterName} and misses!`);
      }
      player.stalkStreak = 0;
      return { ok: true };
    }
    case "lurk": {
      const teenHere = [...room.players.values()].some(
        (p) => p.role === "teen" && p.status !== "dead" && p.status !== "escaped" && p.location === player.location
      );
      player.stalkStreak = teenHere ? player.stalkStreak + 1 : 0;
      log(room, `The Slasher lurks in the shadows of ${LOCATIONS[player.location].name}...`);
      return { ok: true };
    }
    default:
      return { error: "Unknown action." };
  }
}

export function publicState(room, forPlayerId) {
  const requester = room.players.get(forPlayerId);
  const isSlasher = requester?.role === "slasher";
  const slasher = [...room.players.values()].find((p) => p.role === "slasher");
  const slasherPresent =
    room.phase === "playing" && !isSlasher && requester && slasher && slasher.location === requester.location;

  const players = [...room.players.values()].map((p) => {
    const base = {
      id: p.id,
      name: p.name,
      characterName: p.characterName,
      role: p.role,
      status: p.status,
      hp: p.hp,
      ready: p.ready,
      itemCount: p.items.length,
    };
    const canSeeLocation = room.phase !== "playing" || p.role === "teen" || isSlasher || p.id === forPlayerId;
    if (canSeeLocation) base.location = p.location;
    if (p.id === forPlayerId) base.items = p.items;
    return base;
  });

  return {
    code: room.code,
    phase: room.phase,
    players,
    turnPlayerId: room.phase === "playing" ? currentPlayerId(room) : null,
    round: room.round,
    reelRoundsLeft: room.reelRoundsLeft,
    monsterHp: room.monsterHp,
    monsterMaxHp: MONSTER_MAX_HP,
    log: room.log.slice(-50),
    winner: room.winner,
    winReason: room.winReason,
    board: LOCATIONS,
    you: forPlayerId,
    slasherPresent,
  };
}

export const constants = { MAX_TEENS, MONSTER_MAX_HP, REEL_ROUNDS };
