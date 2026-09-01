import { ESCAPE_ITEMS, BANISH_ITEMS } from "../data/itemIcons";

function ItemRow({ title, items, owned }) {
  return (
    <div className="objective-row">
      <span className="objective-title">{title}</span>
      <div className="objective-icons">
        {items.map((it) => {
          const has = owned.has(it.id);
          return (
            <span key={it.id} className={`objective-icon${has ? " lit" : ""}`} title={it.name}>
              {it.icon}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function ObjectiveTracker({ items }) {
  const owned = new Set((items || []).map((it) => it.id));
  return (
    <div className="objective-tracker">
      <ItemRow title="Escape Items" items={ESCAPE_ITEMS} owned={owned} />
      <ItemRow title="Banish Items" items={BANISH_ITEMS} owned={owned} />
    </div>
  );
}
