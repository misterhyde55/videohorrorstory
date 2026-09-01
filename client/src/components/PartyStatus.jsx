import HealthBar from "./HealthBar";

export default function PartyStatus({ players, me, monsterHp, monsterMaxHp }) {
  return (
    <div className="party-status">
      <h4>Monster</h4>
      <HealthBar hp={monsterHp} max={monsterMaxHp} kind="monster" />

      <h4>Teens</h4>
      <ul className="party-list">
        {players.filter((p) => p.role === "teen").map((p) => (
          <li key={p.id} className={p.status}>
            <div className="party-list-row">
              <span className="pname">{p.characterName || p.name}{p.id === me ? " (you)" : ""}</span>
              <span className="status-tag">{p.status}</span>
            </div>
            <div className="party-list-bars">
              <HealthBar hp={p.hp} max={p.hpMax || 2} kind="teen" />
              <HealthBar hp={p.sanity} max={p.sanityMax || 1} kind="sanity" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
