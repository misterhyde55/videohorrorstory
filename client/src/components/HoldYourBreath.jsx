import { useCallback, useEffect, useRef, useState } from "react";

const DECAY_PER_TICK = 7;
const DECAY_INTERVAL_MS = 220;
const REFILL_PER_PRESS = 16;

// A reactive tension overlay: while you're hidden and the Slasher is in your
// location, mash or hold SPACE (or the on-screen button) to keep your breath
// meter up. This is a feel/immersion layer — the actual chance of staying
// hidden is resolved server-side (see HIDING_DEFENSE in gameState.js); this
// never reports back to the server.
export default function HoldYourBreath() {
  const [breath, setBreath] = useState(100);
  const breathRef = useRef(100);

  const refill = useCallback(() => {
    breathRef.current = Math.min(100, breathRef.current + REFILL_PER_PRESS);
    setBreath(breathRef.current);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === "Space") {
        e.preventDefault();
        refill();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const interval = setInterval(() => {
      breathRef.current = Math.max(0, breathRef.current - DECAY_PER_TICK);
      setBreath(breathRef.current);
    }, DECAY_INTERVAL_MS);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearInterval(interval);
    };
  }, [refill]);

  const critical = breath < 30;

  return (
    <div className={`hold-breath-overlay${critical ? " critical" : ""}`}>
      <div className="hold-breath-title">The Killer is right here. Hold your breath!</div>
      <div className="hold-breath-sub">Press SPACE repeatedly to stay quiet…</div>
      <div className="breath-meter-track">
        <div className="breath-meter-fill" style={{ width: `${breath}%` }} />
      </div>
      <button type="button" className="btn btn-danger breath-button" onPointerDown={refill}>
        Hold Your Breath
      </button>
    </div>
  );
}
