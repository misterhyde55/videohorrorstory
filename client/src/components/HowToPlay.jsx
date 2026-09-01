import { TEEN_CHARACTERS, KILLERS } from "../data/characters";

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
              on repeat — with a 10-minute clock running the whole time.
            </p>
          </section>

          <section>
            <h3>Playing as a Teen</h3>
            <p>Win the game for your team by doing any <em>one</em> of these:</p>
            <ul>
              <li>🚗 <strong>Escape</strong> — find the Car Keys and a Gas Can, reach the Entrance Road, and drive away.</li>
              <li>🔪 <strong>Kill it</strong> — find a weapon (Machete, Fire Axe, Shotgun) and fight the killer where you find it.</li>
              <li>📼 <strong>Banish it</strong> — gather the Black Candle, Occult Book, and Cursed VHS Tape, then perform the ritual at the Root Cellar.</li>
            </ul>
            <p>On your turn: move to a connected location, search where you're standing for gear, or — if the killer is with you — fight or try to flee.</p>
            <p>If the 10-minute clock runs out before any of that happens, the killer wins.</p>
          </section>

          <section>
            <h3>Choose Your Teen</h3>
            <div className="help-grid">
              {Object.values(TEEN_CHARACTERS).map((c) => (
                <div key={c.id} className="help-card">
                  <span className="help-icon">{c.icon}</span>
                  <strong>{c.name}</strong>
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
              in place to build up a stalking bonus, or use your special ability once
              it's off cooldown.
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
