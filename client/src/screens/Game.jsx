import { useEffect, useState } from "react";
import Board from "../components/Board";
import ActionPanel from "../components/ActionPanel";
import PartyStatus from "../components/PartyStatus";
import PlayerCard from "../components/PlayerCard";
import LogFeed from "../components/LogFeed";

export default function GameScreen({ state, playerId, onLeave }) {
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const me = state.players.find((p) => p.id === playerId);

  useEffect(() => {
    if (state.phase !== "playing") return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  if (!me) return <div className="panel">You are spectating this round.</div>;

  const remainingMs = state.endsAt ? Math.max(0, state.endsAt - now) : 0;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clockLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const clockTier = totalSeconds <= 90 ? "danger" : totalSeconds <= 198 ? "warn" : "";

  return (
    <div className="game-layout">
      <div className="game-top">
        <div className="stat-chip">Round {state.round}</div>
        <div className={`stat-chip clock${clockTier ? ` clock-${clockTier}` : ""}`}>⏱ {clockLabel}</div>
        <div className="stat-chip">Room {state.code}</div>
        {state.monsterStunned && <div className="stat-chip stunned-chip">Monster Stunned!</div>}
        <button className="btn btn-ghost" onClick={onLeave} type="button">Leave</button>
      </div>

      {error && <div className="banner banner-error" onAnimationEnd={() => setError("")}>{error}</div>}

      {state.phase === "ended" ? (
        <div className={`endgame ${state.winner}`}>
          <h2>{state.winner === "teens" ? "The Teens Survive" : "The Slasher Wins"}</h2>
          <p>{state.winReason}</p>
          <button className="btn btn-primary" onClick={onLeave} type="button">Back to Menu</button>
        </div>
      ) : (
        <>
          <Board
            board={state.board}
            players={state.players}
            me={playerId}
            myLocation={me.location}
            slasherNearby={state.slasherNearby}
          />
          <ActionPanel state={state} me={me} onError={setError} />
        </>
      )}

      <div className="game-sidebar">
        <PlayerCard me={me} carRepaired={state.objectives?.carRepaired} />
        <PartyStatus players={state.players} me={playerId} monsterHp={state.monsterHp} monsterMaxHp={state.monsterMaxHp} />
        <h4>Camp Log</h4>
        <LogFeed log={state.log} />
      </div>
    </div>
  );
}
