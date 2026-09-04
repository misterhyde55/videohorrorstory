import { useEffect, useRef, useState } from "react";
import MonsterHealthBar from "./MonsterHealthBar";
import Landmark from "./Landmark";
import Token from "./Token";
import LocationInfoPanel from "./LocationInfoPanel";

const STARS = [
  [6, 8], [14, 4], [22, 12], [33, 5], [41, 15], [52, 6], [60, 10], [70, 4],
  [78, 14], [88, 7], [95, 17], [10, 20], [30, 22], [50, 20], [66, 22], [85, 24],
];

const TREE_CLUSTERS = [
  [16, 12, 4.5], [22, 18, 5], [10, 22, 4], [30, 8, 3.6], [6, 34, 5.2],
  [92, 30, 4.6], [96, 40, 5], [60, 4, 3.4], [50, 12, 3.8], [4, 50, 4.4],
  [38, 82, 5], [46, 90, 4.6], [30, 88, 5.4], [56, 84, 4.2], [64, 92, 5],
  [72, 82, 4.8], [12, 30, 4], [8, 40, 4.6], [90, 60, 5], [94, 72, 4.4],
];

// Distant rooftops sitting in the open ground between landmarks — never
// on a route or a tile — so the board reads as one continuous town seen
// from above instead of a handful of buildings floating on empty gradient.
// Small, low-detail, low-opacity: background texture, not new locations.
const ROOFTOP_CLUSTERS = [
  [58, 30, 0], [64, 34, 18], [36, 58, -10], [42, 62, 8],
  [70, 58, -14], [76, 62, 12], [24, 34, 6], [18, 38, -8],
  [56, 74, -6], [50, 78, 14], [84, 26, -10], [8, 58, 10],
];

function Rooftop({ x, y, rot }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity="0.5">
      <rect x="-2.6" y="-1.4" width="5.2" height="3.2" fill="#241d30" stroke="#3a2f4a" strokeWidth="0.2" />
      <path d="M-3 -1.4 L0 -3.4 L3 -1.4 Z" fill="#1a1524" stroke="#3a2f4a" strokeWidth="0.2" />
      <rect x="4" y="-0.6" width="3" height="2.4" fill="#20192a" stroke="#3a2f4a" strokeWidth="0.18" />
      <path d="M3.7 -0.6 L5.5 -1.9 L7.3 -0.6 Z" fill="#171220" stroke="#3a2f4a" strokeWidth="0.18" />
    </g>
  );
}

// Small fixed set pieces scattered across the open ground (never on a
// route or a location) so the board reads as an actual place between its
// landmarks, not empty space with icons floating on it. Purely decorative.
const CLUTTER = [
  { x: 20, y: 46, kind: "fence" }, { x: 80, y: 50, kind: "fence" },
  { x: 44, y: 30, kind: "booth" }, { x: 58, y: 66, kind: "booth" },
  { x: 26, y: 60, kind: "crate" }, { x: 70, y: 34, kind: "crate" },
  { x: 36, y: 46, kind: "lamp" }, { x: 62, y: 50, kind: "lamp" },
  { x: 18, y: 64, kind: "lamp" }, { x: 82, y: 66, kind: "lamp" },
  { x: 48, y: 58, kind: "crate" }, { x: 14, y: 76, kind: "fence" },
  // A little environmental storytelling — a place that's already been
  // through something, not just a set of buildings.
  { x: 63, y: 92, kind: "car" },
  { x: 52, y: 62, kind: "sign" },
  { x: 30, y: 40, kind: "sign" },
];

function Clutter({ x, y, kind }) {
  if (kind === "lamp") {
    return (
      <g transform={`translate(${x} ${y})`} opacity="0.85">
        <line x1="0" y1="0" x2="0" y2="-5.5" stroke="#5b4128" strokeWidth="0.4" />
        <circle cx="0" cy="-6" r="1.1" fill="#ffd35c" opacity="0.9" />
        <circle cx="0" cy="-6" r="2.6" fill="#ffd35c" opacity="0.22" />
      </g>
    );
  }
  if (kind === "booth") {
    return (
      <g transform={`translate(${x} ${y})`} opacity="0.8">
        <path d="M-3 -2 L0 -4.5 L3 -2 L3 2 L-3 2 Z" fill="#3a1030" stroke="#ff5fa8" strokeWidth="0.25" strokeOpacity="0.7" />
      </g>
    );
  }
  if (kind === "crate") {
    return (
      <g transform={`translate(${x} ${y})`} opacity="0.75">
        <rect x="-1.6" y="-1.6" width="3.2" height="3.2" fill="#5b4128" stroke="#8a6a45" strokeWidth="0.25" />
      </g>
    );
  }
  if (kind === "car") {
    // A crashed, abandoned car — off the road, one headlight still lit.
    return (
      <g transform={`translate(${x} ${y}) rotate(-12)`} opacity="0.85">
        <ellipse cx="0" cy="2.4" rx="6.5" ry="1" fill="#000" opacity="0.4" />
        <path d="M-6 1.6 L-5 -0.6 L-2.4 -2 L2.6 -2 L4.6 -0.4 L6 1.6 Z" fill="#2a2a30" stroke="#4a4a54" strokeWidth="0.3" />
        <path d="M-2 -1.8 L-0.6 -3.2 L2 -3.2 L3 -1.8 Z" fill="#1a1a20" opacity="0.85" />
        <circle cx="-3.6" cy="1.8" r="1" fill="#0c0a0c" stroke="#5b5b64" strokeWidth="0.2" />
        <circle cx="3.6" cy="1.8" r="1" fill="#0c0a0c" stroke="#5b5b64" strokeWidth="0.2" />
        <circle cx="5.6" cy="0.6" r="0.5" fill="#ffd35c" opacity="0.7" />
      </g>
    );
  }
  if (kind === "sign") {
    // A hand-lettered warning / missing-person board nailed to a post.
    return (
      <g transform={`translate(${x} ${y})`} opacity="0.8">
        <line x1="0" y1="-3.5" x2="0" y2="1.5" stroke="#4a3620" strokeWidth="0.4" />
        <rect x="-2.6" y="-5.5" width="5.2" height="3.6" fill="#c9b98a" stroke="#4a3620" strokeWidth="0.3" transform="rotate(-4)" />
        <line x1="-1.6" y1="-4.3" x2="1.6" y2="-3.7" stroke="#3a2a18" strokeWidth="0.22" opacity="0.7" transform="rotate(-4)" />
        <line x1="-1.6" y1="-3.5" x2="0.8" y2="-3.1" stroke="#3a2a18" strokeWidth="0.22" opacity="0.6" transform="rotate(-4)" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`} opacity="0.6">
      <line x1="-3" y1="0" x2="3" y2="0" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="-3" y1="-1.6" x2="-3" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="0" y1="-1.6" x2="0" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="3" y1="-1.6" x2="3" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
    </g>
  );
}

// A physical corner dial — original VHS iconography, not a copy of any
// reference board's skull/lightning motif — tracking the Nightmare Level
// (0-6) as a real piece of board furniture instead of only a HUD chip.
// The end cell is a small warning-triangle/static glyph that lights up
// once the level maxes out, echoing the game's own "REC" static language.
const NIGHTMARE_DIAL_NUMBERS = [0, 1, 2, 3, 4, 5, 6];

function NightmareDial({ level = 0 }) {
  const cellW = 3.5;
  const gap = 0.55;
  const startX = 7.6;
  const rowY = 8.6;
  return (
    <g className="nightmare-dial">
      <rect x="2" y="2.4" width="33.4" height="10.6" rx="1.6" fill="url(#dialPlate)" stroke="#120c07" strokeWidth="0.6" />
      <rect x="2.6" y="3" width="32.2" height="2.3" rx="0.8" fill="#e8dcc0" opacity="0.1" />
      <text x="4.2" y="6.1" fontSize="1.9" fill="#e8dcc0" fontFamily="monospace" fontWeight="700" opacity="0.82" letterSpacing="0.06">
        NIGHTMARE LEVEL
      </text>
      {NIGHTMARE_DIAL_NUMBERS.map((n, i) => {
        const cx = startX + i * (cellW + gap);
        const lit = n <= level;
        return (
          <g key={n} transform={`translate(${cx} ${rowY})`}>
            <rect x="-1.7" y="-1.85" width="3.4" height="3.7" rx="0.5" fill={lit ? "#7a2323" : "#221a12"} stroke={lit ? "#ff9d4d" : "#4a3620"} strokeWidth="0.32" />
            <text x="0" y="0.7" fontSize="2.1" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill={lit ? "#ffe2b8" : "#7a6a52"}>
              {n}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${startX + 7 * (cellW + gap) + 1.1} ${rowY})`}>
        <circle r="2.2" fill={level >= 6 ? "#c23b3b" : "#221a12"} stroke={level >= 6 ? "#ff5c5c" : "#4a3620"} strokeWidth="0.4" />
        <path
          d="M0 -1.25 L1.05 0.9 L-1.05 0.9 Z"
          fill="none"
          stroke={level >= 6 ? "#ffe2b8" : "#7a6a52"}
          strokeWidth="0.32"
        />
        <line x1="-0.5" y1="0.15" x2="0.5" y2="0.15" stroke={level >= 6 ? "#ffe2b8" : "#7a6a52"} strokeWidth="0.28" />
        <circle cx="0" cy="-0.5" r="0.14" fill={level >= 6 ? "#ffe2b8" : "#7a6a52"} />
      </g>
    </g>
  );
}

// A location's coordinate along a connection line, used both to draw the
// route itself and to seed small "trail marker" dots along it — and to
// interpolate a token's mid-move position for the step animation below.
function pointAlong(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Landmarks are centered on their board position as a column (icon above
// its nameplate), so tokens need to clear both before they sit below —
// otherwise they land right across the location name.
const LANDMARK_SIZE = 82;
const TOKEN_ROW_Y = 78;

function tokenSlotOffset(index, total) {
  if (total <= 1) return { x: 0, y: TOKEN_ROW_Y };
  const spread = 15;
  const startX = -((total - 1) * spread) / 2;
  return { x: startX + index * spread, y: TOKEN_ROW_Y };
}

export default function Board({
  board,
  layout,
  players,
  me,
  myLocation,
  myTurn,
  myRole,
  slasherNearby,
  slasherPresent,
  killerName,
  monsterHp,
  monsterMaxHp,
  hazardLocations,
  npcs,
  nightmareLevel,
  reachableLocations,
  onMove,
  onSearchResult,
}) {
  const npcLocations = new Map();
  (npcs || []).forEach((n) => {
    if (n.status === "waiting" || n.status === "endangered") npcLocations.set(n.locationId, n);
  });

  // The lake is a real geographic feature, not a decorative corner blob —
  // it sits wherever the map's water-adjacent landmark (the Boat Dock)
  // actually is, sized to visibly shape that corner of the board.
  const waterLoc = Object.values(board).find((l) => l.type === "water");
  const lakePos = waterLoc ? layout[waterLoc.id] : null;
  const prevLocationsRef = useRef({});
  const [flashLocations, setFlashLocations] = useState(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState(null);

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
  const routes = [];
  Object.values(board).forEach((loc) => {
    loc.connections.forEach((otherId) => {
      const key = [loc.id, otherId].sort().join("-");
      if (drawnPairs.has(key)) return;
      drawnPairs.add(key);
      const a = layout[loc.id];
      const b = layout[otherId];
      if (a && b) {
        routes.push({
          key,
          a,
          b,
          dots: [0.25, 0.5, 0.75].map((t) => pointAlong(a, b, t)),
        });
      }
    });
  });

  const tokensByLocation = {};
  players.forEach((p) => {
    if (!p.location) return;
    tokensByLocation[p.location] ??= [];
    tokensByLocation[p.location].push(p);
  });

  function handleNodeClick(locId) {
    if (myTurn && reachableLocations?.includes(locId)) {
      onMove?.(locId);
      setSelectedLocationId(null);
      return;
    }
    setSelectedLocationId((cur) => (cur === locId ? null : locId));
  }

  const selectedLoc = selectedLocationId ? board[selectedLocationId] : null;
  const selectedPos = selectedLocationId ? layout[selectedLocationId] : null;

  return (
    <div className="board-map" onClick={() => setSelectedLocationId(null)}>
      <svg className="board-bg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff2c9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fff2c9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lakeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2ee6ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#173f6e" stopOpacity="0.8" />
          </radialGradient>
          <linearGradient id="groundWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b2436" />
            <stop offset="100%" stopColor="#181320" />
          </linearGradient>
          <linearGradient id="fogGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e8dcc0" stopOpacity="0.09" />
            <stop offset="35%" stopColor="#c9a888" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#171420" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0810" stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id="dialPlate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d3020" />
            <stop offset="100%" stopColor="#241c13" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#groundWash)" />
        <rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />

        {STARS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.35} fill="#f4ecd8" opacity="0.55" className="board-star" />
        ))}
        <circle cx="90" cy="10" r="14" fill="url(#moonGlow)" />
        <circle cx="90" cy="10" r="4.2" fill="#fdf6dd" />

        {/* Distant rooftops as a base "town" layer, under everything else —
            the roads read as carved through an actual place, not laid over
            empty ground. */}
        {ROOFTOP_CLUSTERS.map(([x, y, rot], i) => (
          <Rooftop key={"roof" + i} x={x} y={y} rot={rot} />
        ))}

        {/* Roads are drawn before the tree/clutter dressing so the park's
            greenery reads as sitting alongside the path, not paved over. */}
        {routes.map(({ key, a, b }) => (
          <line key={key + "-bed"} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="board-road-bed" />
        ))}
        {routes.map(({ key, a, b }) => (
          <line key={key + "-edge"} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="board-road-edge" />
        ))}
        {routes.map(({ key, a, b }) => (
          <line key={key + "-line"} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="board-road-line" />
        ))}

        {TREE_CLUSTERS.map(([x, y, r], i) => (
          <circle key={"tree" + i} cx={x} cy={y} r={r} fill="#182618" stroke="#3a5a3a" strokeOpacity="0.4" strokeWidth="0.3" opacity="0.92" />
        ))}
        {CLUTTER.map((c, i) => (
          <Clutter key={"clutter" + i} {...c} />
        ))}

        {lakePos && (
          <>
            <ellipse cx={lakePos.x - 6} cy={lakePos.y - 4} rx="20" ry="15" fill="url(#lakeGlow)" opacity="0.9" />
            <ellipse cx={lakePos.x - 6} cy={lakePos.y - 4} rx="20" ry="15" fill="none" stroke="#8fd6e0" strokeOpacity="0.35" strokeWidth="0.4" />
          </>
        )}

        <rect x="0" y="0" width="100" height="100" fill="url(#fogGradient)" opacity="0.5" />

        <NightmareDial level={nightmareLevel || 0} />
      </svg>

      <div className="board-fog" />

      {routes.map(({ key, dots }) =>
        dots.map((d, i) => (
          <div key={key + "-dot-" + i} className="route-marker" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
        ))
      )}

      <MonsterHealthBar show={!!slasherPresent} name={killerName} hp={monsterHp} max={monsterMaxHp} />

      {Object.values(board).map((loc) => {
        const pos = layout[loc.id];
        if (!pos) return null;
        const isMine = loc.id === myLocation;
        const isSensed = slasherNearby === loc.id;
        const isFlashing = flashLocations.has(loc.id);
        const isHaunted = hazardLocations?.includes(loc.id);
        const isReachable = reachableLocations?.includes(loc.id);
        const hasLoot = (loc.leftItems?.length || 0) > 0;
        const isSelected = selectedLocationId === loc.id;
        const npcHere = npcLocations.get(loc.id);
        return (
          <button
            type="button"
            key={loc.id}
            className={`landmark-node${isMine ? " here" : ""}${loc.ritualSite ? " ritual" : ""}${loc.exit ? " exit" : ""}${loc.carSite ? " carsite" : ""}${isSensed ? " sensed" : ""}${isFlashing ? " flash" : ""}${isHaunted ? " haunted" : ""}${isReachable ? " reachable" : ""}${isSelected ? " selected" : ""}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={isHaunted ? `${loc.description} Something's wrong here right now.` : loc.description}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(loc.id);
            }}
          >
            <div className="landmark-tile">
              {hasLoot && <span className="loot-badge" title="Something was left here" />}
              {npcHere && (
                <span
                  className={`npc-badge${npcHere.status === "endangered" ? " endangered" : ""}`}
                  title={`${npcHere.name} needs rescuing`}
                />
              )}
              {loc.searchCount > 0 && (
                <span className="tile-search-badge" title={`Searched ${loc.searchCount} time${loc.searchCount > 1 ? "s" : ""}`}>
                  {loc.searchCount}
                </span>
              )}
              <Landmark type={loc.type} dangerLevel={loc.dangerLevel} hazard={isHaunted} size={LANDMARK_SIZE} />
            </div>
            <span className="landmark-nameplate">{loc.name}</span>
          </button>
        );
      })}

      {players.map((p) => {
        if (!p.location) return null;
        const pos = layout[p.location];
        if (!pos) return null;
        const slot = tokensByLocation[p.location] || [];
        const idx = slot.indexOf(p);
        const offset = tokenSlotOffset(idx, slot.length);
        // The Slasher only ever appears here when the caller's own state
        // already decided its location should be visible (publicState
        // withholds it otherwise) — nothing extra to hide client-side.
        return (
          <div
            key={p.id}
            className="board-token-wrap"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            title={p.characterName || p.name}
          >
            <Token
              kind={p.role}
              pickId={p.pickId}
              isMe={p.id === me}
              hiding={p.hiding}
              dead={p.status === "dead"}
              size={p.role === "slasher" ? 30 : 26}
            />
          </div>
        );
      })}

      {selectedLoc && (
        <LocationInfoPanel
          loc={selectedLoc}
          pos={selectedPos}
          isMyLocation={selectedLocationId === myLocation}
          isMyTurn={myTurn}
          myRole={myRole}
          onSearchResult={onSearchResult}
          onClose={() => setSelectedLocationId(null)}
        />
      )}
    </div>
  );
}
