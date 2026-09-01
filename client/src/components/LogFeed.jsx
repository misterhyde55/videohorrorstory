import { useEffect, useRef } from "react";

export default function LogFeed({ log }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  return (
    <div className="log-feed">
      {log.map((entry, i) => (
        <p key={entry.t + "-" + i}>{entry.message}</p>
      ))}
      <div ref={endRef} />
    </div>
  );
}
