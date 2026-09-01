// Procedural camp map for VHS: Video Horror Story. Every match generates a
// fresh board: a random subset of locations, a randomized non-overlapping
// layout, and a connection graph built from spatial proximity (so nodes that
// look close on the map are actually connected). Three roles are always
// present exactly once: the exit (drive away here), the ritual site (banish
// here — also where the Slasher starts), and the car site (repair the car
// here). Teen starting spots are chosen to be as far from the Slasher's
// start as possible, so the game never begins with the killer on top of them.

const EXIT_TEMPLATES = [
  { name: "Entrance Road", description: "The dirt road out of camp. Freedom, if the car will start.", type: "road" },
  { name: "Highway Turnoff", description: "Where the camp road meets the county highway.", type: "road" },
  { name: "Old Service Road", description: "A rutted track leading away from the grounds.", type: "road" },
];

const RITUAL_TEMPLATES = [
  { name: "Root Cellar", description: "Cold, dark, and reeking of something long dead. The ritual circle is carved into the floor.", type: "cellar" },
  { name: "Old Well", description: "A dry well behind the property. Something ancient waits at the bottom.", type: "cellar" },
  { name: "Church Crypt", description: "Beneath the burned-out chapel. The dead don't rest quietly here.", type: "cellar" },
];

const CAR_SITE_TEMPLATE = { name: "Parking Lot", description: "A battered station wagon sits here, out of gas.", type: "lot", searchPool: "light" };

const GENERAL_TEMPLATES = [
  { name: "Main Lodge", description: "The counselors' lodge. Someone left the lights on.", type: "lodge", searchPool: "medium" },
  { name: "Mess Hall", description: "Rows of long tables. A knife block sits by the kitchen.", type: "hall", searchPool: "medium" },
  { name: "Cabin Row A", description: "Bunks and graffiti from summers past.", type: "cabin", searchPool: "light" },
  { name: "Cabin Row B", description: "The last cabin's door hangs off its hinges.", type: "cabin", searchPool: "light" },
  { name: "Boat House", description: "The lake laps against rotted docks.", type: "water", searchPool: "medium" },
  { name: "North Trail", description: "Trees close in on both sides. Something is watching.", type: "trail", searchPool: "light" },
  { name: "South Trail", description: "A narrow trail swallowed by fog.", type: "trail", searchPool: "light" },
  { name: "Old Barn", description: "Rusted tools hang from the rafters.", type: "barn", searchPool: "heavy" },
  { name: "Watchtower", description: "A rickety tower overlooking the whole camp.", type: "tower", searchPool: "medium" },
  { name: "Gas Station", description: "A single rusted pump out front. The bell over the door doesn't ring anymore.", type: "lot", searchPool: "medium" },
  { name: "Video Store", description: "Rows of tapes nobody's returned in years.", type: "store", searchPool: "medium" },
  { name: "Old Movie Theater", description: "The marquee still flickers, half-lit.", type: "theater", searchPool: "heavy" },
  { name: "High School Gym", description: "Bleachers gather dust under a busted scoreboard.", type: "school", searchPool: "medium" },
  { name: "Diner", description: "Cold coffee still sits on the counter.", type: "store", searchPool: "light" },
  { name: "Garage", description: "Tools hang on pegboards, half in shadow.", type: "barn", searchPool: "heavy" },
  { name: "Cemetery", description: "Headstones lean at odd angles in the fog.", type: "graveyard", searchPool: "light" },
  { name: "Church", description: "Pews are overturned. The doors won't lock.", type: "church", searchPool: "medium" },
];

const GENERAL_COUNT = 12;
const GRID_COLS = 6;
const GRID_ROWS = 5;
const MAP_MARGIN = 8;
const MAX_DEGREE = 4;
const EXTRA_EDGE_CHANCE = 0.35;

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
  const usedIds = new Set();
  const exitTemplate = shuffle(EXIT_TEMPLATES, rng)[0];
  const ritualTemplate = shuffle(RITUAL_TEMPLATES, rng)[0];
  const chosenGeneral = shuffle(GENERAL_TEMPLATES, rng).slice(0, GENERAL_COUNT);

  const nodeDefs = [
    { ...exitTemplate, id: slugify(exitTemplate.name, usedIds), exit: true },
    { ...ritualTemplate, id: slugify(ritualTemplate.name, usedIds), ritualSite: true },
    { ...CAR_SITE_TEMPLATE, id: slugify(CAR_SITE_TEMPLATE.name, usedIds), carSite: true },
    ...chosenGeneral.map((t) => ({ ...t, id: slugify(t.name, usedIds) })),
  ];
  const ids = nodeDefs.map((n) => n.id);

  // --- Layout: shuffle grid cells, drop each node in one with a little jitter ---
  const cellW = (100 - MAP_MARGIN * 2) / GRID_COLS;
  const cellH = (100 - MAP_MARGIN * 2) / GRID_ROWS;
  const cells = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({ x: MAP_MARGIN + cellW * (c + 0.5), y: MAP_MARGIN + cellH * (r + 0.5) });
    }
  }
  const chosenCells = shuffle(cells, rng).slice(0, nodeDefs.length);
  const layout = {};
  nodeDefs.forEach((n, i) => {
    const cell = chosenCells[i];
    const jitterX = (rng() - 0.5) * cellW * 0.18;
    const jitterY = (rng() - 0.5) * cellH * 0.18;
    layout[n.id] = {
      x: cell.x + jitterX,
      y: cell.y + jitterY,
    };
  });

  // Relax any pair that still ended up too close together (map-node boxes
  // are physically wider than a single grid cell is tall) by nudging them
  // apart along their connecting line, a few passes, clamped to the map.
  const MIN_DIST = Math.min(cellW, cellH) * 0.82;
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

  // --- Connections: nearest-neighbor graph, guarantee connectivity, add a few extra edges ---
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

  ids.forEach((id) => {
    const nearest = ids.filter((o) => o !== id).sort((a, b) => dist(id, a) - dist(id, b));
    connect(id, nearest[0]);
    connect(id, nearest[1]);
  });

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
      ...(n.exit ? { exit: true } : {}),
      ...(n.ritualSite ? { ritualSite: true } : {}),
      ...(n.carSite ? { carSite: true } : {}),
    };
  });

  // --- Starting spots: Slasher at the ritual site; teens as far away as possible ---
  const slasherStart = nodeDefs.find((n) => n.ritualSite).id;
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
    locations,
    layout,
    startLocations: { teens: teenStarts, slasher: slasherStart },
  };
}
