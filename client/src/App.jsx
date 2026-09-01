import { useEffect, useState, useCallback } from "react";
import { socket, getPlayerId } from "./socket";
import Home from "./screens/Home";
import Lobby from "./screens/Lobby";
import GameScreen from "./screens/Game";
import HowToPlay from "./components/HowToPlay";
import "./App.css";

const SAVED_ROOM_KEY = "vhs_room_code";

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const playerId = getPlayerId();

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      const savedCode = localStorage.getItem(SAVED_ROOM_KEY);
      const savedName = localStorage.getItem("vhs_name");
      if (savedCode && savedName) {
        socket.emit("join_room", { code: savedCode, name: savedName, playerId }, (res) => {
          if (!res?.ok) localStorage.removeItem(SAVED_ROOM_KEY);
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s) => setState(s);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state", onState);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state", onState);
    };
  }, [playerId]);

  const createRoom = useCallback((name) => {
    setError("");
    localStorage.setItem("vhs_name", name);
    socket.emit("create_room", { name, playerId }, (res) => {
      if (res?.ok) localStorage.setItem(SAVED_ROOM_KEY, res.code);
      else setError(res?.error || "Failed to create room.");
    });
  }, [playerId]);

  const joinRoom = useCallback((name, code) => {
    setError("");
    localStorage.setItem("vhs_name", name);
    socket.emit("join_room", { code: code.toUpperCase(), name, playerId }, (res) => {
      if (res?.ok) localStorage.setItem(SAVED_ROOM_KEY, res.code);
      else setError(res?.error || "Failed to join room.");
    });
  }, [playerId]);

  const soloGame = useCallback((name, characterId, killerId) => {
    setError("");
    localStorage.setItem("vhs_name", name);
    socket.emit("create_solo_room", { name, playerId, characterId, killerId }, (res) => {
      if (res?.ok) localStorage.setItem(SAVED_ROOM_KEY, res.code);
      else setError(res?.error || "Failed to start solo game.");
    });
  }, [playerId]);

  const leaveRoom = useCallback(() => {
    socket.emit("leave_room");
    localStorage.removeItem(SAVED_ROOM_KEY);
    setState(null);
  }, []);

  return (
    <div className="vhs-app">
      <div className="scanlines" />
      {state && (
        <header className="vhs-header">
          <h1>
            <span className="glitch">VHS</span>
            <small>video horror story</small>
          </h1>
          {!connected && <span className="badge badge-danger">reconnecting…</span>}
          <button className="btn btn-ghost header-help" onClick={() => setShowHelp(true)} type="button">
            How to Play
          </button>
        </header>
      )}

      {error && <div className="banner banner-error">{error}</div>}

      {!state && (
        <Home
          onCreate={createRoom}
          onJoin={joinRoom}
          onSolo={soloGame}
          onShowHelp={() => setShowHelp(true)}
          disabled={!connected}
        />
      )}
      {state && state.phase === "lobby" && (
        <Lobby state={state} playerId={playerId} onLeave={leaveRoom} onShowHelp={() => setShowHelp(true)} />
      )}
      {state && state.phase !== "lobby" && <GameScreen state={state} playerId={playerId} onLeave={leaveRoom} />}

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
