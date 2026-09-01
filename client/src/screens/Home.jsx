import { useState } from "react";

export default function Home({ onCreate, onJoin, disabled }) {
  const [name, setName] = useState(localStorage.getItem("vhs_name") || "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("create");

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") onCreate(name.trim());
    else if (code.trim()) onJoin(name.trim(), code.trim());
  }

  return (
    <div className="panel home-panel">
      <p className="tagline">
        A haunted VCR has released something into the world. Four teenagers. One night.
        <br />
        Escape. Kill it. Or send it back into the tape.
      </p>

      <div className="tabs">
        <button className={mode === "create" ? "tab active" : "tab"} onClick={() => setMode("create")} type="button">
          Host a Game
        </button>
        <button className={mode === "join" ? "tab active" : "tab"} onClick={() => setMode("join")} type="button">
          Join a Game
        </button>
      </div>

      <form onSubmit={submit} className="form-stack">
        <label>
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ashley" required />
        </label>

        {mode === "join" && (
          <label>
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
        )}

        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {mode === "create" ? "Create Room" : "Join Room"}
        </button>
      </form>
    </div>
  );
}
