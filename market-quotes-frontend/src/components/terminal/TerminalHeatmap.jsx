import { TERMINAL_HEATMAP_CELLS } from '../../data/terminalPanels';
import { changeTone } from '../../utils/catalogPrice';
import { formatPercent } from '../../utils/format';

export default function TerminalHeatmap({ catalog, fx, onSelect }) {
  const etfItems = catalog?.etf || [];
  const byId = Object.fromEntries(etfItems.map((i) => [i.id.toUpperCase(), i]));

  return (
    <div className="terminal-heatmap">
      <p className="terminal-heatmap__caption">Settori USA · variazione %</p>
      <div className="terminal-heatmap__grid">
        {TERMINAL_HEATMAP_CELLS.map((cell) => {
          const item = byId[cell.id.toUpperCase()];
          const pct = item?.quote?.changePercent;
          const tone = changeTone(pct);
          const label =
            pct != null && Number.isFinite(Number(pct)) ? formatPercent(pct) : '—';

          return (
            <button
              key={cell.id}
              type="button"
              className={`terminal-heatmap__cell terminal-heatmap__cell--${tone}`}
              title={`${cell.label} (${cell.id})`}
              disabled={!item}
              onClick={() => item && onSelect?.(cell.id, 'etf')}
            >
              <span className="terminal-heatmap__cell-label">{cell.label}</span>
              <span className="terminal-heatmap__cell-val">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
