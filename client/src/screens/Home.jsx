import { useState } from "react";
import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";
import HeroScene from "../components/HeroScene";

const TAGLINE_LINES = [
  "AN 80s HORROR ADVENTURE",
  "A CURSED TAPE.",
  "A MONSTER FROM BEYOND.",
  "FOUR KIDS.",
  "ONE CHANCE TO SURVIVE.",
];

export default function Home({ onCreate, onJoin, onSolo, onShowHelp, disabled }) {
  const [name, setName] = useState(localStorage.getItem("vhs_name") || "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState(null);
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
    <div className="menu-screen">
      <div className="menu-hero">
        <div className="menu-left">
          <div className="menu-logo">
            <span className="glitch-lg">VHS</span>
            <div className="menu-subtitle">Video Horror Story</div>
          </div>

          <div className="menu-tagline">
            {TAGLINE_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <nav className="menu-list">
            <button type="button" className={`menu-item${mode === "create" ? " active" : ""}`} onClick={() => setMode("create")}>
              <span className="menu-arrow">{mode === "create" ? "▶" : ""}</span> Host a Game
            </button>
            <button type="button" className={`menu-item${mode === "join" ? " active" : ""}`} onClick={() => setMode("join")}>
              <span className="menu-arrow">{mode === "join" ? "▶" : ""}</span> Join a Game
            </button>
            <button type="button" className={`menu-item${mode === "solo" ? " active" : ""}`} onClick={() => setMode("solo")}>
              <span className="menu-arrow">{mode === "solo" ? "▶" : ""}</span> Play Solo
            </button>
            <button type="button" className="menu-item" onClick={onShowHelp}>
              <span className="menu-arrow" /> How to Play
            </button>
          </nav>

          <div className="menu-footer-box">
            Rewind the past.<br />Survive the night.
          </div>
        </div>

        <div className="menu-right">
          <div className="vcr-clock">
            <span className="vcr-clock-digits">12:00</span>
            <span className="vcr-clock-label">SP</span>
          </div>
          <HeroScene />
        </div>
      </div>

      <div className="tape-slot">
        {!mode && <p className="tape-prompt">◀ Insert Tape — pick an option above ▶</p>}

        {mode && (
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
                <p className="solo-blurb">Play against an AI-controlled Slasher — no other players needed.</p>

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
                      <div className="stat-row">
                        {STAT_LABELS.map((s) => (
                          <span key={s.key} className="stat-chip-mini" title={s.label}>
                            {s.icon} {c.stats[s.key]}
                          </span>
                        ))}
                      </div>
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
        )}
      </div>
    </div>
  );
}
