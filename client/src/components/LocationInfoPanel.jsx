import { socket } from "../socket";

const POOL_LABEL = {
  light: "Scraps & odds and ends",
  medium: "Useful gear",
  heavy: "Rare, high-value finds",
};

const DANGER_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "Very High",
};

// A small board-game-style card that opens over the board when a location
// is clicked — never a navigation, never a new screen. It surfaces what's
// already known about the spot (danger, search history, anything left
// there) and, only when it's actually your move here, lets you act on it
// directly instead of hunting for the same button in the sidebar.
export default function LocationInfoPanel({ loc, pos, isMyLocation, isMyTurn, myRole, onSearchResult, onClose }) {
  if (!loc) return null;

  const canAct = isMyLocation && isMyTurn && myRole === "teen";
  const leftItems = loc.leftItems || [];
  const info = loc.discoveredInformation || [];
  const clampedLeft = Math.min(68, Math.max(4, pos?.x ?? 50));
  const clampedTop = Math.min(70, Math.max(4, pos?.y ?? 50));

  function search() {
    socket.emit("action", { type: "search" }, (res) => {
      if (res?.ok) onSearchResult?.(res.searchResult);
    });
  }

  function takeItem(item) {
    onSearchResult?.({
      type: "item",
      uid: item.uid,
      itemId: item.id,
      itemName: item.name,
      effect: item.effect,
      capacityItem: item.utility === "capacity",
      inventoryFull: false,
      noisy: false,
      noNoiseLine: true,
    });
  }

  return (
    <div
      className="location-info-panel"
      style={{ left: `${clampedLeft}%`, top: `${clampedTop}%` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="location-info-header">
        <span>{loc.name}</span>
        <button type="button" className="location-info-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="location-info-body">
        <div className={`location-info-danger danger-${loc.dangerLevel}`}>
          Danger: {DANGER_LABEL[loc.dangerLevel] || "Low"}
        </div>
        <div className="location-info-row">
          Searched: {loc.searchCount || 0}×
        </div>
        {loc.searchPool && (
          <div className="location-info-row muted">Likely finds: {POOL_LABEL[loc.searchPool]}</div>
        )}
        {leftItems.length > 0 && (
          <div className="location-info-section">
            <span className="location-info-label">Known Items Here</span>
            {leftItems.map((it) => (
              <button
                key={it.uid}
                type="button"
                className="btn btn-secondary location-info-item-btn"
                disabled={!canAct}
                title={it.effect}
                onClick={() => takeItem(it)}
              >
                Pick Up {it.name}
              </button>
            ))}
          </div>
        )}
        {info.length > 0 && (
          <div className="location-info-section">
            <span className="location-info-label">What's Been Found Here</span>
            {info.slice(-3).map((entry, i) => (
              <p key={i} className="location-info-clue">"{entry.text}"</p>
            ))}
          </div>
        )}
        {canAct && (
          <button type="button" className="btn btn-accent location-info-search-btn" onClick={search}>
            {loc.searchCount ? "Search Again" : "Search Area"}
          </button>
        )}
        {!canAct && isMyLocation && myRole === "teen" && (
          <p className="location-info-hint">Wait for your turn to act here.</p>
        )}
      </div>
    </div>
  );
}
