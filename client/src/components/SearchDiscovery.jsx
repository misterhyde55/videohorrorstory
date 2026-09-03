import { useState } from "react";
import { socket } from "../socket";

// The popup that replaces the old auto-clearing search toast. It renders
// on top of the board (never a new screen) and, for an item find, holds
// the player's turn open server-side until they say Take or Leave — see
// gameState.js's pendingDiscoveryUid. Clue/VHS/nothing results have
// nothing to decide (the server already resolved the turn), so this just
// shows what happened and dismisses locally on Continue.
export default function SearchDiscovery({ result, me, onError, onDismiss }) {
  const [dropItemId, setDropItemId] = useState("");
  const [busy, setBusy] = useState(false);

  if (!result) return null;
  const isDecision = result.type === "item";
  // Only a fresh find (this player's turn is actually held open on it)
  // needs a server call to "leave" it — an item merely being glanced at
  // from the Left Here list was already sitting there and needs no undo.
  const isPending = me?.pendingDiscoveryUid === result.uid;

  function send(action) {
    setBusy(true);
    socket.emit("action", action, (res) => {
      setBusy(false);
      if (!res?.ok) onError?.(res?.error || "Action failed.");
      else onDismiss?.();
    });
  }

  function leave() {
    if (isPending) send({ type: "leave_item" });
    else onDismiss?.();
  }

  const noiseLine = result.noNoiseLine ? null : (
    <div className={`search-noise-line${result.noisy ? " noisy" : ""}`}>
      Noise Level: {result.noisy ? "NOISY — the Slasher may have heard you." : "Quiet — nobody heard a thing."}
    </div>
  );

  let title = "";
  let body = null;
  let actions = null;

  if (result.type === "item") {
    title = result.noNoiseLine ? "Pick Up Item" : "Found Something";
    body = (
      <>
        <p className="discovery-item-name">{result.itemName}</p>
        {result.effect && <p className="discovery-item-effect">{result.effect}</p>}
        {result.capacityItem && <p className="discovery-item-effect">Picking it up permanently expands what you can carry.</p>}
        {result.inventoryFull && !result.capacityItem && (
          <p className="discovery-full-warning">Your bag is full — take it and you'll need to leave something else behind.</p>
        )}
        {noiseLine}
      </>
    );
    if (result.inventoryFull && !result.capacityItem) {
      actions = (
        <>
          <select className="compact-select" value={dropItemId} onChange={(e) => setDropItemId(e.target.value)} disabled={busy}>
            <option value="">Drop what to make room…</option>
            {(me?.items || []).map((it, i) => (
              <option key={it.id + i} value={it.id}>{it.name}</option>
            ))}
          </select>
          <button
            className="btn btn-accent"
            disabled={busy || !dropItemId}
            onClick={() => send({ type: "take_item", uid: result.uid, dropItemId })}
          >
            Take &amp; Replace
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={leave}>
            Leave It
          </button>
        </>
      );
    } else {
      actions = (
        <>
          <button className="btn btn-accent" disabled={busy} onClick={() => send({ type: "take_item", uid: result.uid })}>
            Take
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={leave}>
            Leave It
          </button>
        </>
      );
    }
  } else if (result.type === "clue") {
    title = "Found a Clue";
    body = (
      <>
        <p className="discovery-clue-text">"{result.text}"</p>
        {noiseLine}
      </>
    );
    actions = <button className="btn btn-accent" onClick={onDismiss}>Continue</button>;
  } else if (result.type === "vhs") {
    title = "Found an Old VHS Tape";
    body = (
      <>
        <p className="discovery-clue-text">{result.text}</p>
        {noiseLine}
      </>
    );
    actions = <button className="btn btn-accent" onClick={onDismiss}>Continue</button>;
  } else {
    title = "Found Nothing";
    body = (
      <>
        {result.note && <p className="discovery-clue-text">{result.note}</p>}
        {noiseLine}
      </>
    );
    actions = <button className="btn btn-accent" onClick={onDismiss}>Continue</button>;
  }

  return (
    <div className="modal-backdrop discovery-modal-backdrop" onClick={isDecision ? undefined : onDismiss}>
      <div className="modal-card discovery-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <div className="modal-body discovery-modal-body">
          {body}
          <div className="discovery-actions">{actions}</div>
        </div>
      </div>
    </div>
  );
}
