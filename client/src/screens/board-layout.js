// Percentage-based coordinates for the camp map. Purely presentational —
// legal moves always come from the server's `board` connection data.
// Kept spread out enough (~20+ units apart where nodes are near the same
// row) that the larger map-node boxes don't overlap.
export const LAYOUT = {
  entrance_road: { x: 9, y: 50 },
  parking_lot: { x: 30, y: 50 },
  woods_north: { x: 24, y: 12 },
  watchtower: { x: 48, y: 8 },
  main_lodge: { x: 48, y: 32 },
  cabin_row_a: { x: 48, y: 60 },
  woods_south: { x: 38, y: 88 },
  mess_hall: { x: 72, y: 32 },
  cabin_row_b: { x: 72, y: 60 },
  boat_house: { x: 90, y: 38 },
  old_barn: { x: 74, y: 90 },
  root_cellar: { x: 92, y: 90 },
};
