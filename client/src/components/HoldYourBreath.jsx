import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";

const DECAY_PER_TICK = 6;
const DECAY_INTERVAL_MS = 220;
const REFILL_PER_PRESS = 14;
const TICK_MS = 100;
const RESOLUTION_DISPLAY_MS = 1700;

// A cinematic full-screen minigame: the server has started a 10-second
// search (searchEndsAt) after the Slasher cornered your hiding spot. Mash
// SPACE (or the on-screen button) to keep your breath meter above zero
// until the timer runs out — let it hit zero and the Monster hears you.
// Either outcome is reported back to the server via hold_breath_result;
// the server also has its own fallback timeout in case this never fires
// (e.g. the tab goes idle), so staying silent always resolves as caught.
export default function HoldYourBreath({ searchEndsAt, searching, hiding, onResolved }) {
  const [breath, setBreath] = useState(100);
  const [msLeft, setMsLeft] = useState(() => Math.max(0, (searchEndsAt ?? Date.now()) - Date.now()));
  const [resolution, setResolution] = useState(null); // null | "passed" | "caught"
  const breathRef = useRef(100);
  const reportedRef = useRef(false);
  const resolvedRef = useRef(false);

  const refill = useCallback(() => {
    if (resolvedRef.current) return;
    breathRef.current = Math.min(100, breathRef.current + REFILL_PER_PRESS);
    setBreath(breathRef.current);
  }, []);

  const resolve = useCallback((outcome) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setResolution(outcome);
    setTimeout(() => onResolved?.(), RESOLUTION_DISPLAY_MS);
  }, [onResolved]);

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
      if (resolvedRef.current) return;
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
        resolve("caught");
      } else if (remaining <= 0) {
        reportedRef.current = true;
        socket.emit("hold_breath_result", { success: true });
        resolve("passed");
      }
    }, TICK_MS);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearInterval(interval);
    };
  }, [refill, resolve, searchEndsAt]);

  // Authoritative fallback: if the server resolves the search before our
  // own local timer noticed (a backgrounded tab, lag, etc.), take the cue
  // from the live state instead of leaving the overlay stuck.
  useEffect(() => {
    if (searching === false && !resolvedRef.current) {
      resolve(hiding ? "passed" : "caught");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  const critical = breath < 30;
  const secondsLeft = Math.ceil(msLeft / 1000);
  const heartbeatSpeed = resolution ? 1.4 : critical ? 0.5 : breath < 60 ? 0.75 : 1.1;

  return (
    <div
      className={`hold-breath-cinema${critical ? " critical" : ""}${resolution ? ` resolved ${resolution}` : ""}`}
      style={{ "--heartbeat-speed": `${heartbeatSpeed}s` }}
    >
      <div className="hold-breath-vignette" />
      {!resolution && (
        <div className="hold-breath-content">
          <div className="hold-breath-title">THE MONSTER IS NEARBY</div>
          <div className="hold-breath-title-sub">HOLD YOUR BREATH</div>
          <div className="hold-breath-sub">Press SPACE repeatedly to stay quiet for {secondsLeft}s…</div>
          <div className="breath-meter-track">
            <div className="breath-meter-fill" style={{ width: `${breath}%` }} />
          </div>
          <div className="hold-breath-countdown">{secondsLeft}</div>
          <button type="button" className="btn btn-danger breath-button" onPointerDown={refill}>
            Hold Your Breath
          </button>
        </div>
      )}
      {resolution === "passed" && (
        <div className="hold-breath-content resolution-content">
          <div className="hold-breath-resolution passed">THE MONSTER PASSED</div>
          <div className="hold-breath-sub">You stayed perfectly still…</div>
        </div>
      )}
      {resolution === "caught" && (
        <div className="hold-breath-content resolution-content">
          <div className="hold-breath-resolution caught">CAUGHT</div>
          <div className="hold-breath-sub">It heard you.</div>
        </div>
      )}
    </div>
  );
}
