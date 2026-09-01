import { useEffect, useRef, useState } from "react";

const TYPE_ICONS = {
  road: "🛣️",
  lot: "🚗",
  lodge: "🏠",
  hall: "🍽️",
  cabin: "🏕️",
  water: "🌊",
  trail: "🌲",
  barn: "🚜",
  tower: "🗼",
  cellar: "⚰️",
  store: "🏪",
  theater: "🎬",
  school: "🏫",
  graveyard: "🪦",
  church: "⛪",
};

const STARS = [
  [6, 8], [14, 4], [22, 12], [33, 5], [41, 15], [52, 6], [60, 10], [70, 4],
  [78, 14], [88, 7], [95, 17], [10, 20], [30, 22], [50, 20], [66, 22], [85, 24],
];

export default function Board({ board, layout, players, me, myLocation, slasherNearby }) {
  const prevLocationsRef = useRef({});
  const [flashLocations, setFlashLocations] = useState(new Set());

  useEffect(() => {
    const prev = prevLocationsRef.current;
    const changed = new Set();
    players.forEach((p) => {
      if (!p.location) return;
      if (prev[p.id] && prev[p.id] !== p.location) changed.add(p.location);
    });
    prevLocationsRef.current = Object.fromEntries(
      players.filter((p) => p.location).map((p) => [p.id, p.location])
    );
    if (changed.size > 0) {
      setFlashLocations(changed);
      const timer = setTimeout(() => setFlashLocations(new Set()), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [players]);

  const drawnPairs = new Set();
  const lines = [];
  Object.values(board).forEach((loc) => {
    loc.connections.forEach((otherId) => {
      const key = [loc.id, otherId].sort().join("-");
      if (drawnPairs.has(key)) return;
      drawnPairs.add(key);
      const a = layout[loc.id];
      const b = layout[otherId];
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
      <svg className="board-bg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff7d6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lakeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1c5d6b" />
            <stop offset="100%" stopColor="#123a44" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="#150a24" />
        <rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />

        {STARS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.35} fill="#ffffff" opacity="0.6" className="board-star" />
        ))}
        <circle cx="90" cy="10" r="14" fill="url(#moonGlow)" />
        <circle cx="90" cy="10" r="4.2" fill="#fdf6dd" />

        {/* ambient woods */}
        {[[16, 12], [22, 18], [10, 22], [30, 8], [92, 30], [96, 40], [60, 4], [50, 12]].map(([x, y], i) => (
          <circle key={"t1" + i} cx={x} cy={y} r={4.5} fill="#0f2e1c" opacity="0.8" />
        ))}
        {[[38, 82], [46, 90], [30, 88], [56, 84], [64, 92], [72, 82], [12, 30], [8, 40]].map(([x, y], i) => (
          <circle key={"t2" + i} cx={x} cy={y} r={5} fill="#122f1d" opacity="0.8" />
        ))}

        {/* ambient lake */}
        <ellipse cx="12" cy="88" rx="12" ry="8" fill="url(#lakeGlow)" opacity="0.85" />
        <ellipse cx="12" cy="88" rx="12" ry="8" fill="none" stroke="#2ee6ff" strokeOpacity="0.25" strokeWidth="0.4" />

        {/* dirt paths */}
        {lines.map(({ key, a, b }) => (
          <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="board-path" />
        ))}

        <rect x="0" y="0" width="100" height="100" fill="url(#fogGradient)" opacity="0.5" />
        <defs>
          <linearGradient id="fogGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3a2450" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#3a2450" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
      </svg>

      <div className="board-fog" />

      {Object.values(board).map((loc) => {
        const pos = layout[loc.id];
        if (!pos) return null;
        const tokens = tokensByLocation[loc.id] || [];
        const isMine = loc.id === myLocation;
        const isSensed = slasherNearby === loc.id;
        const isFlashing = flashLocations.has(loc.id);
        return (
          <div
            key={loc.id}
            className={`map-node${isMine ? " here" : ""}${loc.ritualSite ? " ritual" : ""}${loc.exit ? " exit" : ""}${loc.carSite ? " carsite" : ""}${isSensed ? " sensed" : ""}${isFlashing ? " flash" : ""}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={loc.description}
          >
            <div className="map-node-label">
              <span className="map-node-icon">{TYPE_ICONS[loc.type] || "📍"}</span> {loc.name}
            </div>
            <div className="map-node-tokens">
              {tokens.map((p) => (
                <span
                  key={p.id}
                  className={`token token-${p.role}${p.status === "dead" ? " dead" : ""}${p.id === me ? " token-me" : ""}${p.hiding ? " hiding" : ""}`}
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
