import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { customAlphabet } from "nanoid";
import {
  createRoom,
  addPlayer,
  removePlayer,
  setRole,
  setReady,
  canStart,
  startGame,
  applyAction,
  publicState,
} from "./gameState.js";

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });

/** @type {Map<string, ReturnType<typeof createRoom>>} */
const rooms = new Map();
// roomCode -> Map<playerId, socketId>
const roomSockets = new Map();
// socket.id -> { code, playerId }
const socketMeta = new Map();

function broadcast(code) {
  const room = rooms.get(code);
  const sockets = roomSockets.get(code);
  if (!room || !sockets) return;
  for (const [playerId, socketId] of sockets.entries()) {
    io.to(socketId).emit("state", publicState(room, playerId));
  }
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
    ack?.(result);
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
  if (room.players.size === 0) {
    rooms.delete(meta.code);
    roomSockets.delete(meta.code);
    return;
  }
  broadcast(meta.code);
}

httpServer.listen(PORT, () => {
  console.log(`VHS server listening on :${PORT}`);
});
