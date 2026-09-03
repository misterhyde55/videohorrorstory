export default function HostGame({ name, setName, onBack, onCreate, disabled }) {
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
  }

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <span className="setup-logo">VHS</span>
        <h2 className="setup-title">Host a Game</h2>
        <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back to Main Menu</button>
      </div>

      <form onSubmit={submit} className="setup-body narrow-setup-body">
        <p className="solo-blurb">
          Creates a private lobby and a Room Code — share it with up to 4 friends, then start the match together.
        </p>
        <label className="setup-name-field">
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ashley" required />
        </label>
        <div className="tape-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>&#9664; Back</button>
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            Create Room
          </button>
        </div>
      </form>
    </div>
  );
}
