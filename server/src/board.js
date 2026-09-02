// Procedural maps for VHS: Video Horror Story. Every match randomly picks
// one of a fixed set of themed boards (currently the Abandoned Wonderland
// amusement park and the Pinehaven Campground) and reshuffles its layout
// and connections, but each theme's location set itself stays fixed so the
// board is always recognizable. Every theme has the same shape: a ritual
// site at the hub (also the Slasher's start), a marquee location pinned to
// the top of the ring, an exit that doubles as the car site at the south
// entrance, and the rest of its locations ringed around the hub. Teen
// starting spots are chosen by BFS distance to be as far from the Slasher's
// start as possible.

const THEMES = [
  {
    id: "wonderland",
    name: "Abandoned Wonderland",
    exit: {
      name: "Main Street",
      description: "The park's entrance strip, ticket booths dark and silent. A getaway car waits near the gate — freedom, if it'll start.",
      type: "mainstreet",
      searchPool: "light",
    },
    ritual: {
      name: "Twisted Castle",
      description: "The Hall of Mirrors distorts everything in here — including whatever's hunting you. This is where the ritual has to happen.",
      type: "castle",
    },
    marqueeName: "Killer's Carnival",
    // safe: true marks a Safe Location — teens can Rest there (see
    // gameState.js) as long as the Monster isn't in the room with them.
    general: [
      { name: "Killer's Carnival", description: "The park's main stage, ringed by dead carnival lights and a grinning marquee face.", type: "carnival", searchPool: "heavy" },
      { name: "Rusted Rails", description: "The Old Mine Coaster, seized up mid-climb. The cars haven't moved in years.", type: "coaster", searchPool: "medium", safe: true },
      { name: "Blackridge Pass", description: "The Mountain of Screams looms over a switchback trail cut into the rock.", type: "mountain", searchPool: "medium" },
      { name: "Lost Coaster", description: "Deadman's Loop, rusted upside down against the sky.", type: "coaster", searchPool: "heavy" },
      { name: "Skull Cove", description: "A pirate-wreck ride flooded and abandoned at the waterline.", type: "pirate", searchPool: "medium" },
      { name: "Spooky Shores", description: "The Haunted Boats dock sits still on black water.", type: "boats", searchPool: "light" },
      { name: "Midway Mayhem", description: "Carnival Ruins — collapsed game stalls and prize stuffing scattered in the dirt.", type: "carnival", searchPool: "light", safe: true },
      { name: "Swamp Run", description: "The Log Flume cuts through a stagnant, overgrown swamp.", type: "swamp", searchPool: "medium" },
      { name: "Deadland Arcade", description: "Broken Games — rows of dead cabinets, one screen still flickering static.", type: "arcade", searchPool: "light", safe: true },
      { name: "Funhouse of Fear", description: "Clown's Revenge. The mirrors move even when you don't.", type: "funhouse", searchPool: "heavy" },
    ],
  },
  {
    id: "campground",
    name: "Pinehaven Campground",
    exit: {
      name: "Camp Entrance",
      description: "The dirt road out of camp. A battered station wagon sits here, out of gas — freedom, if it'll start.",
      type: "road",
      searchPool: "light",
    },
    ritual: {
      name: "Pinehaven Campgrounds",
      description: "A ring of stumps around a dead campfire, right at the heart of camp. This is where the ritual has to happen.",
      type: "campfire",
    },
    marqueeName: "Old Water Tower",
    general: [
      { name: "Old Water Tower", description: "A rusted tower looming over the treeline. Someone's scratched marks into the ladder.", type: "tower", searchPool: "heavy" },
      { name: "Cabin 1", description: "Bunks and graffiti from summers past.", type: "cabin", searchPool: "light", safe: true },
      { name: "Cabin 2", description: "The last cabin's door hangs off its hinges.", type: "cabin", searchPool: "light" },
      { name: "General Store", description: "Shelves half-stocked and dust on everything.", type: "store", searchPool: "medium" },
      { name: "Gas Station", description: "A single rusted pump out front. The bell over the door doesn't ring anymore.", type: "lot", searchPool: "medium" },
      { name: "Pinehaven Diner", description: "Cold coffee still sits on the counter.", type: "store", searchPool: "light", safe: true },
      { name: "Abandoned Police Station", description: "The holding cell door is open. It shouldn't be.", type: "police", searchPool: "heavy" },
      { name: "Boat Dock", description: "The lake laps against rotted planks.", type: "water", searchPool: "medium" },
      { name: "Camp Counselor Cabin", description: "Someone left the lights on. Nobody's been back to turn them off.", type: "cabin", searchPool: "medium", safe: true },
      { name: "Forest Trail", description: "Trees close in on both sides. Something is watching.", type: "trail", searchPool: "light" },
    ],
  },
];

const MAP_MARGIN = 10;
const CENTER = { x: 50, y: 42 };
const RING_RADIUS_X = 34;
const RING_RADIUS_Y = 28;
const MAX_DEGREE = 4;
const EXTRA_EDGE_CHANCE = 0.3;
const HUB_SPOKES = 3; // ring nodes wired directly to the central ritual site

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slugify(name, usedIds) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  let id = base;
  let n = 2;
  while (usedIds.has(id)) id = `${base}_${n++}`;
  usedIds.add(id);
  return id;
}

function connectedComponents(ids, adjacency) {
  const seen = new Set();
  const comps = [];
  for (const start of ids) {
    if (seen.has(start)) continue;
    const comp = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const n of adjacency.get(cur)) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

export function generateBoard(rng = Math.random) {
  const theme = THEMES[Math.floor(rng() * THEMES.length)];
  const usedIds = new Set();
  const chosenGeneral = shuffle(theme.general, rng).slice(0, theme.general.length);

  const exitId = slugify(theme.exit.name, usedIds);
  const ritualId = slugify(theme.ritual.name, usedIds);
  const nodeDefs = [
    { ...theme.exit, id: exitId, exit: true, carSite: true },
    { ...theme.ritual, id: ritualId, ritualSite: true },
    ...chosenGeneral.map((t) => ({ ...t, id: slugify(t.name, usedIds) })),
  ];
  const ids = nodeDefs.map((n) => n.id);
  const ringIds = ids.filter((id) => id !== exitId && id !== ritualId);

  // --- Layout: the ritual site sits at the hub, the exit at the entrance
  // (south), and the rest of the map is ringed around the hub — jittered
  // each game so the wheel never looks quite the same. ---
  const layout = {};
  layout[ritualId] = { x: CENTER.x, y: CENTER.y };
  layout[exitId] = { x: CENTER.x, y: 90 };

  // The theme's marquee location is always at the top of the wheel, just
  // like the reference boards — everything else in the ring reshuffles
  // around it each game.
  const marqueeId = nodeDefs.find((n) => n.name === theme.marqueeName)?.id;
  const restRing = shuffle(ringIds.filter((id) => id !== marqueeId), rng);
  const orderedRing = marqueeId ? [marqueeId, ...restRing] : restRing;
  const angleStep = (2 * Math.PI) / orderedRing.length;
  orderedRing.forEach((id, i) => {
    // Start at the top and sweep around, leaving the south arc clearer for
    // the exit's approach.
    const angle = -Math.PI / 2 + i * angleStep + (rng() - 0.5) * angleStep * 0.3;
    const radiusJitter = 0.85 + rng() * 0.3;
    layout[id] = {
      x: CENTER.x + Math.cos(angle) * RING_RADIUS_X * radiusJitter,
      y: CENTER.y + Math.sin(angle) * RING_RADIUS_Y * radiusJitter,
    };
  });

  // Relax any pair that ended up too close together, a few passes, clamped
  // to the map bounds.
  const MIN_DIST = 16;
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = layout[ids[i]];
        const b = layout[ids[j]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d >= MIN_DIST) continue;
        moved = true;
        const push = (MIN_DIST - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    if (!moved) break;
  }
  ids.forEach((id) => {
    layout[id].x = Math.round(Math.min(100 - MAP_MARGIN * 0.4, Math.max(MAP_MARGIN * 0.4, layout[id].x)) * 10) / 10;
    layout[id].y = Math.round(Math.min(100 - MAP_MARGIN * 0.4, Math.max(MAP_MARGIN * 0.4, layout[id].y)) * 10) / 10;
  });

  // --- Connections: the outer ring links neighbor-to-neighbor (the
  // perimeter path), a few ring nodes spoke straight in to the hub, and the
  // exit connects directly to the hub plus its nearest ring neighbors —
  // then a couple of extra shortcuts get layered in for variety. ---
  function dist(a, b) {
    const dx = layout[a].x - layout[b].x;
    const dy = layout[a].y - layout[b].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  function connect(a, b) {
    if (a === b) return;
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }

  orderedRing.forEach((id, i) => {
    connect(id, orderedRing[(i + 1) % orderedRing.length]);
  });

  shuffle(orderedRing, rng).slice(0, HUB_SPOKES).forEach((id) => connect(ritualId, id));

  // A direct central path from the hub down to the exit — the main road
  // running straight through the map, like the reference boards.
  connect(ritualId, exitId);

  const nearestToExit = [...orderedRing].sort((a, b) => dist(exitId, a) - dist(exitId, b)).slice(0, 2);
  nearestToExit.forEach((id) => connect(exitId, id));

  let comps = connectedComponents(ids, adjacency);
  while (comps.length > 1) {
    let best = null;
    for (const a of comps[0]) {
      for (const b of comps[1]) {
        const d = dist(a, b);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    connect(best.a, best.b);
    comps = connectedComponents(ids, adjacency);
  }

  shuffle(ids, rng).forEach((id) => {
    if (adjacency.get(id).size >= MAX_DEGREE || rng() > EXTRA_EDGE_CHANCE) return;
    const candidate = ids
      .filter((o) => o !== id && !adjacency.get(id).has(o) && adjacency.get(o).size < MAX_DEGREE)
      .sort((a, b) => dist(id, a) - dist(id, b))[0];
    if (candidate) connect(id, candidate);
  });

  const locations = {};
  nodeDefs.forEach((n) => {
    locations[n.id] = {
      id: n.id,
      name: n.name,
      description: n.description,
      type: n.type,
      searchPool: n.searchPool,
      connections: [...adjacency.get(n.id)],
      safe: !!n.safe,
      ...(n.exit ? { exit: true } : {}),
      ...(n.ritualSite ? { ritualSite: true } : {}),
      ...(n.carSite ? { carSite: true } : {}),
    };
  });

  // --- Starting spots: Slasher at the ritual site; teens as far away as possible ---
  const slasherStart = ritualId;
  const bfsDist = new Map([[slasherStart, 0]]);
  const queue = [slasherStart];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of locations[cur].connections) {
      if (!bfsDist.has(n)) {
        bfsDist.set(n, bfsDist.get(cur) + 1);
        queue.push(n);
      }
    }
  }
  const byDistanceDesc = ids
    .filter((id) => id !== slasherStart)
    .sort((a, b) => (bfsDist.get(b) ?? 0) - (bfsDist.get(a) ?? 0));
  const teenStarts = byDistanceDesc.slice(0, 4);
  while (teenStarts.length < 4) teenStarts.push(byDistanceDesc[0] ?? slasherStart);

  return {
    mapId: theme.id,
    mapName: theme.name,
    locations,
    layout,
    startLocations: { teens: teenStarts, slasher: slasherStart },
  };
}
