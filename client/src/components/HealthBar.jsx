export default function HealthBar({ hp, max, kind, label, compact }) {
  const pct = max > 0 ? Math.round((hp / max) * 100) : 0;
  if (compact) {
    return (
      <div className={`health-bar-mini health-${kind}`} title={`${label ? label + ": " : ""}${pct}%`}>
        <div className="health-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    );
  }
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
