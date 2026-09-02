export default function Inventory({ items, capacity }) {
  const capacityLabel = capacity != null && (
    <p className="inventory-capacity">Carrying {items?.length ?? 0} / {capacity}</p>
  );
  if (!items?.length) {
    return (
      <>
        <p className="empty-inventory">Your pockets are empty.</p>
        {capacityLabel}
      </>
    );
  }
  return (
    <>
      <ul className="inventory-list">
        {items.map((it, i) => (
          <li key={it.id + i} title={it.flavor}>
            <div className="item-row">
              <span className="item-icon">{it.icon || "❔"}</span>
              <span className="item-name">{it.name}</span>
              {it.weapon && <span className="item-tag">+{it.bonus}%, {it.durability} use{it.durability === 1 ? "" : "s"} left</span>}
              {it.kit && <span className={`item-tag kit-${it.kit}`}>{it.kit}</span>}
            </div>
            {it.effect && <div className="item-effect">{it.effect}</div>}
          </li>
        ))}
      </ul>
      {capacityLabel}
    </>
  );
}
