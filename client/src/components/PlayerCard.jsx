import { TEEN_CHARACTERS, KILLERS } from "../data/characters";
import Inventory from "./Inventory";
import HealthBar from "./HealthBar";
import ObjectiveTracker from "./ObjectiveTracker";

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
        <HealthBar hp={me.hp} max={2} kind="teen" label="Health" />
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
          <ObjectiveTracker items={me.items} />
          <div className="player-card-divider" />
          <Inventory items={me.items} />
        </>
      )}
    </div>
  );
}
