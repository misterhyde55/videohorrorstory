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
            <span className="item-name">{it.name}</span>
            {it.weapon && <span className="item-tag">weapon +{it.bonus}</span>}
            {it.kit && <span className={`item-tag kit-${it.kit}`}>{it.kit}</span>}
          </li>
        ))}
      </ul>
      {capacityLabel}
    </>
  );
}
