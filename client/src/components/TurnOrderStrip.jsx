import { TEEN_CHARACTERS } from "../data/characters";

// A compact "who's up next" tracker so the turn structure never has to be
// guessed: every player in their fixed turn order, the current one glowing,
// dead/escaped teens dimmed out. The Slasher always shows as a generic
// icon here (never its specific type) so this can't leak the Thing's
// hidden identity.
export default function TurnOrderStrip({ players, turnOrder, turnPlayerId }) {
  if (!turnOrder?.length) return null;
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <div className="turn-strip">
      <span className="turn-strip-label">Turn Order</span>
      <div className="turn-strip-icons">
        {turnOrder.map((id) => {
          const p = byId[id];
          if (!p) return null;
          const isSlasher = p.role === "slasher";
          const icon = isSlasher ? "🔪" : TEEN_CHARACTERS[p.pickId]?.icon || "❓";
          const isCurrent = id === turnPlayerId;
          const isOut = p.status === "dead" || p.status === "escaped";
          return (
            <span
              key={id}
              className={`turn-strip-icon${isCurrent ? " current" : ""}${isOut ? " out" : ""}${isSlasher ? " slasher" : ""}`}
              title={`${isSlasher ? "The Slasher" : p.characterName || p.name}${isCurrent ? " — up now" : ""}`}
            >
              {icon}
            </span>
          );
        })}
      </div>
    </div>
  );
}
