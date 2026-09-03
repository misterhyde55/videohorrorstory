import { useState } from "react";
import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";

export default function SoloSetup({ name, setName, onBack, onSolo, disabled }) {
  const [soloCharacter, setSoloCharacter] = useState(null);
  const [soloKiller, setSoloKiller] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !soloCharacter) return;
    onSolo(name.trim(), soloCharacter, soloKiller);
  }

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <span className="setup-logo">VHS</span>
        <h2 className="setup-title">Solo Setup</h2>
        <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back to Main Menu</button>
      </div>

      <form onSubmit={submit} className="setup-body solo-setup-body">
        <p className="solo-blurb">
          No other players needed — 3 AI teens join your side, and an AI plays the Slasher.
        </p>

        <label className="setup-name-field">
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ashley" required />
        </label>

        <div className="setup-columns">
          <div className="setup-column">
            <span className="solo-label">Choose Your Teen</span>
            <div className="pick-grid compact">
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
          </div>

          <div className="setup-column">
            <span className="solo-label">Choose Your Opponent</span>
            <div className="pick-grid compact">
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
          </div>
        </div>

        <div className="tape-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back</button>
          <button type="submit" className="btn btn-primary" disabled={disabled || !soloCharacter}>
            Start Solo Game
          </button>
        </div>
      </form>
    </div>
  );
}
