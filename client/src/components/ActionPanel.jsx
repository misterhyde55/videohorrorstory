import { useState } from "react";
import { socket } from "../socket";
import { KILLERS, TEEN_CHARACTERS } from "../data/characters";

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

function sanityTier(sanity) {
  if (sanity <= 2) return "panicked";
  if (sanity <= 5) return "shaken";
  return "steady";
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
  const [distractTarget, setDistractTarget] = useState("");
  const items = me.items || [];
  const usableItems = items.filter((it) => it.utility === "heal" || it.utility === "sanity");
  const hasKit = (ids, min) => ids.filter((id) => items.some((it) => it.id === id)).length >= min;
  const character = TEEN_CHARACTERS[me.pickId];
  const tier = sanityTier(me.sanity);
  const speed = tier === "panicked" ? 1 : character.stats.speed;
  const teammatesHere = state.players.filter(
    (p) => p.id !== me.id && p.role === "teen" && p.location === me.location && p.status !== "dead" && p.status !== "escaped"
  );
  const deadHere = state.players.filter(
    (p) => p.id !== me.id && p.role === "teen" && p.location === me.location && p.status === "dead"
  );
  const isNerd = me.pickId === "nerd";
  const moveTargets = speed > 1 ? reachableFrom(state.board, me.location, speed) : loc.connections;
  const senseHere = state.slasherNearby && loc.connections.includes(state.slasherNearby);
  const carRepaired = state.objectives?.carRepaired;

  return (
    <div className="action-panel">
      <h4>Your Turn — {loc.name}</h4>

      {state.slasherPresent && (
        <div className="danger-banner">The Slasher is here with you!</div>
      )}
      {me.hiding && me.evadeSafe && (
        <div className="sense-banner hiding-banner">You gave the Killer the slip — you're safe here until it moves on.</div>
      )}
      {me.hiding && !me.evadeSafe && !state.slasherPresent && (
        <div className="sense-banner hiding-banner">You're hidden and holding still.</div>
      )}
      {!state.slasherPresent && senseHere && (
        <div className="sense-banner">You sense something is close, in {state.board[state.slasherNearby].name}...</div>
      )}
      {tier !== "steady" && (
        <div className={`sense-banner ${tier}`}>
          {tier === "panicked" ? "You're panicking — your actions may go wrong." : "You're shaken — your actions are less reliable."}
        </div>
      )}

      <ActionGroup title={speed > 1 ? `Move to (up to ${speed} away)` : "Move to"}>
        {moveTargets.map((toId) => (
          <button key={toId} className="btn btn-move" onClick={() => act({ type: "move", to: toId }, onError)}>
            {state.board[toId].name}
          </button>
        ))}
      </ActionGroup>

      <ActionGroup title="Actions">
        <button className="btn btn-secondary" onClick={() => act({ type: "search" }, onError)}>Search Area</button>
        {usableItems.map((it) => (
          <button key={it.id} className="btn btn-secondary" onClick={() => act({ type: "use_item", itemId: it.id }, onError)}>
            Use {it.name}
          </button>
        ))}
        {loc.safe && (
          <button
            className="btn btn-secondary"
            disabled={me.sanity >= me.sanityMax || state.slasherPresent}
            title={loc.safe ? "Rest here to recover 1 Sanity (once per Safe Location, up to 3 times each)" : ""}
            onClick={() => act({ type: "rest" }, onError)}
          >
            Rest
          </button>
        )}
        {loc.carSite && !carRepaired && (
          <button
            className="btn btn-secondary"
            disabled={!items.some((it) => it.id === "tool_kit")}
            onClick={() => act({ type: "repair" }, onError)}
          >
            Repair Car
          </button>
        )}
        <button
          className={me.hiding ? "btn btn-accent" : "btn btn-secondary"}
          onClick={() => act({ type: "hide" }, onError)}
        >
          {me.hiding ? "Stop Hiding" : "Hide"}
        </button>
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
            disabled={!hasKit(["car_keys", "gas_can"], 2) || !carRepaired}
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

      {deadHere.length > 0 && (
        <ActionGroup title="Revive">
          {deadHere.map((mate) => (
            <button
              key={mate.id}
              className="btn btn-accent"
              disabled={!items.some((it) => it.id === "first_aid")}
              onClick={() => act({ type: "revive", targetId: mate.id }, onError)}
            >
              Revive {mate.characterName} (uses First Aid Kit)
            </button>
          ))}
        </ActionGroup>
      )}

      {teammatesHere.length > 0 && (
        <ActionGroup title="Comfort">
          {teammatesHere.map((mate) => (
            <button
              key={mate.id}
              className="btn btn-secondary"
              disabled={mate.sanity >= mate.sanityMax}
              onClick={() => act({ type: "comfort", targetId: mate.id }, onError)}
            >
              Comfort {mate.characterName}
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

      {items.length > 0 && (
        <ActionGroup title="Discard">
          {items.map((it, i) => (
            <button
              key={it.id + i}
              className="btn btn-ghost"
              onClick={() => act({ type: "discard", itemId: it.id }, onError)}
            >
              Drop {it.name}
            </button>
          ))}
        </ActionGroup>
      )}

      {!me.distractUsed && (
        <ActionGroup title="Diversion (once per game)">
          <select
            className="distract-select"
            value={distractTarget}
            onChange={(e) => setDistractTarget(e.target.value)}
          >
            <option value="">Fake noise at…</option>
            {Object.values(state.board)
              .filter((l) => l.id !== me.location)
              .map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
          </select>
          <button
            className="btn btn-ghost"
            disabled={!distractTarget}
            onClick={() => {
              act({ type: "distract", to: distractTarget }, onError);
              setDistractTarget("");
            }}
          >
            Create Diversion
          </button>
        </ActionGroup>
      )}
    </div>
  );
}

function SlasherActions({ state, me, loc, onError }) {
  const targets = state.players.filter(
    (p) => p.role === "teen" && p.location === me.location && p.status !== "dead" && p.status !== "escaped" && !p.searching && !p.evadeSafe
  );
  const searchingHere = state.players.filter(
    (p) => p.role === "teen" && p.location === me.location && p.searching
  );
  const evadedHere = state.players.filter(
    (p) => p.role === "teen" && p.location === me.location && p.evadeSafe
  );
  const shortcutTargets = state.players.filter(
    (p) => p.role === "teen" && p.location !== me.location && p.status !== "dead" && p.status !== "escaped"
  );
  const killer = KILLERS[me.pickId];
  const specialLabel = killer?.id === "thing" ? "Mimic" : "Shortcut";
  const specialReady = !me.specialCooldown;
  const canSabotage = loc.carSite && state.objectives?.carRepaired;

  const noiseAlerts = state.noiseAlerts || [];

  return (
    <div className="action-panel">
      <h4>Your Turn — {loc.name}</h4>
      {state.killerSecretObjective && (
        <div className="secret-objective-banner" title={state.killerSecretObjective.description}>
          🎯 Secret: {state.killerSecretObjective.name}
        </div>
      )}
      {noiseAlerts.length > 0 && (
        <div className="noise-alert-list">
          {noiseAlerts.map((a) => (
            <div key={a.id} className={`noise-alert noise-${a.level}`}>
              {a.level === "loud" ? "🚨 LOUD NOISE" : "🔊 NOISE DETECTED"} — {a.locationName}
            </div>
          ))}
        </div>
      )}
      {state.slasherFrozen ? (
        <div className="sense-banner">
          🩸 Still getting your bearings — you can't move for your first couple of turns. Attack, Lurk, or Sabotage still work if a teen wanders up.
        </div>
      ) : (
        <ActionGroup title="Move to">
          {loc.connections.map((toId) => (
            <button key={toId} className="btn btn-move" onClick={() => act({ type: "move", to: toId }, onError)}>
              {state.board[toId].name}
            </button>
          ))}
        </ActionGroup>
      )}
      {targets.length > 0 && (
        <ActionGroup title="Attack">
          {targets.map((t) => (
            <button key={t.id} className="btn btn-danger" onClick={() => act({ type: "attack", targetId: t.id }, onError)}>
              {t.hiding ? `Search for ${t.characterName}` : `Attack ${t.characterName}`}
            </button>
          ))}
        </ActionGroup>
      )}
      {searchingHere.length > 0 && (
        <div className="sense-banner">
          Already searching for {searchingHere.map((t) => t.characterName).join(", ")}…
        </div>
      )}
      {evadedHere.length > 0 && (
        <div className="sense-banner">
          {evadedHere.map((t) => t.characterName).join(", ")} gave you the slip here — move on and come back to try again.
        </div>
      )}
      <ActionGroup title="Actions">
        <button className="btn btn-ghost" onClick={() => act({ type: "lurk" }, onError)}>Lurk in the Shadows</button>
        {canSabotage && (
          <button className="btn btn-danger" onClick={() => act({ type: "sabotage" }, onError)}>Sabotage the Car</button>
        )}
      </ActionGroup>
      {!state.slasherFrozen && shortcutTargets.length > 0 && (
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
