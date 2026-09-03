import { useState } from "react";

const CATEGORY_CLASS = {
  Healing: "cat-healing",
  Utility: "cat-utility",
  Weapon: "cat-weapon",
  Sanity: "cat-sanity",
  Objective: "cat-objective",
};

function UsePreview({ item }) {
  if (item.utility === "heal") return <span className="use-preview">+HEALTH</span>;
  if (item.utility === "sanity") {
    return (
      <span className="use-preview">
        +{item.sanityAmount} SANITY{item.moveBonus ? ` / +${item.moveBonus} MOVE` : ""}
      </span>
    );
  }
  return null;
}

export default function Inventory({ items, capacity, onUseItem }) {
  const [pinned, setPinned] = useState(null);

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
        {items.map((it, i) => {
          const key = it.id + i;
          const catClass = CATEGORY_CLASS[it.category] || "cat-utility";
          const isPinned = pinned === key;
          const usable = it.utility === "heal" || it.utility === "sanity";
          return (
            <li
              key={key}
              className={`item-row-wrap ${catClass}${isPinned ? " pinned" : ""}`}
              tabIndex={0}
              onClick={() => setPinned((p) => (p === key ? null : key))}
            >
              <div className="item-row">
                <span className="item-icon">{it.icon || "❔"}</span>
                <span className="item-name">{it.name}</span>
                {it.category && <span className={`item-category-tag ${catClass}`}>{it.category}</span>}
                {it.weapon && <span className="item-tag">+{it.bonus}%, {it.durability} use{it.durability === 1 ? "" : "s"} left</span>}
                {it.objective && <span className="item-tag kit-objective">Objective</span>}
              </div>

              <div className="item-tooltip" role="tooltip">
                <div className="item-tooltip-name">{it.name} <span className={`item-category-tag ${catClass}`}>{it.category}</span></div>
                {it.flavor && <p className="item-tooltip-flavor">{it.flavor}</p>}
                {it.effect && <p className="item-tooltip-effect"><strong>Effect:</strong> {it.effect}</p>}
                <div className="item-tooltip-stats">
                  <span><strong>Uses:</strong> {it.uses ?? "—"}</span>
                  <span><strong>Noise:</strong> {it.noise ?? "—"}</span>
                  <span><strong>Objective Item:</strong> {it.objective ? "Yes" : "No"}</span>
                </div>
                {usable && onUseItem && (
                  <button
                    type="button"
                    className="btn btn-secondary item-tooltip-use"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUseItem(it);
                    }}
                  >
                    {it.utility === "heal" ? "Use" : "Drink"} <UsePreview item={it} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {capacityLabel}
    </>
  );
}
