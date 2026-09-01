// Crescent Lake Camp — the board for VHS: Video Horror Story.
// Locations form an undirected graph. `search` lists the item/event pools
// available when a teen searches there. `ritualSite` marks where the
// banishing ritual must be performed. `exit` marks where teens can drive away.

export const LOCATIONS = {
  entrance_road: {
    id: "entrance_road",
    name: "Entrance Road",
    description: "The dirt road out of camp. Freedom, if the car will start.",
    connections: ["parking_lot", "woods_north"],
    exit: true,
  },
  parking_lot: {
    id: "parking_lot",
    name: "Parking Lot",
    description: "A battered station wagon sits here, out of gas.",
    connections: ["entrance_road", "main_lodge", "woods_south"],
    searchPool: "light",
  },
  main_lodge: {
    id: "main_lodge",
    name: "Main Lodge",
    description: "The counselors' lodge. Someone left the lights on.",
    connections: ["parking_lot", "mess_hall", "cabin_row_a"],
    searchPool: "medium",
  },
  mess_hall: {
    id: "mess_hall",
    name: "Mess Hall",
    description: "Rows of long tables. A knife block sits by the kitchen.",
    connections: ["main_lodge", "boat_house", "cabin_row_b"],
    searchPool: "medium",
  },
  cabin_row_a: {
    id: "cabin_row_a",
    name: "Cabin Row A",
    description: "Bunks and graffiti from summers past.",
    connections: ["main_lodge", "cabin_row_b", "watchtower"],
    searchPool: "light",
  },
  cabin_row_b: {
    id: "cabin_row_b",
    name: "Cabin Row B",
    description: "The last cabin's door hangs off its hinges.",
    connections: ["mess_hall", "cabin_row_a", "old_barn"],
    searchPool: "light",
  },
  boat_house: {
    id: "boat_house",
    name: "Boat House",
    description: "The lake laps against rotted docks.",
    connections: ["mess_hall", "woods_south"],
    searchPool: "medium",
  },
  woods_south: {
    id: "woods_south",
    name: "South Trail",
    description: "A narrow trail swallowed by fog.",
    connections: ["parking_lot", "boat_house", "old_barn"],
    searchPool: "light",
  },
  woods_north: {
    id: "woods_north",
    name: "North Trail",
    description: "Trees close in on both sides. Something is watching.",
    connections: ["entrance_road", "watchtower", "old_barn"],
    searchPool: "light",
  },
  old_barn: {
    id: "old_barn",
    name: "Old Barn",
    description: "Rusted tools hang from the rafters.",
    connections: ["cabin_row_b", "woods_south", "woods_north", "root_cellar"],
    searchPool: "heavy",
  },
  watchtower: {
    id: "watchtower",
    name: "Watchtower",
    description: "A rickety tower overlooking the whole camp.",
    connections: ["cabin_row_a", "woods_north"],
    searchPool: "medium",
  },
  root_cellar: {
    id: "root_cellar",
    name: "Root Cellar",
    description: "Cold, dark, and reeking of something long dead. The ritual circle is carved into the floor.",
    connections: ["old_barn"],
    searchPool: "heavy",
    ritualSite: true,
  },
};

export const START_LOCATIONS = {
  teens: ["main_lodge", "mess_hall", "cabin_row_a", "cabin_row_b"],
  slasher: "root_cellar",
};

export function neighbors(locationId) {
  return LOCATIONS[locationId]?.connections ?? [];
}

export function isAdjacentOrSame(a, b) {
  return a === b || neighbors(a).includes(b);
}
