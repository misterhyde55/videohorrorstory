import { LAYOUT } from "../screens/board-layout";

export default function Board({ board, players, me, myLocation }) {
  const drawnPairs = new Set();
  const lines = [];
  Object.values(board).forEach((loc) => {
    loc.connections.forEach((otherId) => {
      const key = [loc.id, otherId].sort().join("-");
      if (drawnPairs.has(key)) return;
      drawnPairs.add(key);
      const a = LAYOUT[loc.id];
      const b = LAYOUT[otherId];
      if (a && b) lines.push({ key, a, b });
    });
  });

  const tokensByLocation = {};
  players.forEach((p) => {
    if (!p.location) return;
    tokensByLocation[p.location] ??= [];
    tokensByLocation[p.location].push(p);
  });

  return (
    <div className="board-map">
      <svg className="board-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {lines.map(({ key, a, b }) => (
          <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </svg>
      {Object.values(board).map((loc) => {
        const pos = LAYOUT[loc.id];
        if (!pos) return null;
        const tokens = tokensByLocation[loc.id] || [];
        const isMine = loc.id === myLocation;
        return (
          <div
            key={loc.id}
            className={`map-node${isMine ? " here" : ""}${loc.ritualSite ? " ritual" : ""}${loc.exit ? " exit" : ""}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={loc.description}
          >
            <div className="map-node-label">{loc.name}</div>
            <div className="map-node-tokens">
              {tokens.map((p) => (
                <span
                  key={p.id}
                  className={`token token-${p.role}${p.status === "dead" ? " dead" : ""}${p.id === me ? " token-me" : ""}`}
                  title={p.characterName || p.name}
                >
                  {p.role === "slasher" ? "🔪" : (p.characterName || p.name)[0]}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
