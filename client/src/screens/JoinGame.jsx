import { useState } from "react";

export default function JoinGame({ name, setName, onBack, onJoin, disabled }) {
  const [code, setCode] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onJoin(name.trim(), code.trim());
  }

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <span className="setup-logo">VHS</span>
        <h2 className="setup-title">Join a Game</h2>
        <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back to Main Menu</button>
      </div>

      <form onSubmit={submit} className="setup-body narrow-setup-body">
        <label className="setup-name-field">
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ashley" required />
        </label>
        <label className="setup-name-field">
          Room Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="XXXX"
            required
            className="code-input"
          />
        </label>
        <div className="tape-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back</button>
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            Join Game
          </button>
        </div>
      </form>
    </div>
  );
}
