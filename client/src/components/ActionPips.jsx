// A custom SVG "how many Action Points are left" readout — deliberately
// not an emoji or plain number alone, so it reads as a piece of game UI
// (like a resource track on a physical board) rather than a debug counter.
export default function ActionPips({ remaining, total }) {
  const slots = Math.max(total, remaining);
  return (
    <div className="action-pips" role="status" aria-label={`${remaining} of ${total} actions remaining`}>
      <span className="action-pips-label">Actions Remaining</span>
      <div className="action-pips-row">
        {Array.from({ length: slots }, (_, i) => {
          const filled = i < remaining;
          return (
            <svg key={i} className={`action-pip${filled ? " filled" : ""}`} viewBox="0 0 20 20" width="18" height="18">
              <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
