// Mirrors the server's 0-100 Sanity scale (server/src/gameState.js) — five
// states instead of the old three, so every place that reads a tier off a
// raw Sanity number agrees with the server's own thresholds.
export function sanityTier(sanity) {
  if (sanity <= 0) return "broken";
  if (sanity <= 25) return "panicked";
  if (sanity <= 50) return "frightened";
  if (sanity <= 75) return "uneasy";
  return "stable";
}

export const SANITY_TIER_LABEL = {
  stable: "Stable",
  uneasy: "Uneasy",
  frightened: "Frightened",
  panicked: "Panicked",
  broken: "Broken",
};

export const BROKEN_RECOVER_SANITY = 30;
