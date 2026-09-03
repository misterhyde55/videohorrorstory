import { useEffect, useState } from "react";
import Board from "../components/Board";
import ActionPanel from "../components/ActionPanel";
import PlayerCard from "../components/PlayerCard";
import SurvivorHud from "../components/SurvivorHud";
import HoldYourBreath from "../components/HoldYourBreath";
import PracticeTip from "../components/PracticeTip";
import PostGameRecap from "../components/PostGameRecap";
import TurnOrderStrip from "../components/TurnOrderStrip";
import SearchDiscovery from "../components/SearchDiscovery";
import { reachableFrom } from "../utils/reachable";

function sanityTier(sanity) {
  if (sanity <= 2) return "panicked";
  if (sanity <= 5) return "shaken";
  return "steady";
}

export default function GameScreen({ state, playerId, onLeave }) {
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [breathOverlay, setBreathOverlay] = useState(null);
  const [discovery, setDiscovery] = useState(null);
  const me = state.players.find((p) => p.id === playerId);

  const handleSearchResult = (result) => {
    if (!result) return;
    setDiscovery(result);
  };

  // A find held open server-side (pendingDiscoveryUid) survives a page
  // refresh or reconnect — rebuild the same popup from the item still
  // sitting at this location so the decision isn't lost.
  useEffect(() => {
    if (!me?.pendingDiscoveryUid) return;
    if (discovery?.uid === me.pendingDiscoveryUid) return;
    const loc = state.board?.[me.location];
    const item = loc?.leftItems?.find((it) => it.uid === me.pendingDiscoveryUid);
    if (!item) return;
    setDiscovery({
      type: "item",
      uid: item.uid,
      itemId: item.id,
      itemName: item.name,
      effect: item.effect,
      capacityItem: item.utility === "capacity",
      inventoryFull: (me.items?.length || 0) >= (me.itemCapacity || 0) && item.utility !== "capacity",
      noisy: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.pendingDiscoveryUid]);

  useEffect(() => {
    if (state.phase !== "playing") return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  useEffect(() => {
    if (me?.role === "teen" && me.searching && me.searchEndsAt) {
      setBreathOverlay((prev) => (prev?.searchEndsAt === me.searchEndsAt ? prev : { searchEndsAt: me.searchEndsAt }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.searching, me?.searchEndsAt]);

  if (!me) return <div className="panel">You are spectating this round.</div>;

  const remainingMs = state.endsAt ? Math.max(0, state.endsAt - now) : 0;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clockLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const clockTier = totalSeconds <= 90 ? "danger" : totalSeconds <= 198 ? "warn" : "";

  const slasherPlayer = state.players.find((p) => p.role === "slasher");
  const killerName = state.killers?.[slasherPlayer?.pickId]?.name || "The Slasher";

  // Legal move destinations for the board to highlight directly, so a
  // player never has to guess what's reachable from the sidebar list alone.
  const myTurn = state.turnPlayerId === playerId;
  const myLoc = state.board?.[me.location];
  let reachableLocations = [];
  if (myTurn && state.phase === "playing" && myLoc) {
    if (me.role === "slasher") {
      reachableLocations = state.slasherFrozen ? [] : myLoc.connections;
    } else {
      const character = state.characters?.[me.pickId];
      const tier = sanityTier(me.sanity);
      const speed = tier === "panicked" ? 1 : character?.stats?.speed ?? 1;
      reachableLocations = speed > 1 ? reachableFrom(state.board, me.location, speed) : myLoc.connections;
    }
  }

  return (
    <div className="game-layout">
      <div className="game-top-stack">
        <div className="game-top">
          {state.mapName && <div className="stat-chip map-chip">📍 {state.mapName}</div>}
          <div className="stat-chip">Round {state.round}</div>
          <div className={`stat-chip clock${clockTier ? ` clock-${clockTier}` : ""}`}>⏱ {clockLabel}</div>
          <div className="stat-chip">Room {state.code}</div>
          {state.clockPhase === "final" && <div className="stat-chip final-act-chip">⚠ FINAL ACT</div>}
          {state.monsterStunned && <div className="stat-chip stunned-chip">Monster Stunned!</div>}
          <button className="btn btn-ghost" onClick={onLeave} type="button">Leave</button>
        </div>

        {state.phase === "playing" && (
          <TurnOrderStrip players={state.players} turnOrder={state.turnOrder} turnPlayerId={state.turnPlayerId} />
        )}

        {state.phase === "playing" && <PracticeTip state={state} me={me} />}

        {state.recentHorrorEvent && (
          <div className="banner banner-horror-event">👻 {state.recentHorrorEvent.summary}</div>
        )}

        {error && <div className="banner banner-error" onAnimationEnd={() => setError("")}>{error}</div>}
      </div>

      <div className="game-roster">
        <SurvivorHud players={state.players} me={playerId} />
      </div>

      {breathOverlay && (
        <HoldYourBreath
          key={breathOverlay.searchEndsAt}
          searchEndsAt={breathOverlay.searchEndsAt}
          searching={me.searching}
          hiding={me.hiding}
          onResolved={() => setBreathOverlay(null)}
        />
      )}

      {discovery && (
        <SearchDiscovery
          result={discovery}
          me={me}
          onError={setError}
          onDismiss={() => setDiscovery(null)}
        />
      )}

      {state.phase === "ended" ? (
        <div className={`endgame ${state.winner}`}>
          <h2>{state.winner === "teens" ? "The Teens Survive" : `${killerName} Wins`}</h2>
          <p>{state.winReason}</p>
          {state.killerSecretObjective && (
            <p className={`secret-objective-reveal${state.secretObjectiveAchieved ? " achieved" : ""}`}>
              🎯 {killerName}'s secret objective — {state.killerSecretObjective.name}: {" "}
              {state.secretObjectiveAchieved ? "ACHIEVED" : "FAILED"}
              <br />
              <span className="secret-objective-desc">{state.killerSecretObjective.description}</span>
            </p>
          )}
          <PostGameRecap recap={state.recap} characters={state.characters} killers={state.killers} />
          <button className="btn btn-primary" onClick={onLeave} type="button">Back to Menu</button>
        </div>
      ) : (
        <Board
          board={state.board}
          layout={state.layout}
          players={state.players}
          me={playerId}
          myLocation={me.location}
          slasherNearby={state.slasherNearby}
          slasherPresent={state.slasherPresent}
          killerName={killerName}
          monsterHp={state.monsterHp}
          monsterMaxHp={state.monsterMaxHp}
          hazardLocations={state.activeHorrorEventLocations}
          reachableLocations={reachableLocations}
        />
      )}

      <div className="game-sidebar">
        <PlayerCard me={me} carRepaired={state.objectives?.carRepaired} monsterHp={state.monsterHp} monsterMaxHp={state.monsterMaxHp} />
        {state.phase !== "ended" && (
          <ActionPanel state={state} me={me} onError={setError} onSearchResult={handleSearchResult} />
        )}
      </div>
    </div>
  );
}
