import { TEEN_CHARACTERS, KILLERS } from "../data/characters";
import Inventory from "./Inventory";

export default function PlayerCard({ me }) {
  const isSlasher = me.role === "slasher";
  const info = isSlasher ? KILLERS[me.pickId] : TEEN_CHARACTERS[me.pickId];
  if (!info) return null;

  return (
    <div className={`player-card${isSlasher ? " killer" : ""}`}>
      <div className="player-card-header">
        <span className="player-card-icon">{info.icon}</span>
        <div>
          <div className="player-card-name">{info.name}</div>
          <div className="player-card-tagline">{info.tagline}</div>
        </div>
      </div>
      {!isSlasher && (
        <div className="health-bar health-teen player-card-hp">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className={i < me.hp ? "pip filled" : "pip"} />
          ))}
        </div>
      )}
      {isSlasher && (
        <div className="player-card-cooldown">
          {me.specialCooldown > 0 ? `Special ready in ${me.specialCooldown}` : "Special ready"}
        </div>
      )}
      <p className="player-card-ability">{info.ability}</p>
      {!isSlasher && (
        <>
          <div className="player-card-divider" />
          <Inventory items={me.items} />
        </>
      )}
    </div>
  );
}
