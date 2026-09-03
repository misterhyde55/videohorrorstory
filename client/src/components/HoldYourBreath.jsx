import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import { sanityTier } from "../utils/sanity";

const TICK_MS = 50;
const RESOLUTION_DISPLAY_MS = 1700;
const DETECTION_MAX = 100;
const MISS_MINOR = 25;
const MISS_MAJOR = 40;
const NEAR_MISS_MARGIN = 8; // % of track — a tap just outside the zone counts as the smaller penalty
const PASSIVE_WINDOW_MS = 2600; // go this long without a single tap and it counts as a missed beat
const DECAY_PER_SEC = 4; // rewards sustained good play — lets a single mistake be recoverable

// Sanity directly sets how hard the meter is: a smaller safe zone and (at
// the worst tiers) a less predictable indicator.
const TIER_ZONE_WIDTH = { stable: 22, uneasy: 18, frightened: 13, panicked: 9, broken: 6 };
const TIER_JITTER = { stable: 0, uneasy: 0, frightened: 0.15, panicked: 0.35, broken: 0.5 };

// The corner-search window itself ramps up in three stages as it runs —
// standing in for how close the Killer is at that moment, since by the
// time this overlay is up, it has already cornered your hiding spot.
function dangerStage(elapsedFraction) {
  if (elapsedFraction < 0.4) return { id: "nearby", label: "KILLER NEARBY", speed: 16, heartbeat: 1.1 };
  if (elapsedFraction < 0.75) return { id: "close", label: "KILLER CLOSE", speed: 26, heartbeat: 0.75 };
  return { id: "outside", label: "KILLER RIGHT OUTSIDE", speed: 38, heartbeat: 0.45 };
}

function randomZoneStart(width) {
  return Math.random() * (100 - width);
}

// A cinematic full-screen minigame: the server started a 10-second search
// (searchEndsAt) after the Slasher cornered your hiding spot. A marker
// sweeps back and forth across a track; tap (or SPACE) exactly while it's
// inside the safe zone. The zone drifts, shrinks under stress, and the
// marker gets faster and less predictable as the window runs out and as
// your own Sanity drops. Mistakes cost Detection rather than instant
// failure — hit 100% and the Slasher hears you. The outcome is reported
// to the server as pass/fail, same contract as before; the server also
// has its own fallback timeout in case this never fires.
export default function HoldYourBreath({ searchEndsAt, searching, hiding, sanity, onResolved }) {
  const tier = sanityTier(sanity ?? 100);
  const totalMs = useRef(Math.max(1, (searchEndsAt ?? Date.now() + 10000) - (Date.now() - 1)));
  const [msLeft, setMsLeft] = useState(() => Math.max(0, (searchEndsAt ?? Date.now()) - Date.now()));
  const [detection, setDetection] = useState(0);
  const [position, setPosition] = useState(0);
  const [zone, setZone] = useState(() => {
    const width = TIER_ZONE_WIDTH[tier] ?? 22;
    return { start: randomZoneStart(width), width };
  });
  const [flash, setFlash] = useState(null); // "hit" | "miss" | null — brief tap feedback
  const [resolution, setResolution] = useState(null); // null | "passed" | "caught"

  const detectionRef = useRef(0);
  const positionRef = useRef(0);
  const directionRef = useRef(1);
  const zoneRef = useRef(zone);
  const lastTapRef = useRef(Date.now());
  const reportedRef = useRef(false);
  const resolvedRef = useRef(false);
  const speedMultRef = useRef(1);

  const resolve = useCallback((outcome) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setResolution(outcome);
    setTimeout(() => onResolved?.(), RESOLUTION_DISPLAY_MS);
  }, [onResolved]);

  const addDetection = useCallback((amount) => {
    detectionRef.current = Math.max(0, Math.min(DETECTION_MAX, detectionRef.current + amount));
    setDetection(detectionRef.current);
    if (detectionRef.current >= DETECTION_MAX && !reportedRef.current) {
      reportedRef.current = true;
      socket.emit("hold_breath_result", { success: false });
      resolve("caught");
    }
  }, [resolve]);

  const relocateZone = useCallback((elapsedFraction) => {
    const jitter = TIER_JITTER[tier] ?? 0;
    const stage = dangerStage(elapsedFraction);
    const shrink = stage.id === "outside" ? 0.8 : stage.id === "close" ? 0.9 : 1;
    const width = Math.max(5, (TIER_ZONE_WIDTH[tier] ?? 22) * shrink);
    const next = { start: randomZoneStart(width), width };
    zoneRef.current = next;
    setZone(next);
    speedMultRef.current = jitter > 0 ? 1 + (Math.random() * 2 - 1) * jitter : 1;
  }, [tier]);

  const tap = useCallback(() => {
    if (resolvedRef.current) return;
    lastTapRef.current = Date.now();
    const z = zoneRef.current;
    const pos = positionRef.current;
    const inZone = pos >= z.start && pos <= z.start + z.width;
    const nearZone = pos >= z.start - NEAR_MISS_MARGIN && pos <= z.start + z.width + NEAR_MISS_MARGIN;
    if (inZone) {
      setFlash("hit");
      detectionRef.current = Math.max(0, detectionRef.current - 4);
      setDetection(detectionRef.current);
      relocateZone((Date.now() - (searchEndsAt - totalMs.current)) / totalMs.current);
    } else {
      setFlash("miss");
      addDetection(nearZone ? MISS_MINOR : MISS_MAJOR);
    }
    setTimeout(() => setFlash(null), 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDetection, relocateZone, searchEndsAt]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        tap();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    const interval = setInterval(() => {
      if (resolvedRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, (searchEndsAt ?? now) - now);
      setMsLeft(remaining);
      const elapsedFraction = 1 - remaining / totalMs.current;
      const stage = dangerStage(elapsedFraction);

      // Sweep the indicator back and forth.
      const step = (stage.speed * speedMultRef.current * TICK_MS) / 1000;
      let next = positionRef.current + step * directionRef.current;
      if (next >= 100) {
        next = 100;
        directionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        directionRef.current = 1;
      }
      positionRef.current = next;
      setPosition(next);

      // Going too long without even trying reads as holding your breath
      // wrong — a real, if smaller, mistake, so silence never wins by default.
      if (now - lastTapRef.current > PASSIVE_WINDOW_MS) {
        lastTapRef.current = now;
        addDetection(MISS_MINOR);
      } else if (detectionRef.current > 0) {
        detectionRef.current = Math.max(0, detectionRef.current - (DECAY_PER_SEC * TICK_MS) / 1000);
        setDetection(detectionRef.current);
      }

      if (remaining <= 0 && !reportedRef.current) {
        reportedRef.current = true;
        socket.emit("hold_breath_result", { success: true });
        resolve("passed");
      }
    }, TICK_MS);

    // The zone drifts on its own too, not just after a hit, so standing
    // still and waiting for it to come to you isn't a safe strategy either.
    const driftInterval = setInterval(() => {
      if (resolvedRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, (searchEndsAt ?? now) - now);
      const elapsedFraction = 1 - remaining / totalMs.current;
      relocateZone(elapsedFraction);
    }, 2200);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearInterval(interval);
      clearInterval(driftInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchEndsAt]);

  // Authoritative fallback: if the server resolves the search before our
  // own local timer noticed (a backgrounded tab, lag, etc.), take the cue
  // from the live state instead of leaving the overlay stuck.
  useEffect(() => {
    if (searching === false && !resolvedRef.current) {
      resolve(hiding ? "passed" : "caught");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  const secondsLeft = Math.ceil(msLeft / 1000);
  const elapsedFraction = 1 - msLeft / totalMs.current;
  const stage = dangerStage(elapsedFraction);
  const critical = detection >= 70;
  const heartbeatSpeed = resolution ? 1.4 : stage.heartbeat;

  return (
    <div
      className={`hold-breath-cinema stage-${stage.id}${critical ? " critical" : ""}${resolution ? ` resolved ${resolution}` : ""}`}
      style={{ "--heartbeat-speed": `${heartbeatSpeed}s` }}
    >
      <div className="hold-breath-vignette" />
      {!resolution && (
        <div className="hold-breath-content">
          <div className="hold-breath-title">{stage.label}</div>
          <div className="hold-breath-title-sub">HOLD YOUR BREATH</div>
          <div className="hold-breath-sub">Tap exactly when the marker crosses the safe zone — {secondsLeft}s…</div>

          <div className={`breath-track${flash ? ` flash-${flash}` : ""}`}>
            <div className="breath-track-zone" style={{ left: `${zone.start}%`, width: `${zone.width}%` }} />
            <div className="breath-track-marker" style={{ left: `${position}%` }} />
          </div>

          <div className="detection-meter-label">
            DETECTION
            <div className="detection-meter-track">
              <div className={`detection-meter-fill${critical ? " critical" : ""}`} style={{ width: `${detection}%` }} />
            </div>
          </div>

          <button type="button" className="btn btn-danger breath-button" onPointerDown={tap}>
            Hold Your Breath
          </button>
        </div>
      )}
      {resolution === "passed" && (
        <div className="hold-breath-content resolution-content">
          <div className="hold-breath-resolution passed">UNDETECTED</div>
          <div className="hold-breath-sub">The Killer didn't find you.</div>
        </div>
      )}
      {resolution === "caught" && (
        <div className="hold-breath-content resolution-content">
          <div className="hold-breath-resolution caught">YOU MADE TOO MUCH NOISE</div>
          <div className="hold-breath-sub">FOUND.</div>
        </div>
      )}
    </div>
  );
}
