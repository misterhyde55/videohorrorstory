// A stylized, flat-silhouette recreation of the classic "kids watching a
// haunted TV" horror poster composition — not photorealistic art (no image
// generation available here), just enough mood via shapes and gradients.
export default function HeroScene() {
  return (
    <svg className="hero-scene" viewBox="0 0 200 130" preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id="screenGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fdf6ff" />
          <stop offset="35%" stopColor="#c9a6ff" />
          <stop offset="70%" stopColor="#5a2e8f" />
          <stop offset="100%" stopColor="#1a0d26" />
        </radialGradient>
        <radialGradient id="roomVignette" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#241238" stopOpacity="0" />
          <stop offset="100%" stopColor="#08040f" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08040f" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="200" height="130" fill="#120821" />

      {/* stars */}
      {[[10,8],[28,14],[50,6],[75,10],[95,5],[120,12],[150,8],[175,15],[190,6]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="0.5" fill="#ffffff" opacity="0.5" />
      ))}

      {/* TV console + glowing screen */}
      <rect x="82" y="40" width="52" height="38" rx="3" fill="#1c1420" stroke="#3a2450" strokeWidth="1" />
      <rect x="87" y="44" width="42" height="27" rx="1.5" fill="url(#screenGlow)" className="hero-static" />
      <rect x="82" y="78" width="52" height="6" fill="#150d1c" />
      {[[88,80],[96,80],[104,80]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="3" height="2" fill="#0a0612" />
      ))}

      {/* killer silhouette rising from the screen */}
      <path
        d="M100 46 C93 40 92 26 100 18 C108 26 107 40 100 46 Z"
        fill="#0a0612"
      />
      <path
        d="M90 68 C88 50 92 40 100 40 C108 40 112 50 110 68 L112 78 L88 78 Z"
        fill="#0a0612"
      />
      <path d="M110 52 C118 50 124 44 126 36" stroke="#0a0612" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="95.5" cy="30" r="1.1" fill="#ff2e88" opacity="0.85" />
      <circle cx="104.5" cy="30" r="1.1" fill="#ff2e88" opacity="0.85" />

      {/* couch */}
      <rect x="20" y="98" width="160" height="20" rx="6" fill="#241226" />
      <rect x="20" y="92" width="160" height="12" rx="6" fill="#2c1730" />

      {/* kids watching, backs to viewer */}
      {[
        { x: 45, w: 16, h: 22 },
        { x: 78, w: 15, h: 20 },
        { x: 108, w: 16, h: 23 },
        { x: 140, w: 15, h: 19 },
      ].map((k, i) => (
        <g key={i}>
          <path
            d={`M${k.x} 100 q0 -${k.h} ${k.w / 2} -${k.h} q${k.w / 2} 0 ${k.w / 2} ${k.h} Z`}
            fill="#0a0612"
          />
          <circle cx={k.x + k.w / 2} cy={100 - k.h - 4} r="5" fill="#0a0612" />
        </g>
      ))}

      <rect x="0" y="0" width="200" height="130" fill="url(#roomVignette)" />
      <rect x="0" y="90" width="200" height="40" fill="url(#floorFade)" />
    </svg>
  );
}
