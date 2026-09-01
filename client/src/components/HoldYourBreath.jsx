import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";

const DECAY_PER_TICK = 6;
const DECAY_INTERVAL_MS = 220;
const REFILL_PER_PRESS = 14;
const TICK_MS = 100;

// A real timed minigame: the server has started a 10-second search
// (searchEndsAt) after the Slasher cornered your hiding spot. Mash SPACE (or
// the on-screen button) to keep your breath meter above zero until the timer
// runs out — let it hit zero and you're caught. Either outcome is reported
// back to the server via hold_breath_result; the server also has its own
// fallback timeout in case this never fires (e.g. the tab goes idle), so
// staying silent always resolves as getting caught.
export default function HoldYourBreath({ searchEndsAt }) {
  const [breath, setBreath] = useState(100);
  const [msLeft, setMsLeft] = useState(() => Math.max(0, (searchEndsAt ?? Date.now()) - Date.now()));
  const breathRef = useRef(100);
  const reportedRef = useRef(false);

  const refill = useCallback(() => {
    breathRef.current = Math.min(100, breathRef.current + REFILL_PER_PRESS);
    setBreath(breathRef.current);
  }, []);

  useEffect(() => {
    reportedRef.current = false;
    breathRef.current = 100;
    setBreath(100);
  }, [searchEndsAt]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === "Space") {
        e.preventDefault();
        refill();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    let decayAccum = 0;
    const interval = setInterval(() => {
      decayAccum += TICK_MS;
      if (decayAccum >= DECAY_INTERVAL_MS) {
        decayAccum = 0;
        breathRef.current = Math.max(0, breathRef.current - DECAY_PER_TICK);
        setBreath(breathRef.current);
      }

      const remaining = Math.max(0, (searchEndsAt ?? Date.now()) - Date.now());
      setMsLeft(remaining);

      if (reportedRef.current) return;
      if (breathRef.current <= 0) {
        reportedRef.current = true;
        socket.emit("hold_breath_result", { success: false });
      } else if (remaining <= 0) {
        reportedRef.current = true;
        socket.emit("hold_breath_result", { success: true });
      }
    }, TICK_MS);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearInterval(interval);
    };
  }, [refill, searchEndsAt]);

  const critical = breath < 30;
  const secondsLeft = Math.ceil(msLeft / 1000);

  return (
    <div className={`hold-breath-overlay${critical ? " critical" : ""}`}>
      <div className="hold-breath-title">The Killer is right here. Hold your breath!</div>
      <div className="hold-breath-sub">Press SPACE repeatedly to stay quiet for {secondsLeft}s…</div>
      <div className="breath-meter-track">
        <div className="breath-meter-fill" style={{ width: `${breath}%` }} />
      </div>
      <div className="hold-breath-countdown">{secondsLeft}</div>
      <button type="button" className="btn btn-danger breath-button" onPointerDown={refill}>
        Hold Your Breath
      </button>
    </div>
  );
}
