import { io } from "socket.io-client";

// Unset -> localhost:3001 (the default separate-dev-server setup).
// Explicitly set to an empty string -> connect to the page's own origin
// (used when the server also hosts the built client on a single port).
const configured = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = configured === undefined ? "http://localhost:3001" : configured;

export const socket = SERVER_URL ? io(SERVER_URL, { autoConnect: true }) : io({ autoConnect: true });

const PLAYER_ID_KEY = "vhs_player_id";

export function getPlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
