import HealthBar from "./HealthBar";

export default function PartyStatus({ players, me, monsterHp, monsterMaxHp }) {
  return (
    <div className="party-status">
      <div className="party-list-row monster-row">
        <span className="pname">Monster</span>
        <div className="party-list-bars">
          <HealthBar compact hp={monsterHp} max={monsterMaxHp} kind="monster" label="Monster" />
        </div>
      </div>

      <ul className="party-list">
        {players.filter((p) => p.role === "teen").map((p) => (
          <li key={p.id} className={p.status}>
            <div className="party-list-row">
              <span className="pname">
                {p.characterName || p.name}
                {p.id === me ? " (you)" : p.isBot ? " (AI)" : ""}
              </span>
              {p.status !== "alive" && <span className="status-tag">{p.status}</span>}
            </div>
            <div className="party-list-bars">
              <HealthBar compact hp={p.hp} max={p.hpMax || 2} kind="teen" label="Health" />
              <HealthBar compact hp={p.sanity} max={p.sanityMax || 1} kind="sanity" label="Sanity" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
