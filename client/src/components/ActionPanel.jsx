import { socket } from "../socket";

function act(action, onError) {
  socket.emit("action", action, (res) => {
    if (!res?.ok) onError?.(res?.error || "Action failed.");
  });
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
  const hasKit = (ids) => ids.every((id) => items.some((it) => it.id === id));
  const teammatesHere = state.players.filter(
    (p) => p.id !== me.id && p.role === "teen" && p.location === me.location && p.status !== "dead" && p.status !== "escaped"
  );

  return (
    <div className="action-panel">
      <h4>Your Turn — {loc.name}</h4>

      {state.slasherPresent && (
        <div className="danger-banner">The Slasher is here with you!</div>
      )}

      <ActionGroup title="Move to">
        {loc.connections.map((toId) => (
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
            disabled={!hasKit(["ritual_candle", "occult_book", "cursed_tape"])}
            onClick={() => act({ type: "ritual" }, onError)}
          >
            Perform Ritual
          </button>
        )}
        {loc.exit && (
          <button
            className="btn btn-accent"
            disabled={!hasKit(["car_keys", "gas_can"])}
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
