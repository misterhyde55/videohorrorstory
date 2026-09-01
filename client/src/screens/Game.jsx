import { useState } from "react";
import Board from "../components/Board";
import ActionPanel from "../components/ActionPanel";
import PartyStatus from "../components/PartyStatus";
import Inventory from "../components/Inventory";
import LogFeed from "../components/LogFeed";

export default function GameScreen({ state, playerId, onLeave }) {
  const [error, setError] = useState("");
  const me = state.players.find((p) => p.id === playerId);

  if (!me) return <div className="panel">You are spectating this round.</div>;

  return (
    <div className="game-layout">
      <div className="game-top">
        <div className="stat-chip">Round {state.round}</div>
        <div className="stat-chip reel">
          Reel: {"▮".repeat(Math.max(state.reelRoundsLeft, 0))}
          {state.reelRoundsLeft <= 3 && <span className="reel-warning"> — running out!</span>}
        </div>
        <div className="stat-chip">Room {state.code}</div>
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
          <Board board={state.board} players={state.players} me={playerId} myLocation={me.location} />
          <ActionPanel state={state} me={me} onError={setError} />
        </>
      )}

      <div className="game-sidebar">
        <PartyStatus players={state.players} me={playerId} monsterHp={state.monsterHp} monsterMaxHp={state.monsterMaxHp} />
        <h4>Inventory</h4>
        <Inventory items={me.items} />
        <h4>Camp Log</h4>
        <LogFeed log={state.log} />
      </div>
    </div>
  );
}
