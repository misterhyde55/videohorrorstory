// A boss-style health bar (Elden Ring/Dark Souls) that appears over the
// board only while the current teen actually shares a location with the
// Slasher — the tension of "it's right here" — and disappears the instant
// they're no longer face to face with it.
export default function MonsterHealthBar({ show, name, hp, max }) {
  if (!show) return null;
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;

  return (
    <div className="boss-bar">
      <div className="boss-bar-name">{name}</div>
      <div className="boss-bar-track">
        <div className="boss-bar-fill" style={{ width: `${pct}%` }} />
        <div className="boss-bar-notches" aria-hidden="true">
          {Array.from({ length: Math.max(0, max - 1) }).map((_, i) => (
            <span key={i} className="boss-bar-notch" style={{ left: `${((i + 1) / max) * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
