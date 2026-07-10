import { useMemo, useState } from 'react';
import './watchlist.css';
import { useWatchlist } from '../../hooks/useWatchlist';
import { downloadCsv } from '../../utils/exportCsv';
import { TYPE_LABELS } from '../../data/allSymbols';
import { COLUMNS, DEFAULT_VISIBLE } from './columns.jsx';
import WatchlistTable from './WatchlistTable';
import WatchlistQuickAdd from './WatchlistQuickAdd';
import ColumnManager from './ColumnManager';
import WatchlistAssetDetail from './WatchlistAssetDetail';

const VIS_KEY = 'mm:watchlist-cols';

function loadVisible() {
  try {
    const raw = localStorage.getItem(VIS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_VISIBLE;
}

const PERF_FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'gainers', label: 'In rialzo' },
  { id: 'losers', label: 'In ribasso' },
];

/**
 * Watchlist avanzata: ricerca fuzzy, colonne configurabili, ordinamento
 * multi-colonna, filtri, sparkline inline, alert e export CSV.
 */
export default function WatchlistPanel({ onSelectAsset }) {
  const { rows, loading, add, remove, toggleAlert, has, refresh } = useWatchlist();
  const [visible, setVisible] = useState(loadVisible);
  const [sortKeys, setSortKeys] = useState([{ id: 'changePercent', dir: 'desc' }]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [perfFilter, setPerfFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  const setVisiblePersist = (next) => {
    setVisible(next);
    try {
      localStorage.setItem(VIS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleSort = (id, additive) => {
    setSortKeys((prev) => {
      const existing = prev.find((k) => k.id === id);
      const nextDir = existing && existing.dir === 'asc' ? 'desc' : 'asc';
      if (additive) {
        const others = prev.filter((k) => k.id !== id);
        return [...others, { id, dir: nextDir }];
      }
      return [{ id, dir: nextDir }];
    });
  };

  const availableTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.type))),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      const pct = Number(r.quote?.changePercent);
      if (perfFilter === 'gainers' && !(pct > 0)) return false;
      if (perfFilter === 'losers' && !(pct < 0)) return false;
      return true;
    });
  }, [rows, typeFilter, perfFilter]);

  const exportCsv = () => {
    const cols = COLUMNS.filter((c) => visible.includes(c.id) && c.id !== 'spark');
    const headers = [...cols.map((c) => c.label), 'Tipo'];
    const data = filtered.map((row) => [
      ...cols.map((c) => {
        const v = c.sortValue(row);
        return typeof v === 'number' && Number.isFinite(v) ? v : row[c.id] ?? '';
      }),
      TYPE_LABELS[row.type] || row.type,
    ]);
    downloadCsv('watchlist.csv', headers, data);
  };

  return (
    <section className="wl-panel ui-card ui-card--pad">
      <header className="wl-panel__head">
        <h2 className="wl-panel__title">Watchlist</h2>
        <div className="wl-panel__tools">
          <WatchlistQuickAdd onAdd={add} has={has} />
          <ColumnManager visible={visible} onChange={setVisiblePersist} />
          <button type="button" className="ui-btn ui-btn--outline ui-btn--sm" onClick={refresh}>
            ⟳ Aggiorna
          </button>
          <button type="button" className="ui-btn ui-btn--outline ui-btn--sm" onClick={exportCsv}>
            ⬇ CSV
          </button>
        </div>
      </header>

      <div className="wl-filters">
        <div className="wl-filter-group">
          <button
            type="button"
            className={`wl-chip ${typeFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            Tutti i mercati
          </button>
          {availableTypes.map((t) => (
            <button
              key={t}
              type="button"
              className={`wl-chip ${typeFilter === t ? 'is-active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
        <div className="wl-filter-group">
          {PERF_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`wl-chip ${perfFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setPerfFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {loading ? <span className="wl-loading">aggiornamento…</span> : null}
      </div>

      <WatchlistTable
        rows={filtered}
        visible={visible}
        sortKeys={sortKeys}
        onSort={handleSort}
        onSelect={(row) => setDetail(row)}
        onRemove={(row) => remove(row.symbol, row.type)}
        onToggleAlert={(row) => toggleAlert(row.symbol, row.type)}
      />

      <WatchlistAssetDetail
        row={detail}
        onClose={() => setDetail(null)}
        onOpenAnalysis={() => {
          const current = detail;
          setDetail(null);
          if (current) onSelectAsset?.(current.symbol, current.type);
        }}
      />
    </section>
  );
}
