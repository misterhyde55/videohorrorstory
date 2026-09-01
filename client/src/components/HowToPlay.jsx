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
              A haunted VCR has released a killer into camp. One player controls
              that killer; everyone else plays a teenager trying to survive the
              night. Every game generates a fresh, randomized map — different
              locations, layout, and connections each time — so the Slasher's
              starting spot is always far from where the teens begin. Players
              take turns in order — each teen, then the killer, on repeat — with
              a live 10-minute clock running the whole time. As the clock runs
              low, the Monster hits harder and isolated teens lose their nerve
              faster.
            </p>
          </section>

          <section>
            <h3>Playing as a Teen</h3>
            <p>Win the game for your team by doing any <em>one</em> of these:</p>
            <ul>
              <li>🚗 <strong>Escape</strong> — find the Car Keys, a Gas Can, and a Tool Kit; repair the car where it's parked; then drive away from the exit.</li>
              <li>🔪 <strong>Fight it off</strong> — find a weapon and confront the killer. Hits can either stun it (skips its next turn) or wound it — land enough wounds and it's destroyed. Weapons wear out and break after a few uses.</li>
              <li>📼 <strong>Banish it</strong> — gather the Black Candle, Occult Book, and Cursed VHS Tape, then perform the ritual at the ritual site.</li>
            </ul>
            <p>If the 10-minute clock runs out before any of that happens, the killer wins. The Monster can also sabotage a repaired car, so don't dawdle.</p>
            <p>If a teammate is killed, another teen holding a First Aid Kit can revive them (at 1 HP) by using it on them where they fell.</p>
            <p>
              🤫 <strong>Hide</strong> — toggle Hide on your turn to hold still. It gives you a big
              defense bonus if the Slasher finds you, and while it's searching your
              spot you mash SPACE (or tap the on-screen button) as fast as you can to
              hold your breath — it's a real struggle, not a light tap. Hold it long
              enough and the Slasher has to physically leave your location before it
              can search you again, so a good hide buys you a real chance to move on.
            </p>
            <p>
              🎒 <strong>Inventory</strong> — you can only carry a handful of items at
              once. Drop anything you don't need from the Discard action to make
              room, or search for a Canvas Bag, which permanently expands how much
              you can carry the moment you find it.
            </p>
            <p>
              🔊 <strong>Diversion</strong> — once per game, fake a Noise Alert at
              any location on the map to send the Killer somewhere you're not. See
              Noise below.
            </p>
          </section>

          <section>
            <h3>The Noise System</h3>
            <p>
              The Killer never sees where you are — it only learns your exact spot
              by standing right there with you. Everything else it has to figure
              out by listening. Most of what you do is silent: walking, searching,
              resting, hiding, using items. A few things aren't, and generate a
              Noise Alert that names the exact location (never who caused it),
              fading after a couple of rounds: running from the Killer, repairing
              the car, performing the ritual, stumbling while panicked, and
              driving away. Use that — lead it somewhere loud, then go somewhere
              quiet.
            </p>
          </section>

          <section>
            <h3>Sanity</h3>
            <p>
              Every teen has a Sanity meter (0–10, starting at 8) alongside their
              Health. Being alone drains it each turn — sticking with a teammate
              just stops the bleeding, it doesn't heal you — and the Monster
              suddenly appearing costs Sanity too. Low Sanity makes every action
              less reliable, and a fully panicked teen can hallucinate or stumble
              into the wrong room while trying to move.
            </p>
            <p>
              Recovering Sanity takes deliberate effort, through five channels,
              each capped so it can't be farmed:
            </p>
            <ul>
              <li>🛏️ <strong>Rest</strong> — spend your whole turn at a Safe Location (and the Slasher not there) to recover 1 Sanity. Each Safe Location only has 3 points of comfort to give you, all game.</li>
              <li>🤝 <strong>Comfort</strong> — spend your whole turn to steady a teammate in your location for +1 Sanity (+2 from The Leader). Each teen can only be comforted once per round, and up to 3 times total per game.</li>
              <li>📼 <strong>Sanity items</strong> — a Cassette Player or Family Photo restores 1, a Favorite VHS restores 2 (and takes a whole turn to watch). Capped at 4 total from items per game.</li>
              <li>🎯 <strong>Objectives</strong> — repairing the car restores 1; banishing or destroying the Monster, or escaping, restores 2. Capped at 4 total from objectives per game.</li>
            </ul>
            <p>
              Hit 0 Sanity and you go <strong>Broken</strong> — you draw a Trauma
              Card and can only recover 1 Sanity per round until you claw your
              way back to 3. It can only happen once a game; after that, a bad
              scare bottoms you out at 1 Sanity instead.
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
            <p>
              You can't move (or use your special ability) for your first 2 turns —
              a head start for the teens. Your attacks also start out weak, ease
              back to normal by the time the clock's about 40% gone, then get more
              dangerous as it runs low, so the back half of the night is when you
              really come into your own.
            </p>
            <p>
              You never see the teens' locations directly — only Noise Alerts
              (🔊/🚨) telling you where something just happened, fading after a
              couple of rounds, so you have to actually go investigate. You'll
              also be handed one secret objective at the start of the game beyond
              just killing everyone, revealed at the end.
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
