import { socket } from "../socket";
import { KILLERS } from "../data/characters";

function act(action, onError) {
  socket.emit("action", action, (res) => {
    if (!res?.ok) onError?.(res?.error || "Action failed.");
  });
}

function reachableFrom(board, locationId, hops) {
  let frontier = new Set([locationId]);
  const seen = new Set([locationId]);
  for (let i = 0; i < hops; i++) {
    const next = new Set();
    for (const loc of frontier) {
      for (const n of board[loc].connections) {
        if (!seen.has(n)) {
          seen.add(n);
          next.add(n);
        }
      }
    }
    frontier = next;
  }
  seen.delete(locationId);
  return [...seen];
}

export default function ActionPanel({ state, me, onError }) {
  const myTurn = state.turnPlayerId === me.id;
  const loc = state.board[me.location];

  if (!myTurn) {
    const turnPlayer = state.players.find((p) => p.id === state.turnPlayerId);
    return (
      <div className="action-panel waiting">
        Waiting for <strong>{turnPlayer?.role === "slasher" ? "the Slasher" : turnPlayer?.characterName || turnPlayer?.name}</strong>&hellip;
      </div>
    );
  }

  if (me.role === "slasher") return <SlasherActions state={state} me={me} loc={loc} onError={onError} />;
  return <TeenActions state={state} me={me} loc={loc} onError={onError} />;
}

function TeenActions({ state, me, loc, onError }) {
  const items = me.items || [];
  const healItems = items.filter((it) => it.utility === "heal");
  const hasKit = (ids, min) => ids.filter((id) => items.some((it) => it.id === id)).length >= min;
  const teammatesHere = state.players.filter(
    (p) => p.id !== me.id && p.role === "teen" && p.location === me.location && p.status !== "dead" && p.status !== "escaped"
  );
  const isCheerleader = me.pickId === "cheerleader";
  const isNerd = me.pickId === "nerd";
  const moveTargets = isCheerleader ? reachableFrom(state.board, me.location, 2) : loc.connections;
  const senseHere = state.slasherNearby && loc.connections.includes(state.slasherNearby);

  return (
    <div className="action-panel">
      <h4>Your Turn — {loc.name}</h4>

      {state.slasherPresent && (
        <div className="danger-banner">The Slasher is here with you!</div>
      )}
      {!state.slasherPresent && senseHere && (
        <div className="sense-banner">You sense something is close, in {state.board[state.slasherNearby].name}...</div>
      )}

      <ActionGroup title={isCheerleader ? "Move to (up to 2 away)" : "Move to"}>
        {moveTargets.map((toId) => (
          <button key={toId} className="btn btn-move" onClick={() => act({ type: "move", to: toId }, onError)}>
            {state.board[toId].name}
          </button>
        ))}
      </ActionGroup>

      <ActionGroup title="Actions">
        <button className="btn btn-secondary" onClick={() => act({ type: "search" }, onError)}>Search Area</button>
        {healItems.map((it) => (
          <button key={it.id} className="btn btn-secondary" onClick={() => act({ type: "use_item", itemId: it.id }, onError)}>
            Use {it.name}
          </button>
        ))}
        {loc.ritualSite && (
          <button
            className="btn btn-accent"
            disabled={!hasKit(["ritual_candle", "occult_book", "cursed_tape"], isNerd ? 2 : 3)}
            onClick={() => act({ type: "ritual" }, onError)}
          >
            Perform Ritual{isNerd ? " (needs any 2)" : ""}
          </button>
        )}
        {loc.exit && (
          <button
            className="btn btn-accent"
            disabled={!hasKit(["car_keys", "gas_can"], 2)}
            onClick={() => act({ type: "drive" }, onError)}
          >
            Drive Away
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => act({ type: "pass" }, onError)}>Wait</button>
      </ActionGroup>

      {state.slasherPresent && (
        <ActionGroup title="Confront the Slasher">
          <button className="btn btn-danger" onClick={() => act({ type: "fight" }, onError)}>
            Fight {items.some((i) => i.weapon) ? `(using ${items.find((i) => i.weapon).name})` : "(bare-handed)"}
          </button>
          {loc.connections.map((toId) => (
            <button key={toId} className="btn btn-danger" onClick={() => act({ type: "flee", to: toId }, onError)}>
              Flee to {state.board[toId].name}
            </button>
          ))}
        </ActionGroup>
      )}

      {teammatesHere.length > 0 && items.length > 0 && (
        <ActionGroup title="Give Item">
          {teammatesHere.map((mate) =>
            items.map((it) => (
              <button
                key={mate.id + it.id}
                className="btn btn-ghost"
                onClick={() => act({ type: "give", itemId: it.id, toPlayerId: mate.id }, onError)}
              >
                Give {it.name} to {mate.characterName}
              </button>
            ))
          )}
        </ActionGroup>
      )}
    </div>
  );
}

function SlasherActions({ state, me, loc, onError }) {
  const targets = state.players.filter(
    (p) => p.role === "teen" && p.location === me.location && p.status !== "dead" && p.status !== "escaped"
  );
  const shortcutTargets = state.players.filter(
    (p) => p.role === "teen" && p.location !== me.location && p.status !== "dead" && p.status !== "escaped"
  );
  const killer = KILLERS[me.pickId];
  const specialLabel = killer?.id === "thing" ? "Mimic" : "Shortcut";
  const specialReady = !me.specialCooldown;

  return (
    <div className="action-panel">
      <h4>Your Turn — {loc.name}</h4>
      <ActionGroup title="Move to">
        {loc.connections.map((toId) => (
          <button key={toId} className="btn btn-move" onClick={() => act({ type: "move", to: toId }, onError)}>
            {state.board[toId].name}
          </button>
        ))}
      </ActionGroup>
      {targets.length > 0 && (
        <ActionGroup title="Attack">
          {targets.map((t) => (
            <button key={t.id} className="btn btn-danger" onClick={() => act({ type: "attack", targetId: t.id }, onError)}>
              Attack {t.characterName}
            </button>
          ))}
        </ActionGroup>
      )}
      <ActionGroup title="Actions">
        <button className="btn btn-ghost" onClick={() => act({ type: "lurk" }, onError)}>Lurk in the Shadows</button>
      </ActionGroup>
      {shortcutTargets.length > 0 && (
        <ActionGroup title={`Special — ${specialLabel}${specialReady ? "" : ` (ready in ${me.specialCooldown})`}`}>
          {shortcutTargets.map((t) => (
            <button
              key={t.id}
              className="btn btn-danger"
              disabled={!specialReady}
              onClick={() => act({ type: "shortcut", targetId: t.id }, onError)}
            >
              {specialLabel} to {t.characterName}
            </button>
          ))}
        </ActionGroup>
      )}
    </div>
  );
}

function ActionGroup({ title, children }) {
  return (
    <div className="action-group">
      <span className="action-group-title">{title}</span>
      <div className="action-group-buttons">{children}</div>
    </div>
  );
}
