import { socket } from "../socket";

export default function Lobby({ state, playerId, onLeave }) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = state.players[0]?.id === playerId;
  const slasherCount = state.players.filter((p) => p.role === "slasher").length;
  const teenCount = state.players.filter((p) => p.role === "teen").length;

  function setRole(role) {
    socket.emit("set_role", { role });
  }
  function toggleReady() {
    socket.emit("set_ready", { ready: !me.ready });
  }
  function startGame() {
    socket.emit("start_game", {}, (res) => {
      if (!res?.ok) alert(res?.error || "Could not start.");
    });
  }

  return (
    <div className="panel">
      <div className="room-code-box">
        <span>Room Code</span>
        <strong>{state.code}</strong>
        <button className="btn btn-ghost" onClick={onLeave} type="button">Leave</button>
      </div>

      <div className="lobby-grid">
        <div>
          <h3>Players ({state.players.length}/5)</h3>
          <ul className="player-roster">
            {state.players.map((p) => (
              <li key={p.id} className={p.id === playerId ? "me" : ""}>
                <span className={`role-tag role-${p.role}`}>{p.role === "slasher" ? "Slasher" : "Teen"}</span>
                <span className="pname">{p.name}{p.id === playerId ? " (you)" : ""}</span>
                <span className={p.ready ? "ready-dot ready" : "ready-dot"}>{p.ready ? "Ready" : "Waiting"}</span>
              </li>
            ))}
          </ul>

          <div className="role-picker">
            <button
              type="button"
              className={me?.role === "teen" ? "btn btn-secondary active" : "btn btn-secondary"}
              onClick={() => setRole("teen")}
              disabled={teenCount >= 4 && me?.role !== "teen"}
            >
              Play as a Teen
            </button>
            <button
              type="button"
              className={me?.role === "slasher" ? "btn btn-danger active" : "btn btn-danger"}
              onClick={() => setRole("slasher")}
              disabled={slasherCount >= 1 && me?.role !== "slasher"}
            >
              Become the Slasher
            </button>
          </div>

          <button className="btn btn-primary wide" onClick={toggleReady} type="button">
            {me?.ready ? "Not Ready" : "I'm Ready"}
          </button>

          {isHost && (
            <button className="btn btn-accent wide" onClick={startGame} type="button">
              Start Game
            </button>
          )}
        </div>

        <div className="rules-card">
          <h3>How to Survive</h3>
          <p><strong>Teens</strong> search the camp for gear, then either:</p>
          <ul>
            <li>🚗 <strong>Escape</strong> — find the Car Keys + Gas Can, reach the Entrance Road, and drive.</li>
            <li>🔪 <strong>Kill it</strong> — find a weapon and fight the monster where you find it.</li>
            <li>📼 <strong>Banish it</strong> — gather the Candle, Occult Book &amp; Cursed Tape and perform the ritual at the Root Cellar.</li>
          </ul>
          <p><strong>The Slasher</strong> stalks the camp and attacks any teen it catches. All teens dead, or the tape reel runs out — the Slasher wins.</p>
        </div>
      </div>
    </div>
  );
}
