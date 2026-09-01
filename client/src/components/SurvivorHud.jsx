import { TEEN_CHARACTERS } from "../data/characters";

// A Dead-by-Daylight-style status HUD: each teen's portrait, name, and
// Health/Sanity bars stacked vertically, overlaid on the board itself so
// it's always visible without eating sidebar space.
export default function SurvivorHud({ players, me }) {
  const teens = players.filter((p) => p.role === "teen");
  if (!teens.length) return null;

  return (
    <div className="survivor-hud">
      {teens.map((p) => {
        const info = TEEN_CHARACTERS[p.pickId];
        const dead = p.status === "dead";
        const escaped = p.status === "escaped";
        const hpPct = p.hpMax > 0 ? Math.round((p.hp / p.hpMax) * 100) : 0;
        const sanityPct = p.sanityMax > 0 ? Math.round((p.sanity / p.sanityMax) * 100) : 0;

        return (
          <div key={p.id} className={`survivor-card ${p.status}${p.id === me ? " is-me" : ""}`}>
            <div className="survivor-portrait">
              <span className="survivor-portrait-icon">{info?.icon || "❓"}</span>
              {dead && <span className="survivor-portrait-x" aria-hidden="true">✕</span>}
            </div>
            <div className="survivor-info">
              <span className="survivor-name">
                {p.characterName || p.name}
                {p.id === me ? " (you)" : p.isBot ? " · ai" : ""}
              </span>
              {!dead && !escaped ? (
                <>
                  <div className="survivor-bar-track hp">
                    <div className="survivor-bar-fill" style={{ width: `${hpPct}%` }} />
                  </div>
                  <div className="survivor-bar-track sanity">
                    <div className="survivor-bar-fill" style={{ width: `${sanityPct}%` }} />
                  </div>
                </>
              ) : (
                <span className="survivor-status-label">{escaped ? "escaped" : "dead"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
