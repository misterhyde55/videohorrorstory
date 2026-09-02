const STATUS_LABEL = {
  alive: "SURVIVED",
  dead: "KILLED IN ACTION",
  escaped: "ESCAPED",
};

export default function PostGameRecap({ recap, characters, killers }) {
  if (!recap) return null;

  return (
    <div className="recap">
      <h3 className="recap-title">🎬 {recap.mapName?.toUpperCase()} — THE FULL STORY</h3>

      <div className="recap-cast">
        {recap.cast.map((p) => {
          const isSlasher = p.role === "slasher";
          const label = isSlasher ? killers?.[p.pickId]?.name || recap.killerName : characters?.[p.pickId]?.name;
          return (
            <div key={p.id} className={`recap-cast-row status-${p.status}`}>
              <span className="recap-cast-name">
                {p.name}
                {label ? ` as ${label}` : ""}
              </span>
              <span className="recap-cast-status">
                {isSlasher ? "THE KILLER" : STATUS_LABEL[p.status] || p.status.toUpperCase()}
                {p.status === "dead" && p.deathLocation ? ` — ${p.deathLocation}, Round ${p.deathRound}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      {recap.keyScenes.length > 0 && (
        <div className="recap-section">
          <h4>Key Scenes</h4>
          <ul>
            {recap.keyScenes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {recap.horrorEventsFired.length > 0 && (
        <div className="recap-section">
          <h4>Horror Events</h4>
          <ul>
            {recap.horrorEventsFired.map((e, i) => (
              <li key={i}>{e.name} — Round {e.round}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
