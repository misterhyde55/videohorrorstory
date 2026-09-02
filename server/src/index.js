import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { customAlphabet } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRoom,
  addPlayer,
  addBot,
  removePlayer,
  setRole,
  setReady,
  setCharacter,
  setKiller,
  canStart,
  startGame,
  applyAction,
  checkClockExpired,
  decideBotAction,
  decideTeenBotAction,
  publicState,
  reportHoldBreath,
  KILLER_IDS,
} from "./gameState.js";
import { TEEN_CHARACTERS } from "./characters.js";

const AI_TEEN_NAMES = ["Riley", "Sam", "Casey", "Jordan"];
const PRACTICE_DURATION_MS = 4 * 60 * 1000;

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// If a built client (client/dist) is present alongside the server, serve it
// so the whole app can run behind a single port — handy for previewing in a
// sandbox where only one port gets forwarded. Not used in the normal
// two-service deploy (Render for this server, Vercel/Netlify for the client).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/health).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });

/** @type {Map<string, ReturnType<typeof createRoom>>} */
const rooms = new Map();
// roomCode -> Map<playerId, socketId>
const roomSockets = new Map();
// socket.id -> { code, playerId }
const socketMeta = new Map();

const botTimersPending = new Set();

function broadcast(code) {
  const room = rooms.get(code);
  const sockets = roomSockets.get(code);
  if (room && sockets) {
    for (const [playerId, socketId] of sockets.entries()) {
      io.to(socketId).emit("state", publicState(room, playerId));
    }
  }
  maybeRunBot(code);
}

// If an action started a timed search (the Slasher cornered a hiding teen),
// schedule a server-side fallback that resolves it as a failed hold-breath
// if the client never reports back (e.g. the tab is idle or disconnects) —
// this is what makes ignoring the search actually costly.
function scheduleSearchSettlement(code, result) {
  if (!result?.searchStarted) return;
  const { teenId, endsAt } = result.searchStarted;
  setTimeout(() => {
    const liveRoom = rooms.get(code);
    if (!liveRoom) return;
    reportHoldBreath(liveRoom, teenId, false);
    broadcast(code);
  }, Math.max(0, endsAt - Date.now()) + 1200);
}

// If it's currently a bot's turn, schedule it to act after a short "thinking"
// beat — just enough to read as a deliberate move rather than an instant
// flicker, never long enough to feel like the game is making anyone wait.
// A round with 3 AI teens and an AI Slasher used to cost 4.4-7.2s of dead
// air between a human's turns; this keeps every individual bot turn under
// a second so tension comes from uncertainty, not from watching AI think.
function maybeRunBot(code) {
  const room = rooms.get(code);
  if (!room || room.phase !== "playing" || room.winner || botTimersPending.has(code)) return;
  const currentId = room.turnOrder[room.turnIndex];
  const current = room.players.get(currentId);
  if (!current?.isBot) return;

  botTimersPending.add(code);
  setTimeout(() => {
    botTimersPending.delete(code);
    const liveRoom = rooms.get(code);
    if (!liveRoom || liveRoom.phase !== "playing" || liveRoom.winner) return;
    const liveId = liveRoom.turnOrder[liveRoom.turnIndex];
    const liveBot = liveRoom.players.get(liveId);
    if (!liveBot?.isBot) return;
    const decide = liveBot.role === "slasher" ? decideBotAction : decideTeenBotAction;
    const result = applyAction(liveRoom, liveId, decide(liveRoom, liveBot));
    scheduleSearchSettlement(code, result);
    broadcast(code);
  }, 350 + Math.random() * 350);
}

function ensureRoomCode() {
  let code;
  do {
    code = makeCode();
  } while (rooms.has(code));
  return code;
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name, playerId }, ack) => {
    try {
      const code = ensureRoomCode();
      const room = createRoom(code, playerId);
      addPlayer(room, playerId, name);
      rooms.set(code, room);
      roomSockets.set(code, new Map([[playerId, socket.id]]));
      socketMeta.set(socket.id, { code, playerId });
      socket.join(code);
      ack?.({ ok: true, code });
      broadcast(code);
    } catch (err) {
      ack?.({ ok: false, error: "Could not create room." });
    }
  });

  socket.on("join_room", ({ code, name, playerId }, ack) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) return ack?.({ ok: false, error: "Room not found." });
    const normalizedCode = room.code;
    const isReconnect = room.players.has(playerId);
    if (!isReconnect && room.phase !== "lobby") {
      return ack?.({ ok: false, error: "That game has already started." });
    }
    if (!isReconnect && room.players.size >= 5) {
      return ack?.({ ok: false, error: "Room is full." });
    }
    addPlayer(room, playerId, name);
    if (!roomSockets.has(normalizedCode)) roomSockets.set(normalizedCode, new Map());
    roomSockets.get(normalizedCode).set(playerId, socket.id);
    socketMeta.set(socket.id, { code: normalizedCode, playerId });
    socket.join(normalizedCode);
    ack?.({ ok: true, code: normalizedCode });
    broadcast(normalizedCode);
  });

  socket.on("create_solo_room", ({ name, playerId, characterId, killerId, role, practice }, ack) => {
    try {
      const code = ensureRoomCode();
      const room = createRoom(code, playerId);
      const resolvedKillerId = KILLER_IDS.includes(killerId)
        ? killerId
        : KILLER_IDS[Math.floor(Math.random() * KILLER_IDS.length)];

      if (role === "killer") {
        // Practice-as-Killer: the human stalks, all 4 teens are AI-controlled.
        addPlayer(room, playerId, name, "slasher");
        const killerResult = setKiller(room, playerId, resolvedKillerId);
        if (killerResult.error) return ack?.({ ok: false, error: killerResult.error });
        setReady(room, playerId, true);

        Object.keys(TEEN_CHARACTERS).forEach((charId, i) => {
          const teenBotId = addBot(room, "teen", AI_TEEN_NAMES[i] || `Teen ${i + 1}`);
          setCharacter(room, teenBotId, charId);
          setReady(room, teenBotId, true);
        });
      } else {
        addPlayer(room, playerId, name, "teen");
        const charResult = setCharacter(room, playerId, characterId);
        if (charResult.error) return ack?.({ ok: false, error: charResult.error });

        const botId = addBot(room, "slasher", "The Slasher");
        setKiller(room, botId, resolvedKillerId);
        setReady(room, playerId, true);

        // Solo mode isn't a solo grind: 3 AI-controlled teens round the party
        // out to a full four, so the human isn't the Monster's only target.
        const remainingCharacterIds = Object.keys(TEEN_CHARACTERS).filter((id) => id !== characterId);
        remainingCharacterIds.forEach((charId, i) => {
          const teenBotId = addBot(room, "teen", AI_TEEN_NAMES[i] || `Teen ${i + 1}`);
          setCharacter(room, teenBotId, charId);
          setReady(room, teenBotId, true);
        });
      }

      rooms.set(code, room);
      roomSockets.set(code, new Map([[playerId, socket.id]]));
      socketMeta.set(socket.id, { code, playerId });
      socket.join(code);

      const check = canStart(room);
      if (!check.ok) return ack?.({ ok: false, error: check.reason });
      if (practice) room.practice = true;
      startGame(room, { durationMs: practice ? PRACTICE_DURATION_MS : undefined });
      ack?.({ ok: true, code });
      broadcast(code);
    } catch (err) {
      ack?.({ ok: false, error: "Could not start solo game." });
    }
  });

  socket.on("set_role", ({ role }, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    const result = setRole(room, meta.playerId, role);
    ack?.(result);
    broadcast(meta.code);
  });

  socket.on("set_ready", ({ ready }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    setReady(room, meta.playerId, ready);
    broadcast(meta.code);
  });

  socket.on("set_character", ({ characterId }, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    const result = setCharacter(room, meta.playerId, characterId);
    ack?.(result);
    broadcast(meta.code);
  });

  socket.on("set_killer", ({ killerId }, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    const result = setKiller(room, meta.playerId, killerId);
    ack?.(result);
    broadcast(meta.code);
  });

  socket.on("start_game", (_payload, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    if (room.hostId !== meta.playerId) return ack?.({ ok: false, error: "Only the host can start the game." });
    const check = canStart(room);
    if (!check.ok) return ack?.({ ok: false, error: check.reason });
    startGame(room);
    ack?.({ ok: true });
    broadcast(meta.code);
  });

  socket.on("action", (action, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    const result = applyAction(room, meta.playerId, action);
    scheduleSearchSettlement(meta.code, result);
    ack?.(result);
    broadcast(meta.code);
  });

  socket.on("hold_breath_result", ({ success }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    reportHoldBreath(room, meta.playerId, !!success);
    broadcast(meta.code);
  });

  socket.on("leave_room", () => {
    handleLeave(socket);
  });

  socket.on("disconnect", () => {
    handleLeave(socket, { onlyLobby: true });
  });
});

function handleLeave(socket, { onlyLobby = false } = {}) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;
  const room = rooms.get(meta.code);
  socketMeta.delete(socket.id);
  const sockets = roomSockets.get(meta.code);
  if (sockets) sockets.delete(meta.playerId);
  if (!room) return;
  if (!onlyLobby || room.phase === "lobby") {
    removePlayer(room, meta.playerId);
  }
  const remaining = [...room.players.values()];
  if (remaining.length === 0 || remaining.every((p) => p.isBot)) {
    rooms.delete(meta.code);
    roomSockets.delete(meta.code);
    botTimersPending.delete(meta.code);
    return;
  }
  broadcast(meta.code);
}

setInterval(() => {
  for (const [code, room] of rooms) {
    if (checkClockExpired(room)) broadcast(code);
  }
}, 1000);

httpServer.listen(PORT, () => {
  console.log(`VHS server listening on :${PORT}`);
});
