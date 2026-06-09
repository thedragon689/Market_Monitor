import { changeTone, formatChangeBadge, formatCurrentPrice } from '../../utils/catalogPrice';

function collectQuoted(catalog) {
  if (!catalog) return [];
  const out = [];
  for (const [type, items] of Object.entries(catalog)) {
    for (const item of items || []) {
      if (item?.quote?.price != null && item.quote.changePercent != null) {
        out.push({ ...item, assetType: item.assetType || type });
      }
    }
  }
  return out;
}

export default function TerminalTopMovers({ catalog, fx, onSelect, loading }) {
  const movers = collectQuoted(catalog);
  const sorted = [...movers].sort(
    (a, b) => Number(b.quote.changePercent) - Number(a.quote.changePercent)
  );
  const gainers = sorted.filter((i) => Number(i.quote.changePercent) > 0).slice(0, 4);
  const losers = [...sorted]
    .filter((i) => Number(i.quote.changePercent) < 0)
    .slice(-4)
    .reverse();

  if (loading && !movers.length && !catalog) {
    return <div className="terminal-movers terminal-movers--loading skeleton skeleton--block" />;
  }

  const renderList = (items, title) => (
    <div className="terminal-movers__col">
      <h4 className="terminal-movers__title">{title}</h4>
      <ul className="terminal-movers__list">
        {items.length ? (
          items.map((item) => {
            const tone = changeTone(item.quote.changePercent);
            const price = formatCurrentPrice(item.quote, item, fx);
            return (
              <li key={`${item.assetType}-${item.id}`}>
                <button
                  type="button"
                  className="terminal-movers__row"
                  onClick={() => onSelect?.(item.id, item.assetType)}
                >
                  <span className="terminal-movers__main">
                    <code>{item.id}</code>
                    <span>{item.name}</span>
                  </span>
                  <span className={`terminal-movers__chg terminal-movers__chg--${tone}`}>
                    {formatChangeBadge(item.quote)} · {price.primary}
                  </span>
                </button>
              </li>
            );
          })
        ) : (
          <li className="terminal-movers__empty">—</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="terminal-movers">
      {renderList(gainers, 'Top rialzi')}
      {renderList(losers, 'Top ribassi')}
    </div>
  );
}
