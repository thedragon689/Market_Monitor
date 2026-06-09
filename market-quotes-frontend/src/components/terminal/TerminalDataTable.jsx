import { changeTone, formatChangeBadge, formatCurrentPrice } from '../../utils/catalogPrice';

function formatChg(quote) {
  const chg = quote?.change;
  if (chg == null || !Number.isFinite(Number(chg))) return '—';
  const n = Number(chg);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`;
}

export default function TerminalDataTable({
  items = [],
  loading,
  chartPicks = [],
  onToggleChart,
  onSelectRow,
  selectedSymbol,
  fx,
  maxRows = 14,
  compact = false,
}) {
  const rows = items.slice(0, maxRows);
  const pickSet = new Set(chartPicks.map((p) => p.id.toUpperCase()));
  const selectedKey = selectedSymbol?.toUpperCase();

  if (loading && !rows.length && !items.length) {
    return (
      <div className="terminal-table terminal-table--loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="terminal-table__skeleton skeleton skeleton--line" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <p className="terminal-table__empty">Nessun dato disponibile</p>;
  }

  return (
    <div className="terminal-table-wrap">
      <table className={`terminal-table ${compact ? 'terminal-table--compact' : ''}`}>
        <thead>
          <tr>
            <th className="terminal-table__chk" aria-label="Grafico" />
            <th>Ticker</th>
            <th>Nome</th>
            <th className="terminal-table__num">Prezzo</th>
            <th className="terminal-table__num">Var.</th>
            <th className="terminal-table__num">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const q = item.quote;
            const price = formatCurrentPrice(q, item, fx);
            const tone = changeTone(q?.changePercent);
            const pct = formatChangeBadge(q);
            const checked = pickSet.has(item.id.toUpperCase());
            const isSelected = selectedKey === item.id.toUpperCase();

            return (
              <tr
                key={item.id}
                className={`terminal-table__row ${checked ? 'is-charted' : ''} ${isSelected ? 'is-selected' : ''} ${!q?.price ? 'is-muted' : ''}`}
              >
                <td className="terminal-table__chk">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!q?.price}
                    aria-label={`Mostra ${item.name} nel grafico`}
                    onChange={() =>
                      onToggleChart?.({
                        id: item.id,
                        type: item.assetType || item.type,
                        name: item.name,
                      })
                    }
                  />
                </td>
                <td className="terminal-table__ticker">
                  <code>{item.id}</code>
                </td>
                <td>
                  <button
                    type="button"
                    className="terminal-table__name"
                    onClick={() => onSelectRow?.(item.id, item.assetType || item.type)}
                  >
                    {item.name}
                  </button>
                </td>
                <td className="terminal-table__num terminal-table__price">{price.primary}</td>
                <td className={`terminal-table__num terminal-table__num--${tone}`}>
                  {formatChg(q)}
                </td>
                <td className={`terminal-table__num terminal-table__num--${tone}`}>
                  {pct ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
