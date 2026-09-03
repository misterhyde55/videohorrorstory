// Breadth-first search over the board graph: every location within `hops`
// steps of `locationId`, not just the ones exactly `hops` away. Shared by
// ActionPanel (to build the Move-to button list) and Board (to highlight
// the same destinations directly on the map) so the two can never drift.
export function reachableFrom(board, locationId, hops) {
  let frontier = new Set([locationId]);
  const seen = new Set([locationId]);
  for (let i = 0; i < hops; i++) {
    const next = new Set();
    for (const loc of frontier) {
      for (const n of board[loc].connections) {
        if (!seen.has(n)) {
          seen.add(n);
          next.add(n);
        }
      }
    }
    frontier = next;
  }
  seen.delete(locationId);
  return [...seen];
}
