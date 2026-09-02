import { useEffect, useState } from "react";
import Board from "../components/Board";
import ActionPanel from "../components/ActionPanel";
import PlayerCard from "../components/PlayerCard";
import HoldYourBreath from "../components/HoldYourBreath";
import PracticeTip from "../components/PracticeTip";

export default function GameScreen({ state, playerId, onLeave }) {
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [breathOverlay, setBreathOverlay] = useState(null);
  const me = state.players.find((p) => p.id === playerId);

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

  return (
    <div className="game-layout">
      <div className="game-top-stack">
        <div className="game-top">
          {state.mapName && <div className="stat-chip map-chip">📍 {state.mapName}</div>}
          <div className="stat-chip">Round {state.round}</div>
          <div className={`stat-chip clock${clockTier ? ` clock-${clockTier}` : ""}`}>⏱ {clockLabel}</div>
          <div className="stat-chip">Room {state.code}</div>
          {state.monsterStunned && <div className="stat-chip stunned-chip">Monster Stunned!</div>}
          <button className="btn btn-ghost" onClick={onLeave} type="button">Leave</button>
        </div>

        {state.phase === "playing" && <PracticeTip state={state} me={me} />}

        {error && <div className="banner banner-error" onAnimationEnd={() => setError("")}>{error}</div>}
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
        />
      )}

      <div className="game-sidebar">
        <PlayerCard me={me} carRepaired={state.objectives?.carRepaired} monsterHp={state.monsterHp} monsterMaxHp={state.monsterMaxHp} />
        {state.phase !== "ended" && <ActionPanel state={state} me={me} onError={setError} />}
      </div>
    </div>
  );
}
