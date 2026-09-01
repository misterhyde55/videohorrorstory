# VHS: Video Horror Story

An online multiplayer party game inspired by 1980s slasher movies. A monster
has been unleashed from a haunted VHS tape into Crescent Lake Camp. Four
teenagers must search the camp for the gear they need to survive the night,
while one player controls the Slasher stalking them.

- **2–5 players**: 1 Slasher + up to 4 Teens (fewer teens works too).
- Real-time multiplayer over WebSockets — one player hosts a room, others join
  with a 4-letter code.

## How to win

**Teens** win by doing any one of the following:
- 🚗 **Escape** — find the Car Keys and a Gas Can, reach the Entrance Road, and drive away.
- 🔪 **Kill it** — find a weapon (Machete, Fire Axe, Shotgun) and win a fight against the monster.
- 📼 **Banish it** — gather the Black Candle, Occult Book, and Cursed VHS Tape, then perform the ritual at the Root Cellar.

**The Slasher** wins if every teen is killed, or if the 10-minute clock runs
out before the teens finish the job.

Play proceeds in turn order (each teen, then the Slasher, repeating), with a
live 10-minute countdown running the whole game. On your turn you can move
between connected locations, search your current location for gear, fight or
flee if the Slasher finds you, share items with teammates in the same
location, or attempt to escape/banish the monster.

### Teens

Each teen player picks a unique character in the lobby, each with a passive
ability (`server/src/characters.js`):
- 🏈 **The Jock** — +25% fight-hit chance, shrugs off failed escapes without injury.
- 🤓 **The Nerd** — can banish with only 2 of the 3 ritual relics, searches more thoroughly.
- 📣 **The Cheerleader** — much better odds of escaping the Slasher, can move two locations per turn.
- 🍃 **The Pothead** — always senses if the Slasher is one location away, finds a little extra while searching.

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

- The board (`server/src/board.js`) is a graph of 12 locations around the
  camp; movement is only allowed between connected locations.
- Items and their "kits" (escape/kill/banish) live in `server/src/cards.js`.
- All game rules and win conditions are enforced server-side
  (`server/src/gameState.js`) — the client only renders state and sends
  action requests, so the game can't be cheated by editing client code.
- The Slasher's location is hidden from teens unless they share a location
  with it, to preserve tension; teens can see each other's locations to
  coordinate.
