import { useEffect, useRef, useState } from "react";
import {
  startAudioOnGesture, playHoverBlip, playSelectClick,
  getMasterVolume, setMasterVolume, getMusicVolume, setMusicVolume, getSfxVolume, setSfxVolume,
  isMusicMuted, setMusicMuted, isSfxMuted, setSfxMuted,
} from "../utils/sound";
import { startMusic, setMusicState } from "../utils/music";
import heroImage from "../assets/hero-tv.jpg";
import SoloSetup from "./SoloSetup";
import HostGame from "./HostGame";
import JoinGame from "./JoinGame";

const TAGLINE_LINES = [
  "AN 80s HORROR ADVENTURE",
  "A CURSED TAPE.",
  "A MONSTER FROM BEYOND.",
  "FOUR KIDS.",
  "ONE CHANCE TO SURVIVE.",
];

export default function Home({ onCreate, onJoin, onSolo, onShowHelp, onShowTutorial, disabled }) {
  const [name, setName] = useState(localStorage.getItem("vhs_name") || "");
  // "menu" is the title screen itself; "create"/"join"/"solo" are dedicated
  // full-screen views navigated to from the menu — not an inline form that
  // grows the title screen underneath the menu.
  const [screen, setScreen] = useState("menu");
  const [cursor, setCursor] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [masterVol, setMasterVolState] = useState(getMasterVolume());
  const [musicVol, setMusicVolState] = useState(getMusicVolume());
  const [sfxVol, setSfxVolState] = useState(getSfxVolume());
  const [musicMuted, setMusicMutedState] = useState(isMusicMuted());
  const [sfxMuted, setSfxMutedState] = useState(isSfxMuted());
  const screenRef = useRef(null);

  // The first real click or keypress anywhere on this screen is what lets
  // the browser's autoplay policy allow any sound at all — this listener
  // exists purely to catch that first gesture, then gets out of the way.
  // That same gesture is what starts the generative menu score (see
  // utils/music.js) — nothing plays before the player has interacted.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    const onFirstGesture = () => {
      startAudioOnGesture();
      startMusic("menu");
    };
    el.addEventListener("pointerdown", onFirstGesture, { once: true });
    el.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      el.removeEventListener("pointerdown", onFirstGesture);
      el.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  // Coming back to the main menu from a setup screen — including via the
  // in-game Leave button, which unmounts GameScreen and remounts Home —
  // should bring the menu score back rather than leaving gameplay music
  // playing under the title screen.
  useEffect(() => {
    setMusicState("menu");
  }, []);

  const menuItems = [
    { key: "create", label: "Host a Game", onSelect: () => setScreen("create") },
    { key: "join", label: "Join a Game", onSelect: () => setScreen("join") },
    { key: "solo", label: "Play Solo", onSelect: () => setScreen("solo") },
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
  // showing — a dedicated setup screen owns normal Tab/Enter once open.
  useEffect(() => {
    if (screen !== "menu") return undefined;
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
  }, [screen, cursor]);

  const backToMenu = () => setScreen("menu");

  if (screen === "solo") {
    return <SoloSetup name={name} setName={setName} onBack={backToMenu} onSolo={onSolo} disabled={disabled} />;
  }
  if (screen === "create") {
    return <HostGame name={name} setName={setName} onBack={backToMenu} onCreate={onCreate} disabled={disabled} />;
  }
  if (screen === "join") {
    return <JoinGame name={name} setName={setName} onBack={backToMenu} onJoin={onJoin} disabled={disabled} />;
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

      <div className="tape-slot">
        <p className="tape-prompt">&#9664; Insert Tape &mdash; pick an option above &#9654;</p>
      </div>

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)} type="button">Close</button>
            </div>
            <div className="modal-body">
              <div className="volume-row">
                <label htmlFor="vol-master">Master Volume</label>
                <input
                  id="vol-master" type="range" min="0" max="1" step="0.01" value={masterVol}
                  onChange={(e) => { const v = parseFloat(e.target.value); setMasterVolState(v); setMasterVolume(v); }}
                />
              </div>

              <div className="volume-row">
                <label htmlFor="vol-music">Music Volume</label>
                <input
                  id="vol-music" type="range" min="0" max="1" step="0.01" value={musicVol} disabled={musicMuted}
                  onChange={(e) => { const v = parseFloat(e.target.value); setMusicVolState(v); setMusicVolume(v); }}
                />
                <label className="settings-toggle-row inline">
                  <input
                    type="checkbox" checked={!musicMuted}
                    onChange={(e) => { const on = e.target.checked; setMusicMutedState(!on); setMusicMuted(!on); }}
                  />
                  On
                </label>
              </div>

              <div className="volume-row">
                <label htmlFor="vol-sfx">SFX Volume</label>
                <input
                  id="vol-sfx" type="range" min="0" max="1" step="0.01" value={sfxVol} disabled={sfxMuted}
                  onChange={(e) => { const v = parseFloat(e.target.value); setSfxVolState(v); setSfxVolume(v); }}
                />
                <label className="settings-toggle-row inline">
                  <input
                    type="checkbox" checked={!sfxMuted}
                    onChange={(e) => { const on = e.target.checked; setSfxMutedState(!on); setSfxMuted(!on); }}
                  />
                  On
                </label>
              </div>

              <p className="settings-hint">
                Music covers the menu score and the dynamic in-game soundtrack. SFX covers menu blips and clicks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
