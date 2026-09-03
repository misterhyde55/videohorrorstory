import { useId } from "react";

// One illustrated silhouette per board location type, sharing a single
// visual language (dark ink silhouette, warm moonlit rim light, amber
// window glow, a soft ground shadow) so the whole board reads as one
// consistent hand-illustrated set instead of 19 unrelated icons. Pure
// vector/CSS — no external art assets.
//
// Each render fn draws inside a shared 0..100 (x) / 0..120 (y) canvas,
// baseline (ground line) fixed at y=104, so every landmark sits on the
// board at the same visual "footing" regardless of silhouette shape.

const INK = "#171019";
const RIM = "#c9b98a";
const WOOD = "#8a6a45";
const WOOD_DARK = "#5b4128";
const GLOW = "#ffb454";
const METAL = "#9aa3a0";
const WATER = "#3d6b74";

function Ground({ w = 34 }) {
  return <ellipse cx="50" cy="106" rx={w} ry="6" fill="#000" opacity="0.35" />;
}

function Window({ x, y, w = 4, h = 5, lit = true }) {
  return <rect x={x} y={y} width={w} height={h} fill={lit ? GLOW : "#2a2320"} opacity={lit ? 0.9 : 0.7} rx="0.5" />;
}

const RENDERERS = {
  // --- Pinehaven Campground ---
  tower(id) {
    return (
      <g>
        <Ground w={20} />
        <path d="M40 38 L44 96 L56 96 L60 38 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <line x1="42" y1="52" x2="58" y2="52" stroke={RIM} strokeWidth="0.8" />
        <line x1="42" y1="68" x2="58" y2="68" stroke={RIM} strokeWidth="0.8" />
        <line x1="42" y1="84" x2="58" y2="84" stroke={RIM} strokeWidth="0.8" />
        <line x1="41" y1="96" x2="59" y2="46" stroke={WOOD_DARK} strokeWidth="0.7" />
        <line x1="59" y1="96" x2="41" y2="46" stroke={WOOD_DARK} strokeWidth="0.7" />
        <ellipse cx="50" cy="30" rx="22" ry="12" fill={INK} stroke={RIM} strokeWidth="1.2" />
        <rect x="28" y="20" width="44" height="14" fill={INK} stroke={RIM} strokeWidth="1.2" />
        <path d="M28 20 Q50 8 72 20" fill="none" stroke={RIM} strokeWidth="1.2" />
        <rect x="47" y="12" width="3" height="8" fill={WOOD_DARK} />
      </g>
    );
  },
  cabin(id) {
    return (
      <g>
        <Ground w={26} />
        <rect x="26" y="62" width="48" height="38" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M22 62 L50 38 L78 62 Z" fill={WOOD_DARK} stroke={RIM} strokeWidth="1" />
        <rect x="45" y="80" width="10" height="20" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
        <Window x={31} y={70} lit />
        <Window x={64} y={70} lit={false} />
        <line x1="26" y1="74" x2="74" y2="74" stroke={WOOD} strokeWidth="0.6" opacity="0.6" />
      </g>
    );
  },
  store(id) {
    return (
      <g>
        <Ground w={30} />
        <rect x="20" y="58" width="60" height="42" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="18" y="50" width="64" height="10" fill={WOOD_DARK} stroke={RIM} strokeWidth="1" />
        <rect x="18" y="50" width="64" height="3" fill={GLOW} opacity="0.5" />
        <Window x={26} y={70} w={10} h={12} lit />
        <Window x={64} y={70} w={10} h={12} lit />
        <rect x="45" y="82" width="10" height="18" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
      </g>
    );
  },
  diner(id) {
    return (
      <g>
        <Ground w={32} />
        <rect x="16" y="64" width="68" height="36" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="16" y="58" width="68" height="8" fill={WOOD_DARK} />
        <rect x="30" y="42" width="20" height="16" fill={INK} stroke="#c23b3b" strokeWidth="1.4" />
        <text x="40" y="53" fontSize="7" fill="#c23b3b" textAnchor="middle" fontFamily="monospace" opacity="0.9">DINER</text>
        <Window x={22} y={72} w={14} h={14} lit />
        <Window x={44} y={72} w={14} h={14} lit />
        <Window x={66} y={72} w={12} h={14} lit={false} />
      </g>
    );
  },
  lot(id) {
    return (
      <g>
        <Ground w={32} />
        <rect x="18" y="46" width="64" height="8" fill={WOOD_DARK} stroke={RIM} strokeWidth="1" />
        <line x1="26" y1="54" x2="20" y2="90" stroke={WOOD_DARK} strokeWidth="2.2" />
        <line x1="74" y1="54" x2="80" y2="90" stroke={WOOD_DARK} strokeWidth="2.2" />
        <rect x="42" y="60" width="16" height="30" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="46" y="52" width="8" height="10" fill={METAL} stroke={RIM} strokeWidth="0.6" />
        <circle cx="50" cy="58" r="1.6" fill={GLOW} />
        <rect x="20" y="92" width="26" height="8" fill={INK} stroke={RIM} strokeWidth="0.8" />
        <circle cx="26" cy="100" r="3" fill="#0c0a0c" stroke={METAL} strokeWidth="0.8" />
        <circle cx="40" cy="100" r="3" fill="#0c0a0c" stroke={METAL} strokeWidth="0.8" />
      </g>
    );
  },
  police(id) {
    return (
      <g>
        <Ground w={32} />
        <rect x="20" y="56" width="60" height="44" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="18" y="50" width="64" height="8" fill={WOOD_DARK} />
        <rect x="30" y="64" width="12" height="14" fill="#0c0a0c" stroke="#c23b3b" strokeWidth="0.7" />
        <line x1="33" y1="64" x2="33" y2="78" stroke="#c23b3b" strokeWidth="0.6" />
        <line x1="36" y1="64" x2="36" y2="78" stroke="#c23b3b" strokeWidth="0.6" />
        <line x1="39" y1="64" x2="39" y2="78" stroke="#c23b3b" strokeWidth="0.6" />
        <Window x={58} y={64} w={14} h={14} lit={false} />
        <rect x="45" y="84" width="10" height="16" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
        <rect x="14" y="96" width="22" height="8" rx="2" fill="#2a2a30" stroke={RIM} strokeWidth="0.7" />
        <circle cx="19" cy="105" r="2.4" fill="#0c0a0c" />
        <circle cx="31" cy="105" r="2.4" fill="#0c0a0c" />
        <rect x="16" y="93" width="4" height="3" fill="#c23b3b" opacity="0.9" />
        <rect x="21" y="93" width="4" height="3" fill="#3d6bd8" opacity="0.9" />
      </g>
    );
  },
  water(id) {
    return (
      <g>
        <ellipse cx="50" cy="98" rx="42" ry="10" fill={WATER} opacity="0.55" />
        <ellipse cx="50" cy="98" rx="42" ry="10" fill="none" stroke="#8fd6e0" strokeOpacity="0.25" strokeWidth="0.6" />
        <line x1="18" y1="70" x2="18" y2="96" stroke={WOOD_DARK} strokeWidth="2" />
        <line x1="34" y1="66" x2="34" y2="96" stroke={WOOD_DARK} strokeWidth="2" />
        <line x1="50" y1="64" x2="50" y2="96" stroke={WOOD_DARK} strokeWidth="2" />
        <path d="M14 70 L54 62 L54 66 L14 74 Z" fill={WOOD} stroke={RIM} strokeWidth="0.6" />
        <path d="M56 86 q10 -8 22 -2 l0 6 q-12 -4 -22 2 Z" fill={INK} stroke={RIM} strokeWidth="0.8" />
      </g>
    );
  },
  trail(id) {
    return (
      <g>
        <Ground w={30} />
        <ellipse cx="26" cy="70" rx="10" ry="26" fill={INK} />
        <ellipse cx="74" cy="66" rx="11" ry="30" fill={INK} />
        <ellipse cx="50" cy="76" rx="9" ry="22" fill="#100c14" />
        <path d="M50 100 Q54 84 50 66" fill="none" stroke={WOOD_DARK} strokeWidth="1.6" strokeDasharray="3 3" />
        <circle cx="26" cy="52" r="2" fill="#cfe3c8" opacity="0.5" />
        <circle cx="70" cy="48" r="1.4" fill="#cfe3c8" opacity="0.4" />
      </g>
    );
  },
  road(id) {
    return (
      <g>
        <Ground w={30} />
        <path d="M30 100 L38 44 L62 44 L70 100 Z" fill="none" stroke={WOOD_DARK} strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
        <rect x="20" y="40" width="8" height="30" fill={WOOD_DARK} stroke={RIM} strokeWidth="0.8" />
        <rect x="72" y="40" width="8" height="30" fill={WOOD_DARK} stroke={RIM} strokeWidth="0.8" />
        <rect x="14" y="36" width="72" height="6" fill={INK} stroke={RIM} strokeWidth="1" />
        <text x="50" y="41" fontSize="5" fill={RIM} textAnchor="middle" fontFamily="monospace">PINEHAVEN</text>
      </g>
    );
  },
  campfire(id) {
    return (
      <g>
        <Ground w={26} />
        <ellipse cx="50" cy="98" rx="20" ry="5" fill={WOOD_DARK} opacity="0.6" />
        <path d="M32 96 L50 88 L68 96" fill="none" stroke={WOOD_DARK} strokeWidth="3" />
        <path d="M40 96 L50 84 L60 96" fill="none" stroke={WOOD} strokeWidth="3" />
        <path d="M50 92 C46 84 44 78 50 68 C56 78 54 84 50 92 Z" fill="#e8853a" />
        <path d="M50 88 C48 82 47 78 50 72 C53 78 52 82 50 88 Z" fill="#ffd35c" />
        {[...Array(6)].map((_, i) => (
          <circle key={i} cx={44 + i * 2.4} cy={40 + (i % 3) * 6} r="0.7" fill="#ffb454" opacity={0.5 - i * 0.05} />
        ))}
      </g>
    );
  },
  // --- Abandoned Wonderland ---
  mainstreet(id) {
    return (
      <g>
        <Ground w={32} />
        <rect x="22" y="46" width="56" height="8" fill={WOOD_DARK} stroke={RIM} strokeWidth="1" />
        <path d="M34 46 L34 30 A16 16 0 0 1 66 30 L66 46 Z" fill="none" stroke={RIM} strokeWidth="1.4" />
        <rect x="30" y="54" width="16" height="20" fill={INK} stroke={RIM} strokeWidth="0.8" />
        <rect x="54" y="54" width="16" height="20" fill={INK} stroke={RIM} strokeWidth="0.8" />
        <rect x="45" y="74" width="10" height="26" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
        <circle cx="34" cy="62" r="1.4" fill={GLOW} />
        <circle cx="66" cy="62" r="1.4" fill={GLOW} />
      </g>
    );
  },
  castle(id) {
    return (
      <g>
        <Ground w={30} />
        <rect x="26" y="56" width="48" height="44" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="22" y="34" width="12" height="26" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="66" y="34" width="12" height="26" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M22 34 L28 24 L34 34 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M66 34 L72 24 L78 34 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="42" y="30" width="16" height="30" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M42 30 L50 16 L58 30 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M50 16 L50 10" stroke={RIM} strokeWidth="1" />
        <rect x="47" y="8" width="6" height="3" fill="#c23b3b" opacity="0.85" />
        <Window x={46} y={40} w={8} h={10} lit />
        <rect x="44" y="86" width="12" height="14" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
      </g>
    );
  },
  carnival(id) {
    return (
      <g>
        <Ground w={30} />
        <path d="M30 70 L50 36 L70 70 Z" fill={INK} stroke="#c23b3b" strokeWidth="1.2" />
        <path d="M38 70 L50 46 L62 70 Z" fill="none" stroke={RIM} strokeWidth="0.7" />
        <line x1="50" y1="36" x2="50" y2="26" stroke={WOOD_DARK} strokeWidth="1" />
        <path d="M46 26 L54 26 L50 18 Z" fill="#c23b3b" opacity="0.85" />
        <rect x="30" y="70" width="40" height="24" fill="#100c14" stroke={RIM} strokeWidth="1" />
        <circle cx="38" cy="82" r="2" fill={GLOW} opacity="0.8" />
        <circle cx="50" cy="82" r="2" fill={GLOW} opacity="0.6" />
        <circle cx="62" cy="82" r="2" fill={GLOW} opacity="0.8" />
      </g>
    );
  },
  coaster(id) {
    return (
      <g>
        <Ground w={32} />
        <path d="M18 100 L34 44 L46 100" fill="none" stroke={WOOD_DARK} strokeWidth="2" />
        <path d="M22 100 L34 56 L44 100" fill="none" stroke={WOOD_DARK} strokeWidth="2" />
        <path d="M46 100 L62 60 L82 100" fill="none" stroke={WOOD_DARK} strokeWidth="2" />
        <path d="M14 96 Q34 40 50 70 T86 96" fill="none" stroke={METAL} strokeWidth="1.6" />
        <circle cx="34" cy="44" r="2" fill="#c23b3b" opacity="0.8" />
      </g>
    );
  },
  mountain(id) {
    return (
      <g>
        <Ground w={34} />
        <path d="M12 100 L38 46 L52 68 L64 40 L90 100 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <path d="M38 46 L44 56 L34 58 Z" fill="#cfd8c9" opacity="0.85" />
        <path d="M64 40 L69 50 L59 52 Z" fill="#cfd8c9" opacity="0.85" />
        <path d="M20 90 Q50 78 80 92" fill="none" stroke="#2a2a30" strokeWidth="1" opacity="0.6" />
      </g>
    );
  },
  pirate(id) {
    return (
      <g>
        <ellipse cx="50" cy="98" rx="42" ry="10" fill={WATER} opacity="0.55" />
        <path d="M22 92 L30 66 L74 66 L82 92 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <line x1="50" y1="66" x2="50" y2="30" stroke={WOOD_DARK} strokeWidth="1.4" />
        <path d="M50 34 L74 46 L50 52 Z" fill="#3a2f26" stroke={RIM} strokeWidth="0.7" opacity="0.85" />
        <circle cx="35" cy="79" r="2.2" fill="#0c0a0c" />
        <circle cx="50" cy="79" r="2.2" fill="#0c0a0c" />
        <circle cx="65" cy="79" r="2.2" fill="#0c0a0c" />
      </g>
    );
  },
  boats(id) {
    return (
      <g>
        <ellipse cx="50" cy="98" rx="42" ry="10" fill={WATER} opacity="0.6" />
        <path d="M32 90 Q50 100 68 90 L64 78 L36 78 Z" fill={INK} stroke={RIM} strokeWidth="1" />
        <line x1="50" y1="78" x2="50" y2="56" stroke={WOOD_DARK} strokeWidth="1" />
        <path d="M50 58 L64 70 L50 70 Z" fill="#3a2f26" opacity="0.85" />
        <path d="M10 96 Q50 88 90 96" fill="none" stroke="#8fd6e0" strokeOpacity="0.25" strokeWidth="0.8" />
      </g>
    );
  },
  swamp(id) {
    return (
      <g>
        <ellipse cx="50" cy="98" rx="42" ry="10" fill="#2f3d2a" opacity="0.7" />
        <path d="M28 98 C24 78 34 66 30 50" fill="none" stroke={WOOD_DARK} strokeWidth="2.4" />
        <path d="M30 62 L20 54 M30 70 L40 62" stroke={WOOD_DARK} strokeWidth="1.6" />
        <path d="M68 98 C74 80 62 70 66 52" fill="none" stroke={WOOD_DARK} strokeWidth="2.4" />
        <path d="M66 64 L76 58 M66 72 L58 66" stroke={WOOD_DARK} strokeWidth="1.6" />
        <ellipse cx="50" cy="96" rx="10" ry="3" fill="#4a5a3a" opacity="0.8" />
      </g>
    );
  },
  arcade(id) {
    return (
      <g>
        <Ground w={30} />
        <rect x="24" y="52" width="52" height="48" fill={INK} stroke={RIM} strokeWidth="1" />
        <rect x="22" y="46" width="56" height="8" fill="#c23b3b" opacity="0.75" />
        <rect x="32" y="62" width="12" height="16" fill="#100c14" stroke={GLOW} strokeWidth="0.6" />
        <rect x="56" y="62" width="12" height="16" fill="#100c14" stroke={GLOW} strokeWidth="0.6" opacity="0.6" />
        <circle cx="38" cy="70" r="1.2" fill={GLOW} />
        <circle cx="62" cy="70" r="1" fill={GLOW} opacity="0.5" />
      </g>
    );
  },
  funhouse(id) {
    return (
      <g>
        <Ground w={32} />
        <rect x="20" y="58" width="60" height="42" fill={INK} stroke="#c23b3b" strokeWidth="1.2" />
        <circle cx="50" cy="42" r="18" fill={INK} stroke="#c23b3b" strokeWidth="1.4" />
        <path d="M40 38 Q50 30 60 38" fill="none" stroke="#c23b3b" strokeWidth="1.6" />
        <circle cx="43" cy="42" r="2.2" fill="#c23b3b" opacity="0.9" />
        <circle cx="57" cy="42" r="2.2" fill="#c23b3b" opacity="0.9" />
        <path d="M42 50 Q50 56 58 50" fill="none" stroke="#c23b3b" strokeWidth="1.6" />
        <rect x="42" y="82" width="16" height="18" fill="#0c0a0c" stroke={WOOD} strokeWidth="0.8" />
        <path d="M20 58 L28 100 M80 58 L72 100" stroke="#c23b3b" strokeWidth="0.6" opacity="0.5" strokeDasharray="2 3" />
      </g>
    );
  },
};

export default function Landmark({ type, dangerLevel = "low", size = 64, hazard = false }) {
  const id = useId();
  const render = RENDERERS[type] || RENDERERS.cabin;
  const dangerColor =
    dangerLevel === "very-high" ? "#c23b3b" :
    dangerLevel === "high" ? "#c2703b" :
    dangerLevel === "medium" ? "#c2a53b" : "#5f8a52";

  return (
    <svg
      className={`landmark-svg landmark-${type}${hazard ? " landmark-hazard" : ""}`}
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 120"
      style={{ "--danger-color": dangerColor }}
    >
      {render(id)}
    </svg>
  );
}

export const LANDMARK_TYPES = Object.keys(RENDERERS);
