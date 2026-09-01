import { useState } from "react";

const STEPS = [
  {
    icon: "📼",
    title: "The Story",
    body: [
      "A cursed VHS tape has let a monster loose in Crescent Lake Camp.",
      "You play one of four teenagers trying to make it to dawn. One other player — or the AI in Solo Mode — controls the killer stalking you all.",
    ],
  },
  {
    icon: "🎯",
    title: "Your Goal",
    body: ["Survive the night by pulling off ONE of these three:"],
    list: [
      "🚗 Escape — find the Car Keys, a Gas Can & a Tool Kit, repair the car, then drive away.",
      "🔪 Fight it off — find a weapon and wound the monster enough times to destroy it.",
      "📼 Banish it — gather the Black Candle, Occult Book & Cursed Tape, then perform the ritual.",
    ],
    footer: "A 10-minute clock is always running in the background. If it hits zero before you finish the job, the killer wins by default.",
  },
  {
    icon: "🎲",
    title: "On Your Turn",
    body: [
      "Turns rotate through every teen, then the killer, on repeat.",
      "Each turn you take ONE action: move to a connected location, search for supplies, use an item, hide, rest, comfort a teammate, or make your move toward escaping, fighting, or banishing.",
      "Choose carefully — every action costs your whole turn, so know what you're walking into.",
    ],
  },
  {
    icon: "🧠",
    title: "Watch Your Sanity",
    body: [
      "Sanity runs 0–10, starting at 8. Being alone drains it every turn, and the monster jump-scaring you costs Sanity too.",
      "Low Sanity makes everything less reliable — hit rock bottom and you'll hallucinate or stumble into the wrong room while trying to move.",
    ],
    list: [
      "Stick with a teammate — it won't heal you, but it stops the bleeding.",
      "🛏️ Rest at a Safe Location, 🤝 Comfort a teammate, or use a 📼 Sanity item to actively recover.",
      "Hit 0 Sanity and you go Broken — recovery crawls to +1/round until you claw your way back to 3.",
    ],
  },
  {
    icon: "🔪",
    title: "The Killer",
    body: [
      "The killer's location is hidden from you until it's standing right where you are — you'll only sense it when it's one room over.",
      "Caught out in the open, it can just attack. Toggle Hide beforehand, and getting found instead triggers a tense Hold Your Breath moment — mash SPACE to stay quiet and it may move on.",
      "No way out? Flee to a connected room, or fight back if you're carrying a weapon.",
    ],
  },
  {
    icon: "🌙",
    title: "Ready to Survive?",
    body: [
      "Pick a teen, keep an eye on your Health and Sanity, and work with your team — human or AI — to make it to dawn.",
      "You can revisit this tutorial anytime from the main menu.",
    ],
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
