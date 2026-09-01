export default function PartyStatus({ players, me, monsterHp, monsterMaxHp }) {
  return (
    <div className="party-status">
      <h4>Monster</h4>
      <HealthBar hp={monsterHp} max={monsterMaxHp} kind="monster" />

      <h4>Teens</h4>
      <ul className="party-list">
        {players.filter((p) => p.role === "teen").map((p) => (
          <li key={p.id} className={p.status}>
            <span className="pname">{p.characterName || p.name}{p.id === me ? " (you)" : ""}</span>
            <HealthBar hp={p.hp} max={2} kind="teen" />
            <span className="status-tag">{p.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HealthBar({ hp, max, kind }) {
  return (
    <div className={`health-bar health-${kind}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < hp ? "pip filled" : "pip"} />
      ))}
    </div>
  );
}
