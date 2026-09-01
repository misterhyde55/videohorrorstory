# VHS: Video Horror Story

An online multiplayer party game inspired by 1980s slasher movies. A monster
has been unleashed from a haunted VHS tape into Crescent Lake Camp. Four
teenagers must search the camp for the gear they need to survive the night,
while one player controls the Slasher stalking them.

- **2–5 players**: 1 Slasher + up to 4 Teens (fewer teens works too).
- Real-time multiplayer over WebSockets — one player hosts a room, others join
  with a 4-letter code.
- **Solo mode** — no other players needed, but you're not alone: pick your
  teen and (optionally) which killer to face from the "Play Solo" tab, and
  the other 3 teens are played by AI companions alongside an AI Slasher.
  The AI teens explore, search, chase objectives, patch each other up,
  hide or flee from the Monster, and occasionally panic or make a bad call
  — they're teammates, not perfect players. The Slasher AI hunts down the
  nearest teen, attacks on sight, and uses its special ability on its own.

## How to win

**Teens** win by doing any one of the following:
- 🚗 **Escape** — find the Car Keys, a Gas Can, and a Tool Kit; repair the car where it's parked; then drive away from the exit. The Slasher can sabotage a repaired car, so don't wait too long.
- 🔪 **Fight it off** — find a weapon and confront the monster. A hit either stuns it (skips its next turn) or wounds it; enough wounds destroys it. Weapons wear out and break after a few uses.
- 📼 **Banish it** — gather the Black Candle, Occult Book, and Cursed VHS Tape, then perform the ritual at the ritual site.
- 🤫 **Hide** — toggle Hide on your turn to hold still. If the Slasher finds your hiding spot it searches for a tense 10-second countdown: mash SPACE (or tap the on-screen button) to hold your breath and stay hidden. Fail — or ignore it — and you get one automatic chance to bolt to a nearby location before the Slasher catches you.

**The Slasher** wins if every teen is killed, or if the 10-minute clock runs
out before the teens finish the job.

Play proceeds in turn order (each teen, then the Slasher, repeating), with a
live 10-minute countdown running the whole game. As the clock runs low, the
Monster hits harder and isolated teens lose Sanity faster. On your turn you
can move, search, fight or flee the Slasher, repair the car, revive a fallen
teammate, share items, or attempt to escape/banish the monster.

### Sanity

Every teen has a Sanity meter (0–10, starting at 8) alongside Health. Being
alone drains it each turn — grouping up with a teammate only stops the
drain, it doesn't heal you — and the Monster suddenly appearing costs
Sanity too. Low Sanity makes every action less reliable, and a fully
panicked teen can hallucinate or stumble into the wrong room while trying
to move.

Recovering it takes a deliberate turn and one of five capped channels:
**Rest** (+1, at a Safe Location, max 3 per location per game), **Comfort**
(+1 to a teammate in your location, +2 from The Leader; max 3 received per
game, once per round), **Sanity items** (Cassette Player/Family Photo +1,
Favorite VHS +2; max 4 from items per game), and **Objectives** (repairing
the car +1, banishing/destroying the Monster or escaping +2; max 4 from
objectives per game). Hitting 0 makes a teen **Broken** — they draw a
Trauma Card and can only recover 1 Sanity per round until they reach 3
again; it can only happen once per game, after which a bad scare bottoms
them out at 1 Sanity instead.

### Teens

Each teen player picks a unique archetype in the lobby, with real stats
(Health / Sanity / Speed / Stealth / Strength) plus a passive ability
(`server/src/characters.js`):
- 🧭 **The Leader** — teammates in your location recover Sanity faster; you find objective items more easily while searching.
- 🏈 **The Athlete** — hits harder in a fight, moves two locations at once, shrugs off failed escapes without injury.
- 🤓 **The Nerd** — can banish with only 2 of the 3 ritual relics, searches more thoroughly.
- 🖤 **The Rebel** — excellent at slipping away, and draws the Monster's focus away from more vulnerable teammates.

If a teen is killed, a teammate holding a First Aid Kit can revive them (at
1 HP) by using it on them where they fell.

### The Slasher

The Slasher player picks one killer type in the lobby:
- 🔪 **The Stalker** — hits harder the longer it stalks a target, escapes against it are harder, can shortcut straight to a tracked teen.
- 🛸 **The Thing** — stays undetected by teens until it strikes, and its attacks deal double damage.

## Project layout

```
server/   Node.js + Express + Socket.IO game server (authoritative game state)
client/   React + Vite front end
```

## Running locally

Requires Node.js 18+.

```bash
npm run install:all   # installs server + client dependencies
npm run dev           # runs the server (port 3001) and client (port 5173) together
```

Then open http://localhost:5173 in multiple browser tabs/devices to play.
The client expects the server at `VITE_SERVER_URL` (see `client/.env.example`);
copy it to `client/.env` and point it at your deployed server URL for
production.

### Running separately

```bash
npm run dev:server   # server/src/index.js on PORT (default 3001)
npm run dev:client   # Vite dev server on 5173
```

## Deploying

- **Server**: deploy `server/` to any Node host (Render, Railway, Fly.io, a
  VPS). Set `CLIENT_ORIGIN` to your client's URL for CORS.
- **Client**: `npm run build --prefix client` and deploy the static
  `client/dist` folder (Vercel, Netlify, static hosting). Set
  `VITE_SERVER_URL` at build time to your deployed server's URL.

## Game design notes

- The board (`server/src/board.js`) is procedurally generated fresh every
  game: a random 15-location subset (always including exactly one exit, one
  ritual site, and one car site), laid out on a randomized grid and
  connected by a nearest-neighbor graph so nodes that look close are
  actually connected. Teen starting spots are chosen by BFS distance to be
  as far from the Slasher's start as possible.
- Items and their "kits" (escape/kill/banish) live in `server/src/cards.js`.
- All game rules and win conditions are enforced server-side
  (`server/src/gameState.js`) — the client only renders state and sends
  action requests, so the game can't be cheated by editing client code.
- The Slasher's location is hidden from teens unless they share a location
  with it, to preserve tension; teens can see each other's locations to
  coordinate.
