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
  return (
    <g transform={`translate(${x} ${y})`} opacity="0.6">
      <line x1="-3" y1="0" x2="3" y2="0" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="-3" y1="-1.6" x2="-3" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="0" y1="-1.6" x2="0" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
      <line x1="3" y1="-1.6" x2="3" y2="0.6" stroke="#5b4128" strokeWidth="0.35" />
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
  reachableLocations,
  onMove,
  onSearchResult,
}) {
  const npcLocations = new Map();
  (npcs || []).forEach((n) => {
    if (n.status === "waiting" || n.status === "endangered") npcLocations.set(n.locationId, n);
  });
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
            <stop offset="0%" stopColor="#2a2860" />
            <stop offset="100%" stopColor="#1c1442" />
          </linearGradient>
          <linearGradient id="fogGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff2e88" stopOpacity="0.16" />
            <stop offset="35%" stopColor="#2ee6ff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#170f38" stopOpacity="0" />
            <stop offset="100%" stopColor="#0d0824" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#groundWash)" />
        <rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />

        {STARS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.35} fill="#f4ecd8" opacity="0.55" className="board-star" />
        ))}
        <circle cx="90" cy="10" r="14" fill="url(#moonGlow)" />
        <circle cx="90" cy="10" r="4.2" fill="#fdf6dd" />

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
          <circle key={"tree" + i} cx={x} cy={y} r={r} fill="#241a52" stroke="#9b30ff" strokeOpacity="0.25" strokeWidth="0.3" opacity="0.9" />
        ))}
        {CLUTTER.map((c, i) => (
          <Clutter key={"clutter" + i} {...c} />
        ))}

        <ellipse cx="12" cy="88" rx="12" ry="8" fill="url(#lakeGlow)" opacity="0.9" />
        <ellipse cx="12" cy="88" rx="12" ry="8" fill="none" stroke="#8fd6e0" strokeOpacity="0.35" strokeWidth="0.4" />

        <rect x="0" y="0" width="100" height="100" fill="url(#fogGradient)" opacity="0.5" />
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
            {hasLoot && <span className="loot-badge" title="Something was left here" />}
            {npcHere && (
              <span
                className={`npc-badge${npcHere.status === "endangered" ? " endangered" : ""}`}
                title={`${npcHere.name} needs rescuing`}
              />
            )}
            <Landmark type={loc.type} dangerLevel={loc.dangerLevel} hazard={isHaunted} size={LANDMARK_SIZE} />
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
