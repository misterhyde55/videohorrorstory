export default function HealthBar({ hp, max, kind, label }) {
  const pct = max > 0 ? Math.round((hp / max) * 100) : 0;
  return (
    <div className={`health-bar-big health-${kind}`}>
      {label && <span className="health-bar-label">{label}</span>}
      <div className="health-bar-track">
        <div className="health-bar-fill" style={{ width: `${pct}%` }} />
        <span className="health-bar-pct">{pct}%</span>
      </div>
    </div>
  );
}
