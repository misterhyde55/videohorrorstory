import { TEEN_CHARACTERS, KILLERS, STAT_LABELS } from "../data/characters";

export default function HowToPlay({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How to Play</h2>
          <button className="btn btn-ghost" onClick={onClose} type="button">Close</button>
        </div>

        <div className="modal-body">
          <section>
            <h3>The Story</h3>
            <p>
              A haunted VCR has released a killer into Crescent Lake Camp. One player
              controls that killer; everyone else plays a teenager trying to survive
              the night. Players take turns in order — each teen, then the killer,
              on repeat — with a live 10-minute clock running the whole time. As the
              clock runs low, the Monster hits harder and isolated teens lose their
              nerve faster.
            </p>
          </section>

          <section>
            <h3>Playing as a Teen</h3>
            <p>Win the game for your team by doing any <em>one</em> of these:</p>
            <ul>
              <li>🚗 <strong>Escape</strong> — find the Car Keys, a Gas Can, and a Tool Kit; repair the car at the Parking Lot; then drive away from the Entrance Road.</li>
              <li>🔪 <strong>Fight it off</strong> — find a weapon and confront the killer. Hits can either stun it (skips its next turn) or wound it — land enough wounds and it's destroyed. Weapons wear out and break after a few uses.</li>
              <li>📼 <strong>Banish it</strong> — gather the Black Candle, Occult Book, and Cursed VHS Tape, then perform the ritual at the Root Cellar.</li>
            </ul>
            <p>If the 10-minute clock runs out before any of that happens, the killer wins. The Monster can also sabotage a repaired car, so don't dawdle at the Entrance Road.</p>
            <p>If a teammate is killed, another teen holding a First Aid Kit can revive them (at 1 HP) by using it on them where they fell.</p>
          </section>

          <section>
            <h3>Sanity</h3>
            <p>
              Every teen has a Sanity meter alongside their Health. Being alone
              drains it each turn; sticking with a teammate restores it (faster
              if The Leader is there). The Monster suddenly appearing also costs
              Sanity. Low Sanity makes every action less reliable, and a fully
              panicked teen can hallucinate or stumble into the wrong room while
              trying to move.
            </p>
          </section>

          <section>
            <h3>Choose Your Teen</h3>
            <div className="help-grid">
              {Object.values(TEEN_CHARACTERS).map((c) => (
                <div key={c.id} className="help-card">
                  <span className="help-icon">{c.icon}</span>
                  <strong>{c.name}</strong>
                  <div className="stat-row">
                    {STAT_LABELS.map((s) => (
                      <span key={s.key} className="stat-chip-mini" title={s.label}>
                        {s.icon} {c.stats[s.key]}
                      </span>
                    ))}
                  </div>
                  <p>{c.ability}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>Playing as the Killer</h3>
            <p>
              Stalk the camp and catch teens alone. You win if every teen is dead, or
              if the 10-minute clock runs out before they escape, kill you, or banish
              you. On your turn: move, attack a teen who shares your location, lurk
              in place to build up a stalking bonus, sabotage a repaired car at the
              Parking Lot, or use your special ability once it's off cooldown.
            </p>
          </section>

          <section>
            <h3>Choose Your Killer</h3>
            <div className="help-grid">
              {Object.values(KILLERS).map((k) => (
                <div key={k.id} className="help-card killer">
                  <span className="help-icon">{k.icon}</span>
                  <strong>{k.name}</strong>
                  <p>{k.ability}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
