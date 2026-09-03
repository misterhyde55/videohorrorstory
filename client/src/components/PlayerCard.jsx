import { useState } from "react";
import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";
import Inventory from "./Inventory";
import HealthBar from "./HealthBar";
import ObjectiveTracker from "./ObjectiveTracker";
import { sanityTier, SANITY_TIER_LABEL, BROKEN_RECOVER_SANITY } from "../utils/sanity";

const SANITY_STATUS_TEXT = {
  uneasy: "Uneasy — minor Fear penalties",
  frightened: "Frightened — Fear Checks and Hold Your Breath are harder",
  panicked: "Panicked — actions and Hold Your Breath are much harder, and you're louder",
};

export default function PlayerCard({ me, carRepaired, monsterHp, monsterMaxHp, onUseItem }) {
  const [expanded, setExpanded] = useState(false);
  const isSlasher = me.role === "slasher";
  const info = isSlasher ? KILLERS[me.pickId] : TEEN_CHARACTERS[me.pickId];
  if (!info) return null;

  const tier = !isSlasher ? sanityTier(me.sanity) : null;
  const itemCount = (me.items || []).length;

  return (
    <div className={`player-card${isSlasher ? " killer" : ""}`}>
      <div className="player-card-header" title={`${info.tagline} ${info.ability}`}>
        <span className="player-card-icon">{info.icon}</span>
        <div className="player-card-name">{info.name}</div>
        <span className="player-card-info-hint" aria-hidden="true">ⓘ</span>
      </div>

      {!isSlasher && (
        <>
          <HealthBar hp={me.hp} max={me.hpMax} kind="teen" label="Health" />
          <HealthBar hp={me.sanity} max={me.sanityMax} kind="sanity" label="Sanity" />
          {me.broken ? (
            <div className="sanity-status broken">
              BROKEN — recover to {BROKEN_RECOVER_SANITY} Sanity
            </div>
          ) : tier !== "stable" && (
            <div className={`sanity-status ${tier}`}>
              {SANITY_TIER_LABEL[tier]} — {SANITY_STATUS_TEXT[tier]?.split(" — ")[1] || ""}
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
        <>
          <HealthBar hp={monsterHp} max={monsterMaxHp} kind="monster" label="Monster Health" />
          <div className="player-card-cooldown">
            {me.specialCooldown > 0 ? `Special ready in ${me.specialCooldown}` : "Special ready"}
          </div>
        </>
      )}

      {!isSlasher && (
        <>
          <div className="player-card-divider" />
          <button
            type="button"
            className="player-card-toggle"
            onClick={() => setExpanded(true)}
          >
            <span>Gear &amp; Objectives ({itemCount}/{me.itemCapacity})</span>
            <span className="player-card-toggle-arrow" aria-hidden="true">▸</span>
          </button>
        </>
      )}

      {expanded && (
        <div className="modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="modal-card gear-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gear &amp; Objectives</h2>
              <button className="btn btn-ghost" onClick={() => setExpanded(false)} type="button">Close</button>
            </div>
            <div className="modal-body">
              <ObjectiveTracker items={me.items} carRepaired={carRepaired} />
              <div className="player-card-divider" />
              <Inventory items={me.items} capacity={me.itemCapacity} onUseItem={onUseItem} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
