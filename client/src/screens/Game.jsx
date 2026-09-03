import { useEffect, useMemo, useRef, useState } from "react";
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
import { socket } from "../socket";
import { sanityTier, SANITY_TIER_LABEL } from "../utils/sanity";
import { setMusicState } from "../utils/music";

// Derives which dynamic-music mix should be playing from signals the
// current player would actually perceive — never from hidden state the
// Killer's AI itself uses, so the score can't spoil information the UI
// doesn't already show. "hush" (near-silence but for a heartbeat) is the
// most tense mix of all: the Killer is right there and you're holding
// still, hoping it moves on.
function deriveMusicState(state, me, breathOverlay) {
  if (state.phase === "ended") return "calm";
  if (me.role === "teen") {
    if (state.slasherPresent && (me.hiding || breathOverlay)) return "hush";
    if (state.slasherPresent) return "chase";
    if (state.clockPhase === "final") return "final";
    if (me.hiding || breathOverlay) return "danger";
    if (state.slasherNearby || state.recentHorrorEvent) return "tension";
    return "calm";
  }
  if (state.clockPhase === "final") return "final";
  if (state.recentHorrorEvent) return "tension";
  return "calm";
}

export default function GameScreen({ state, playerId, onLeave }) {
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [breathOverlay, setBreathOverlay] = useState(null);
  const [discovery, setDiscovery] = useState(null);
  const [itemFeedback, setItemFeedback] = useState(null);
  const [sanityToast, setSanityToast] = useState(null);
  const [tierBanner, setTierBanner] = useState(null);
  const prevSanityRef = useRef(undefined);
  const me = state.players.find((p) => p.id === playerId);

  const handleSearchResult = (result) => {
    if (!result) return;
    setDiscovery(result);
  };

  const handleItemUseResult = (result) => {
    if (!result) return;
    setItemFeedback({ ...result, key: Date.now() });
  };

  const handleUseItem = (item) => {
    socket.emit("action", { type: "use_item", itemId: item.id }, (res) => {
      if (!res?.ok) setError(res?.error || "Action failed.");
      else if (res.itemUseResult) handleItemUseResult(res.itemUseResult);
    });
  };

  const handleBoardMove = (to) => {
    socket.emit("action", { type: "move", to }, (res) => {
      if (!res?.ok) setError(res?.error || "Action failed.");
    });
  };

  // A floating "+25" / "-10" whenever Sanity actually changes, plus a
  // banner the moment a new state (Stable/Uneasy/.../Broken) is entered —
  // so a change is always felt, not just reflected in a bar somewhere.
  useEffect(() => {
    if (me?.role !== "teen" || me.sanity == null) return;
    const prev = prevSanityRef.current;
    if (prev != null && prev !== me.sanity) {
      setSanityToast({ delta: me.sanity - prev, key: Date.now() });
      const prevTier = sanityTier(prev);
      const nextTier = sanityTier(me.sanity);
      if (prevTier !== nextTier) setTierBanner({ tier: nextTier, key: Date.now() + 1 });
    }
    prevSanityRef.current = me.sanity;
  }, [me?.sanity, me?.role]);

  useEffect(() => {
    if (!sanityToast) return undefined;
    const id = setTimeout(() => setSanityToast(null), 1800);
    return () => clearTimeout(id);
  }, [sanityToast]);

  useEffect(() => {
    if (!tierBanner) return undefined;
    const id = setTimeout(() => setTierBanner(null), 2600);
    return () => clearTimeout(id);
  }, [tierBanner]);

  useEffect(() => {
    if (!itemFeedback) return undefined;
    const id = setTimeout(() => setItemFeedback(null), 2800);
    return () => clearTimeout(id);
  }, [itemFeedback]);

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
      category: item.category,
      uses: item.uses,
      noiseLevel: item.noise,
      objective: !!item.objective,
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

  // Dynamic score: ramp toward whichever mix matches what's actually
  // happening to this player right now. "hush"/"chase" escalate on a
  // shorter crossfade so a sudden discovery actually lands as sudden.
  const musicState = useMemo(
    () => (me ? deriveMusicState(state, me, breathOverlay) : "calm"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.phase, state.slasherPresent, state.slasherNearby, state.clockPhase, state.recentHorrorEvent, me?.hiding, me?.role, breathOverlay]
  );
  useEffect(() => {
    setMusicState(musicState, { fast: musicState === "hush" || musicState === "chase" });
  }, [musicState]);

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
      // Baseline Move is one hop per Action Point (see ActionPanel) —
      // extended only by a temporary movement bonus, never while
      // Panicked/Broken.
      const tier = sanityTier(me.sanity);
      const panickedOrWorse = tier === "panicked" || tier === "broken";
      const moveHops = panickedOrWorse ? 1 : 1 + (me.tempSpeedBonus || 0);
      reachableLocations = moveHops > 1 ? reachableFrom(state.board, me.location, moveHops) : myLoc.connections;
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

        {tierBanner && (
          <div key={tierBanner.key} className={`banner banner-tier-change tier-${tierBanner.tier}`}>
            SANITY: {SANITY_TIER_LABEL[tierBanner.tier]?.toUpperCase()}
          </div>
        )}

        {itemFeedback && (
          <div key={itemFeedback.key} className="banner banner-item-feedback">
            <strong>{itemFeedback.itemName?.toUpperCase()} USED</strong>
            {itemFeedback.type === "sanity" && (
              <span className="feedback-line">SANITY {itemFeedback.sanityBefore} &rarr; {itemFeedback.sanityAfter}
                {itemFeedback.moveBonus ? ` · MOVEMENT +${itemFeedback.moveBonus} this turn` : ""}
              </span>
            )}
            {itemFeedback.type === "heal" && (
              <span className="feedback-line">HEALTH {itemFeedback.hpBefore} &rarr; {itemFeedback.hpAfter}</span>
            )}
          </div>
        )}
      </div>

      {sanityToast && (
        <div key={sanityToast.key} className={`sanity-toast${sanityToast.delta < 0 ? " drop" : " gain"}`}>
          SANITY {sanityToast.delta > 0 ? "+" : ""}{sanityToast.delta}
        </div>
      )}

      <div className="game-roster">
        <SurvivorHud players={state.players} me={playerId} />
      </div>

      {breathOverlay && (
        <HoldYourBreath
          key={breathOverlay.searchEndsAt}
          searchEndsAt={breathOverlay.searchEndsAt}
          searching={me.searching}
          hiding={me.hiding}
          sanity={me.sanity}
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
          myTurn={myTurn}
          myRole={me.role}
          slasherNearby={state.slasherNearby}
          slasherPresent={state.slasherPresent}
          killerName={killerName}
          monsterHp={state.monsterHp}
          monsterMaxHp={state.monsterMaxHp}
          hazardLocations={state.activeHorrorEventLocations}
          reachableLocations={reachableLocations}
          onMove={handleBoardMove}
          onSearchResult={handleSearchResult}
        />
      )}

      <div className="game-sidebar">
        <PlayerCard me={me} carRepaired={state.objectives?.carRepaired} monsterHp={state.monsterHp} monsterMaxHp={state.monsterMaxHp} onUseItem={handleUseItem} />
        {state.phase !== "ended" && (
          <ActionPanel state={state} me={me} onError={setError} onSearchResult={handleSearchResult} onItemUseResult={handleItemUseResult} />
        )}
      </div>
    </div>
  );
}
