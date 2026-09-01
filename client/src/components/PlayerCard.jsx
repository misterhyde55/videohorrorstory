import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";
import Inventory from "./Inventory";
import HealthBar from "./HealthBar";
import ObjectiveTracker from "./ObjectiveTracker";

function sanityTier(sanity) {
  if (sanity <= 2) return "panicked";
  if (sanity <= 5) return "shaken";
  return "steady";
}

export default function PlayerCard({ me, carRepaired }) {
  const isSlasher = me.role === "slasher";
  const info = isSlasher ? KILLERS[me.pickId] : TEEN_CHARACTERS[me.pickId];
  if (!info) return null;

  const tier = !isSlasher ? sanityTier(me.sanity) : null;

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
        <>
          <HealthBar hp={me.hp} max={me.hpMax} kind="teen" label="Health" />
          <HealthBar hp={me.sanity} max={me.sanityMax} kind="sanity" label="Sanity" />
          {me.broken ? (
            <div className="sanity-status panicked">
              BROKEN — recover to 3 Sanity to steady yourself
            </div>
          ) : tier !== "steady" && (
            <div className={`sanity-status ${tier}`}>
              {tier === "panicked" ? "Panicked — actions are much less reliable" : "Shaken — actions are less reliable"}
            </div>
          )}
          <div className="stat-row">
            {STAT_LABELS.map((s) => (
              <span key={s.key} className="stat-chip-mini" title={s.label}>
                {s.icon} {info.stats[s.key]}
              </span>
            ))}
          </div>
        </>
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
          <ObjectiveTracker items={me.items} carRepaired={carRepaired} />
          <div className="player-card-divider" />
          <Inventory items={me.items} />
        </>
      )}
    </div>
  );
}
