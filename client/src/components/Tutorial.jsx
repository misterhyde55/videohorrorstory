import { useState } from "react";

const STEPS = [
  {
    icon: "📼",
    title: "Welcome to VHS",
    body: ["A monster escaped a cursed tape into the Abandoned Wonderland.", "You're one of 4 teens. One player (or the AI) plays the monster."],
  },
  {
    icon: "🎯",
    title: "Your Goal: Survive",
    body: ["Do ONE of these three to win:"],
    list: [
      "🚗 Escape — fix the car, then drive away.",
      "🔪 Fight — hurt the monster enough to destroy it.",
      "📼 Banish — collect 3 relics, then do the ritual.",
    ],
    footer: "⏱️ You have 10 minutes. Run out of time and the monster wins.",
  },
  {
    icon: "🎲",
    title: "Taking Your Turn",
    body: ["Everyone takes turns — teens first, then the monster.", "Pick ONE action on your turn:"],
    list: ["🚶 Move to a new room", "🔦 Search for supplies", "🤫 Hide, 🛏️ Rest, or 🤝 help a teammate"],
  },
  {
    icon: "🧠",
    title: "Stay Sane",
    body: ["Sanity is your fear meter. It drops when you're alone or scared.", "Low Sanity = shaky, unreliable actions."],
    list: [
      "👥 Stick together — stops it from dropping further.",
      "🛏️ Rest, 🤝 get Comforted, or use an item to heal it.",
      "💀 Hit 0 and you break down.",
    ],
  },
  {
    icon: "🔪",
    title: "The Killer",
    body: ["You can't see it coming — it's invisible until it's in your room."],
    list: [
      "🤫 Hide before it finds you.",
      "🏃 Flee to another room.",
      "⚔️ Fight back if you have a weapon.",
    ],
    footer: "😮 If it finds your hiding spot, hold your breath (mash SPACE) to stay quiet!",
  },
  {
    icon: "🌙",
    title: "Try It Yourself",
    body: ["The fastest way to learn is to play. Jump into a quick 4-minute practice match:"],
    practice: true,
  },
];

export default function Tutorial({ onClose, onPractice }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How to Survive</h2>
          <button className="btn btn-ghost" onClick={onClose} type="button">Skip Tutorial</button>
        </div>

        <div className="modal-body tutorial-body">
          <div className="tutorial-icon">{current.icon}</div>
          <h3 className="tutorial-title">{current.title}</h3>
          {current.body.map((p, i) => <p key={i}>{p}</p>)}
          {current.list && (
            <ul className="tutorial-list">
              {current.list.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
          {current.footer && <p className="tutorial-footer">{current.footer}</p>}

          {current.practice && (
            <div className="tutorial-practice-choices">
              <button type="button" className="tutorial-practice-btn" onClick={() => onPractice("teen")}>
                <span className="tutorial-practice-icon">🧑</span>
                <span>Practice as a Teen</span>
                <small>Explore, hide, and try to survive</small>
              </button>
              <button type="button" className="tutorial-practice-btn killer" onClick={() => onPractice("killer")}>
                <span className="tutorial-practice-icon">🔪</span>
                <span>Practice as the Killer</span>
                <small>Hunt down 4 AI-controlled teens</small>
              </button>
            </div>
          )}
        </div>

        <div className="tutorial-nav">
          <div className="tutorial-dots">
            {STEPS.map((s, i) => (
              <span key={s.title} className={`tutorial-dot${i === step ? " active" : ""}`} />
            ))}
          </div>
          <div className="tutorial-nav-buttons">
            {!isFirst && (
              <button className="btn btn-ghost" type="button" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {isLast ? (
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                I'll explore on my own
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
