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
              A haunted VCR has released a killer somewhere around Pinehaven —
              either the Abandoned Wonderland, a long-shuttered amusement
              park, or the Pinehaven Campground, picked at random each game.
              One player controls that killer; everyone else plays a
              teenager trying to survive the night. Every game reshuffles
              the map's layout and connections around the same twelve
              landmarks — a hub at the dead center (Twisted Castle, or the
              campfire circle) and a single way out (Main Street, or the
              Camp Entrance) — so the Slasher's starting spot at the hub is
              always far from where the teens begin. Players take turns in
              order — each teen, then the killer, on repeat — with a live
              10-minute clock running the whole time. As the clock runs low,
              the Monster hits harder and isolated teens lose their nerve
              faster.
            </p>
          </section>

          <section>
            <h3>Actions</h3>
            <p>
              Each Teen gets 3 Action Points on their turn, spent in any order
              on Move, Search, Hide, Use Item, and everything else below —
              your turn only ends once all 3 are spent, or you choose to End
              Turn early. A few quick actions (Give, Discard, picking up an
              already-left item) don't cost an Action at all. Every teen also
              has a Special — a once-per-turn (or, for the Leader,
              once-per-round) ability worth an Action Point of its own:
            </p>
            <ul>
              <li><strong>The Leader — Let's Go</strong>: give a teammate at your location 1 bonus Action on their next turn.</li>
              <li><strong>The Athlete — Sprint</strong>: move up to 2 spaces at once. Loud — the Killer will hear it.</li>
              <li><strong>The Nerd — Tinker</strong>: your very next Interact this turn costs 0 Actions.</li>
              <li><strong>The Rebel — Bait</strong>: deliberately make LOUD Noise right where you're standing, pulling the Killer toward you.</li>
            </ul>
            <p>
              Some landmarks have their own Interact option beyond Search —
              grab coffee at the Diner, dig through the evidence locker at
              the Police Station, climb the Water Tower to Scout the
              Killer's exact spot, scavenge a General Store or Gas Station
              for a category of supplies, Regroup with teammates at the
              ritual site, or hop on a cabinet at the Arcade — each with its
              own limited uses per game or per match.
            </p>
          </section>

          <section>
            <h3>Playing as a Teen</h3>
            <p>Win the game for your team by doing any <em>one</em> of these:</p>
            <ul>
              <li>🚗 <strong>Escape</strong> — find the Car Keys, repair the car where it's parked (free, but noisy without a Tool Kit), then drive away. A Gas Can isn't required, but brings bonus Sanity when you go.</li>
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
              out by listening. Most of what you do is silent: walking, resting,
              hiding, using items. A few things aren't, and generate a
              Noise Alert that names the exact location (never who caused it),
              fading after a couple of rounds: running from the Killer, repairing
              the car, performing the ritual, stumbling while panicked, and
              driving away. Searching is a bit of a gamble too — about 1 in 4
              searches rummages loud enough to be heard, and you'll see the
              Noise Level right on the result. Use all of that — lead it
              somewhere loud, then go somewhere quiet.
            </p>
          </section>

          <section>
            <h3>Searching</h3>
            <p>
              Search never quietly drops something in your bag — it pops up
              right on the board showing exactly what you found, and you
              decide: Take it, Leave It where it is, or Take &amp; Replace
              something if your bag's full. Leave something behind and it
              stays real — you or a teammate can grab it later for free,
              no new search needed. The odds of finding anything good drop
              the more a spot's already been picked over (never all the
              way to zero), and not every search even turns up an item —
              sometimes it's a clue or an old VHS tape of found-footage
              lore instead, recorded automatically. A location that's had
              something left at it shows a small marker on the map.
            </p>
          </section>

          <section>
            <h3>Horror Events</h3>
            <p>
              A handful of times each match, in no fixed order, a random Horror
              Event fires for everyone to deal with: the power flickers out and
              swallows all sound for a round, static screams from every radio
              at once, a false report crackles over the airwaves, lightning
              throws the Slasher's silhouette against a wall for one instant,
              somewhere on the map turns hostile and unsafe to settle down at, or
              someone stumbles on an old home movie that helps steady their
              nerves. No two matches roll the same mix.
            </p>
          </section>

          <section>
            <h3>NPC Survivors</h3>
            <p>
              A couple of other people are stuck out there too, marked on
              the map. Reach one and Rescue them for Sanity, and often
              something useful they were holding onto. Leave them too long
              and it stops being your call — once the Nightmare Level turns
              far enough, they're on their own, and if it goes all the way,
              they don't make it. The Killer walking into their spot ends
              it immediately, any time.
            </p>
          </section>

          <section>
            <h3>Nightmare Level</h3>
            <p>
              A separate, global escalation track (0-6) rises as the clock
              runs down and as teens die — it never goes back down, and it
              changes the world, not just the numbers. Horror Events fire
              more often as it climbs, harsher ones unlock outright, and at
              its higher tiers a couple of locations go permanently wrong
              for the rest of the match — nowhere to settle down there
              again, all night.
            </p>
          </section>

          <section>
            <h3>The Post-Game Recap</h3>
            <p>
              Once the match ends, the secrecy drops — the end screen recaps
              the whole story: who really played the Slasher, how each teen's
              night went and where and when it ended, a chronological rundown
              of the match's key scenes, and every Horror Event that fired.
              It's built fresh from that match's own log, so it's always the
              real story, and never the same one twice.
            </p>
          </section>

          <section>
            <h3>Sanity</h3>
            <p>
              Every teen has a Sanity meter (0–100, starting at 80) alongside
              their Health. Being alone drains it each turn — sticking with a
              teammate just stops the bleeding, it doesn't heal you — and
              seeing the Monster, watching a teammate get hit, or finding a
              body all cost real, noticeable Sanity. Five states track how
              you're holding up:
            </p>
            <ul>
              <li><strong>Stable</strong> (76–100) — no penalty.</li>
              <li><strong>Uneasy</strong> (51–75) — minor penalties to Fight/Flee/Escape rolls.</li>
              <li><strong>Frightened</strong> (26–50) — noticeably harder rolls, and Hold Your Breath gets tougher.</li>
              <li><strong>Panicked</strong> (1–25) — significantly harder rolls, you move slower, you can stumble or hallucinate, and you're louder while hiding.</li>
              <li><strong>Broken</strong> (0) — a Trauma Card, and everything above gets worse until you recover.</li>
            </ul>
            <p>
              Recovering Sanity takes deliberate effort, through three channels,
              each capped so it can't be farmed:
            </p>
            <ul>
              <li>🤝 <strong>Comfort</strong> — spend your whole turn to steady a teammate in your location for +10 Sanity (+15 from The Leader). Each teen can only be comforted once per round, and up to 30 total per game.</li>
              <li>🥤 <strong>Sanity items</strong> — Monster Energy restores 10 (and gives +1 Movement that turn), a Favorite Cassette restores 25, a Family Photo restores 20, and a rare Personal Item restores 30. Capped at 40 total from items per game.</li>
              <li>🎯 <strong>Objectives</strong> — repairing the car restores 5; banishing or destroying the Monster restores 10 to every teen still in it; escaping restores 10 (12 with a Gas Can) to the teen who made it out. Capped at 40 total from objectives per game.</li>
            </ul>
            <p>
              Hit 0 Sanity and you go <strong>Broken</strong> — you draw a Trauma
              Card and can only recover 10 Sanity per round until you claw your
              way back to 30. It can only happen once a game; after that, a bad
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
              Stalk the grounds and catch teens alone. You win if every teen is dead, or
              if the 10-minute clock runs out before they escape, kill you, or banish
              you. On your turn: move, attack a teen who shares your location, lurk
              in place to build up a stalking bonus, sabotage a repaired car at
              the exit, or use your special ability once it's off cooldown.
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
            <h3>Learning Its Weakness</h3>
            <p>
              Every Killer has a real, permanent vulnerability the team can
              uncover through play — not a stat line handed out at the
              start. Access Evidence at the Police Station and Investigate
              at the wonderland map's riskier landmarks both turn up real
              evidence on it; once the team has found enough, its signature
              edge is blunted for the rest of the match. Different Killers
              lose different things when exposed.
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
