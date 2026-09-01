import { useState } from "react";
import { TEEN_CHARACTERS, KILLERS } from "../data/characters";

export default function Home({ onCreate, onJoin, onSolo, disabled }) {
  const [name, setName] = useState(localStorage.getItem("vhs_name") || "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("create");
  const [soloCharacter, setSoloCharacter] = useState(null);
  const [soloKiller, setSoloKiller] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") onCreate(name.trim());
    else if (mode === "join") {
      if (code.trim()) onJoin(name.trim(), code.trim());
    } else if (mode === "solo") {
      if (soloCharacter) onSolo(name.trim(), soloCharacter, soloKiller);
    }
  }

  return (
    <div className="panel home-panel">
      <p className="tagline">
        A haunted VCR has released something into the world. Four teenagers. One night.
        <br />
        Escape. Kill it. Or send it back into the tape.
      </p>

      <div className="tabs">
        <button className={mode === "create" ? "tab active" : "tab"} onClick={() => setMode("create")} type="button">
          Host a Game
        </button>
        <button className={mode === "join" ? "tab active" : "tab"} onClick={() => setMode("join")} type="button">
          Join a Game
        </button>
        <button className={mode === "solo" ? "tab active" : "tab"} onClick={() => setMode("solo")} type="button">
          Play Solo
        </button>
      </div>

      <form onSubmit={submit} className={mode === "solo" ? "form-stack solo-form" : "form-stack"}>
        <label>
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ashley" required />
        </label>

        {mode === "join" && (
          <label>
            Room Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="XXXX"
              required
              className="code-input"
            />
          </label>
        )}

        {mode === "solo" && (
          <>
            <p className="solo-blurb">
              Play against an AI-controlled Slasher — no other players needed.
            </p>

            <span className="solo-label">Choose Your Teen</span>
            <div className="pick-grid">
              {Object.values(TEEN_CHARACTERS).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`pick-card${soloCharacter === c.id ? " selected" : ""}`}
                  onClick={() => setSoloCharacter(c.id)}
                >
                  <span className="pick-icon">{c.icon}</span>
                  <span className="pick-name">{c.name}</span>
                  <span className="pick-tagline">{c.tagline}</span>
                  <span className="pick-ability">{c.ability}</span>
                </button>
              ))}
            </div>

            <span className="solo-label">Choose Your Opponent</span>
            <div className="pick-grid">
              <button
                type="button"
                className={`pick-card killer${soloKiller === null ? " selected" : ""}`}
                onClick={() => setSoloKiller(null)}
              >
                <span className="pick-icon">🎲</span>
                <span className="pick-name">Surprise Me</span>
                <span className="pick-tagline">Randomly picks a killer for you.</span>
              </button>
              {Object.values(KILLERS).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className={`pick-card killer${soloKiller === k.id ? " selected" : ""}`}
                  onClick={() => setSoloKiller(k.id)}
                >
                  <span className="pick-icon">{k.icon}</span>
                  <span className="pick-name">{k.name}</span>
                  <span className="pick-tagline">{k.tagline}</span>
                  <span className="pick-ability">{k.ability}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || (mode === "solo" && !soloCharacter)}
        >
          {mode === "create" ? "Create Room" : mode === "join" ? "Join Room" : "Start Solo Game"}
        </button>
      </form>
    </div>
  );
}
