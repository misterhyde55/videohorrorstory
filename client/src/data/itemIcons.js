// Kit-tracker reference lists — the objective tracker needs to show these
// even for items the player hasn't found yet, so it keeps its own static
// copy rather than reading icons off a live inventory item. Live items
// carry their own `icon`/`effect` straight from server/src/cards.js.
export const ESCAPE_ITEMS = [
  { id: "car_keys", name: "Car Keys", icon: "🔑" },
  { id: "gas_can", name: "Gas Can", icon: "⛽" },
  { id: "tool_kit", name: "Tool Kit", icon: "🧰" },
];

export const BANISH_ITEMS = [
  { id: "ritual_candle", name: "Black Candle", icon: "🕯️" },
  { id: "occult_book", name: "Occult Book", icon: "📖" },
  { id: "cursed_tape", name: "Cursed Tape", icon: "📼" },
];
