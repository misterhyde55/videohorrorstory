// Contextual, one-line coaching for a practice match — computed fresh from
// live state each render so it always reflects what's actually happening,
// rather than a scripted sequence that could drift out of sync with play.
function computeTip(state, me) {
  if (me.role === "slasher") {
    const teensHere = state.players.filter(
      (p) => p.role === "teen" && p.location === me.location && p.status === "alive"
    );
    if (teensHere.some((t) => t.hiding)) {
      return "🔪 A teen is hiding here — Attack to start searching for them.";
    }
    if (teensHere.length > 0) {
      return "🔪 A teen is right here — Attack!";
    }
    if (state.slasherFrozen) {
      return "🕐 You're still getting your bearings — you can't move for a couple of turns. Lurk and wait.";
    }
    if (me.specialCooldown === 0) {
      return "⚡ Your special ability is ready — try it on a teen elsewhere on the map.";
    }
    if (state.objectives?.carRepaired) {
      const exitLoc = Object.values(state.board || {}).find((l) => l.carSite);
      return `🔧 The car's fixed — Sabotage it at ${exitLoc?.name || "the exit"} to set them back.`;
    }
    return "🚶 Move toward the nearest teen, or Lurk here to build a stalking bonus.";
  }

  if (me.searching) return "🎬 It found your hiding spot! Mash SPACE to hold your breath.";
  if (state.slasherPresent) return "😱 The killer is right here — fight, flee, or hope you're hidden.";
  if (me.hiding) return "🤫 You're hidden and holding still. Staying put helps you stay hidden.";
  if (state.slasherNearby) return "👀 The killer is close by. Consider hiding or moving away.";
  if (me.broken) return "💀 You're Broken — recovery is slow. Drink something or get Comforted.";
  if (me.sanity <= 5) return "🧠 Sanity's dropping. Find an Energy Drink or stick with teammates.";
  if (me.hp < me.hpMax) return "❤️ You're hurt — a First Aid Kit can patch you up.";
  if (!me.items || me.items.length === 0) return "🔦 Try Search Area to find useful supplies.";
  if (state.objectives?.carRepaired) return "🚗 The car's fixed — grab the Car Keys, then Drive Away!";
  return "🚶 Explore the park — move to a new location or search where you are.";
}

export default function PracticeTip({ state, me }) {
  if (!state.practice || !me) return null;
  return (
    <div className="practice-banner">
      <span className="practice-badge">🎓 Practice Match</span>
      <span className="practice-tip">{computeTip(state, me)}</span>
    </div>
  );
}
