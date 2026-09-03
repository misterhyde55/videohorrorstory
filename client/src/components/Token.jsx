// Physical board-game piece tokens: a silhouette icon inside a distressed
// circular frame, replacing emoji markers. Each teen gets a distinct
// border pattern (not just a color) so pieces stay tellable apart without
// relying on color alone.

const TEEN_ICONS = {
  leader(color) {
    return (
      <g stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="10" r="4.4" />
        <path d="M8 27 Q8 17 16 17 Q24 17 24 27" />
        <path d="M10 12 L16 6 L22 12" fill={color} stroke="none" opacity="0.9" />
      </g>
    );
  },
  athlete(color) {
    return (
      <g stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="9" r="4" />
        <path d="M16 13 L16 21 M16 16 L9 12 M16 16 L23 12 M16 21 L10 28 M16 21 L22 28" />
      </g>
    );
  },
  nerd(color) {
    return (
      <g stroke={color} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="10" r="4.4" />
        <circle cx="11.5" cy="17" r="3.4" />
        <circle cx="20.5" cy="17" r="3.4" />
        <line x1="14.9" y1="17" x2="17.1" y2="17" />
        <path d="M9 27 Q9 20 16 20 Q23 20 23 27" />
      </g>
    );
  },
  rebel(color) {
    return (
      <g stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="10" r="4.4" />
        <path d="M8 27 Q8 17 16 17 Q24 17 24 27" />
        <path d="M9 8 L16 12 L23 8" />
      </g>
    );
  },
};

const BORDER_PATTERNS = {
  leader: "none",
  athlete: "6 3",
  nerd: "2 2",
  rebel: "1 4",
};

function KillerIcon({ big }) {
  return (
    <g fill="none" stroke="#e8dcc0" strokeWidth={big ? 2.4 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 22 L11 10 L16 4 L21 10 L23 22 Z" fill="#0c0a0c" />
      <line x1="13" y1="14" x2="15" y2="20" stroke="#c23b3b" />
      <line x1="19" y1="14" x2="17" y2="20" stroke="#c23b3b" />
    </g>
  );
}

export default function Token({ kind, pickId, isMe, hiding, dead, size = 30 }) {
  const isKiller = kind === "slasher";
  const color = isMe ? "#e8dcc0" : "#c9b98a";
  const dash = !isKiller ? BORDER_PATTERNS[pickId] || "none" : "none";
  const frameSize = isKiller ? size * 1.2 : size;

  return (
    <svg
      className={`token-svg${isMe ? " token-svg-me" : ""}${dead ? " token-svg-dead" : ""}${hiding ? " token-svg-hiding" : ""}${isKiller ? " token-svg-killer" : ""}`}
      width={frameSize}
      height={frameSize}
      viewBox="0 0 32 32"
    >
      <circle cx="16" cy="16" r="14.5" fill={isKiller ? "#1a1014" : "#241a12"} stroke={isKiller ? "#c23b3b" : color} strokeWidth={isKiller ? 2 : 1.6} />
      {!isKiller && dash !== "none" && (
        <circle cx="16" cy="16" r="12.2" fill="none" stroke={color} strokeWidth="1" strokeDasharray={dash} opacity="0.6" />
      )}
      {isKiller ? <KillerIcon big /> : (TEEN_ICONS[pickId] || TEEN_ICONS.leader)(color)}
      {dead && <line x1="5" y1="27" x2="27" y2="5" stroke="#c23b3b" strokeWidth="2" />}
      {isMe && !isKiller && <circle cx="16" cy="16" r="14.5" fill="none" stroke="#7fae5a" strokeWidth="1.6" strokeDasharray="3 2" />}
    </svg>
  );
}
