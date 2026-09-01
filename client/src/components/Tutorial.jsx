import { useState } from "react";

const STEPS = [
  {
    icon: "📼",
    title: "Welcome to VHS",
    body: ["A monster escaped a cursed tape into camp.", "You're one of 4 teens. One player (or the AI) plays the monster."],
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
    title: "You're Ready!",
    body: ["Pick your teen and try to make it to dawn.", "You can replay this anytime from the menu."],
    final: true,
  },
];

export default function Tutorial({ onClose }) {
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
              <button className="btn btn-primary" type="button" onClick={onClose}>
                Let's Play
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
