import { socket } from "../socket";
import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";

export default function Lobby({ state, playerId, onLeave, onShowHelp }) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = state.players[0]?.id === playerId;
  const slasherCount = state.players.filter((p) => p.role === "slasher").length;
  const teenCount = state.players.filter((p) => p.role === "teen").length;
  const takenCharacters = new Set(
    state.players.filter((p) => p.role === "teen" && p.id !== playerId && p.pickId).map((p) => p.pickId)
  );

  function setRole(role) {
    socket.emit("set_role", { role });
  }
  function setCharacter(characterId) {
    socket.emit("set_character", { characterId }, (res) => {
      if (!res?.ok) alert(res?.error || "Could not select character.");
    });
  }
  function setKiller(killerId) {
    socket.emit("set_killer", { killerId }, (res) => {
      if (!res?.ok) alert(res?.error || "Could not select killer.");
    });
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
        <button className="btn btn-ghost" onClick={onShowHelp} type="button">How to Play</button>
        <button className="btn btn-ghost" onClick={onLeave} type="button">Leave</button>
      </div>

      <div className="lobby-grid">
        <div>
          <h3>Players ({state.players.length}/5)</h3>
          <ul className="player-roster">
            {state.players.map((p) => (
              <li key={p.id} className={p.id === playerId ? "me" : ""}>
                <span className={`role-tag role-${p.role}`}>{p.role === "slasher" ? "Slasher" : "Teen"}</span>
                <span className="pname">
                  {p.name}{p.id === playerId ? " (you)" : ""}
                  {p.pickId && p.role === "teen" && ` — ${TEEN_CHARACTERS[p.pickId]?.name}`}
                  {p.pickId && p.role === "slasher" && ` — ${KILLERS[p.pickId]?.name}`}
                </span>
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

        <div>
          {me?.role === "teen" ? (
            <>
              <h3>Choose Your Teen</h3>
              <div className="pick-grid">
                {Object.values(TEEN_CHARACTERS).map((c) => {
                  const taken = takenCharacters.has(c.id);
                  const selected = me.pickId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`pick-card${selected ? " selected" : ""}${taken ? " taken" : ""}`}
                      disabled={taken}
                      onClick={() => setCharacter(c.id)}
                    >
                      <span className="pick-icon">{c.icon}</span>
                      <span className="pick-name">{c.name}</span>
                      <span className="pick-tagline">{c.tagline}</span>
                      <div className="stat-row">
                        {STAT_LABELS.map((s) => (
                          <span key={s.key} className="stat-chip-mini" title={s.label}>
                            {s.icon} {c.stats[s.key]}
                          </span>
                        ))}
                      </div>
                      <span className="pick-ability">{c.ability}</span>
                      {taken && <span className="pick-taken-badge">Taken</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : me?.role === "slasher" ? (
            <>
              <h3>Choose Your Killer</h3>
              <div className="pick-grid">
                {Object.values(KILLERS).map((k) => {
                  const selected = me.pickId === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      className={`pick-card killer${selected ? " selected" : ""}`}
                      onClick={() => setKiller(k.id)}
                    >
                      <span className="pick-icon">{k.icon}</span>
                      <span className="pick-name">{k.name}</span>
                      <span className="pick-tagline">{k.tagline}</span>
                      <span className="pick-ability">{k.ability}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
