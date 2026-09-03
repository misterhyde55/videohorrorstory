import { useEffect, useRef } from "react";

export default function LogFeed({ log }) {
  const containerRef = useRef(null);
  useEffect(() => {
    // Scroll only this feed's own box to its latest entry — scrollIntoView
    // would walk up and scroll the whole sidebar instead whenever the feed
    // itself isn't the overflowing element, hiding the player card above it.
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div className="log-feed" ref={containerRef}>
      {log.map((entry, i) => (
        <p key={entry.t + "-" + i}>
          {entry.round != null && <span className="log-round">R{entry.round}</span>}
          {entry.message}
        </p>
      ))}
    </div>
  );
}
