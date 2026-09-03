import { useEffect, useRef, useState } from "react";
import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";
import { startAudioOnGesture, playHoverBlip, playSelectClick, isMuted, setMuted } from "../utils/sound";
import heroImage from "../assets/hero-tv.jpg";

const TAGLINE_LINES = [
  "AN 80s HORROR ADVENTURE",
  "A CURSED TAPE.",
  "A MONSTER FROM BEYOND.",
  "FOUR KIDS.",
  "ONE CHANCE TO SURVIVE.",
];

export default function Home({ onCreate, onJoin, onSolo, onShowHelp, onShowTutorial, disabled }) {
  const [name, setName] = useState(localStorage.getItem("vhs_name") || "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState(null);
  const [soloCharacter, setSoloCharacter] = useState(null);
  const [soloKiller, setSoloKiller] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const screenRef = useRef(null);

  // The first real click or keypress anywhere on this screen is what lets
  // the browser's autoplay policy allow any sound at all — this listener
  // exists purely to catch that first gesture, then gets out of the way.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    const onFirstGesture = () => startAudioOnGesture();
    el.addEventListener("pointerdown", onFirstGesture, { once: true });
    el.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      el.removeEventListener("pointerdown", onFirstGesture);
      el.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  const menuItems = [
    { key: "create", label: "Host a Game", onSelect: () => setMode("create") },
    { key: "join", label: "Join a Game", onSelect: () => setMode("join") },
    { key: "solo", label: "Play Solo", onSelect: () => setMode("solo") },
    { key: "tutorial", label: "Tutorial", onSelect: () => onShowTutorial() },
    { key: "help", label: "How to Play", onSelect: () => onShowHelp() },
    { key: "settings", label: "Settings", onSelect: () => setShowSettings(true) },
  ];

  function selectCursor(i) {
    setCursor((prev) => {
      if (prev !== i) playHoverBlip();
      return i;
    });
  }

  function activate(i) {
    playSelectClick();
    menuItems[i].onSelect();
  }

  // Retro up/down + Enter navigation, only while the main menu itself is
  // showing — once a mode is picked the form below owns normal Tab/Enter.
  useEffect(() => {
    if (mode) return undefined;
    function onKeyDown(e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => {
          const next = (c + 1) % menuItems.length;
          playHoverBlip();
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => {
          const next = (c - 1 + menuItems.length) % menuItems.length;
          playHoverBlip();
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(cursor);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cursor]);

  function toggleMuted() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

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
    <div className="menu-screen" ref={screenRef}>
      <div className="vcr-hud vcr-hud-tl">
        <span className="vcr-hud-line">VHS-1987</span>
        <span className="vcr-hud-line vcr-play-indicator">PLAY <span className="vcr-play-arrow">&#9654;</span></span>
      </div>
      <div className="vcr-hud vcr-hud-tr">
        <span className="vcr-hud-clock">--:--</span>
        <span className="vcr-hud-line">SP</span>
      </div>

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

          <nav className="menu-list" aria-label="Main menu">
            {menuItems.map((item, i) => (
              <button
                key={item.key}
                type="button"
                className={`menu-item${cursor === i ? " active" : ""}`}
                onMouseEnter={() => selectCursor(i)}
                onFocus={() => selectCursor(i)}
                onClick={() => activate(i)}
              >
                <span className="menu-arrow">{cursor === i ? "▶" : ""}</span>
                <span className="menu-item-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="menu-footer-row">
            <div className="menu-footer-box">
              Rewind the past.<br />Survive the night.
            </div>
            <div className="bkr-sticker">
              <span>BE KIND</span>
              <span>REWIND</span>
            </div>
          </div>
        </div>

        <div className="menu-right">
          <div className="hero-frame">
            <img
              className="hero-image"
              src={heroImage}
              alt="A masked killer emerges from a staticky TV screen while four kids watch from the couch."
            />
            <div className="hero-vignette" />
            <div className="hero-scanlines" />
            <div className="hero-grain" />
            <div className="hero-glow" />
            <div className="hero-tracking-line" />
            <div className="hero-chroma" />
          </div>
        </div>
      </div>

      <div className={`tape-slot${mode ? " expanded" : ""}`}>
        {!mode && <p className="tape-prompt">&#9664; Insert Tape &mdash; pick an option above &#9654;</p>}

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
                <p className="solo-blurb">
                  No other players needed — 3 AI teens join your side, and an AI plays the Slasher.
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

            <div className="tape-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>
                &#9664; Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={disabled || (mode === "solo" && !soloCharacter)}
              >
                {mode === "create" ? "Create Room" : mode === "join" ? "Join Room" : "Start Solo Game"}
              </button>
            </div>
          </form>
        )}
      </div>

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)} type="button">Close</button>
            </div>
            <div className="modal-body">
              <label className="settings-toggle-row">
                <input type="checkbox" checked={!muted} onChange={toggleMuted} />
                Sound &amp; ambience
              </label>
              <p className="settings-hint">
                Controls the static hum and menu sound effects on this title screen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
